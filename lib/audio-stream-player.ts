import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '@/utils/logger';
import { Buffer } from 'buffer';

/**
 * AudioStreamPlayer for React Native (Expo).
 * The Gemini Live API streams Float32 PCM audio data.
 * React Native doesn't have a Web Context `AudioContext` to natively play
 * an unending raw PCM pipeline.
 *
 * Solution: We receive base64 encoded Float32 PCM arrays from the backend.
 * We wrap them in a valid WAV header on the device,
 * save them to a temporary file via expo-file-system,
 * and enqueue them into an expo-av Sound player loop.
 */
export class AudioStreamPlayer {
  private queue: string[] = []; // URIs to local WAV files
  private isPlaying: boolean = false;
  private currentSound: Audio.Sound | null = null;
  private chunkIndex: number = 0;
  private sampleRate = 24000;

  constructor() {}

  /**
   * Initializes the Audio subsystem. Usually called before starting a session.
   */
  async initialize() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      logger.error('Failed to set audio mode in AudioStreamPlayer:', e);
    }
  }

  // ── PCM accumulator for smooth playback ──────────────────────────────────
  // Gemini sends very small PCM chunks (~67-133ms each). Feeding every tiny
  // chunk to expo-av produces audible gaps (startup latency per Sound object).
  // We accumulate raw PCM bytes and only flush once we have ≥ MIN_CHUNK_MS ms.
  private pendingPcmBuffers: Buffer[] = [];
  private pendingPcmBytes: number = 0;

  // 24kHz, 16-bit, mono = 48 000 bytes/sec
  private readonly SAMPLE_RATE = 24000;
  private readonly BYTES_PER_SAMPLE = 2;  // 16-bit
  private readonly CHANNELS = 1;
  private readonly BYTES_PER_SEC = 24000 * 2 * 1;  // 48 000
  // Flush after accumulating this many ms of audio.
  // Higher = fewer synchronous Buffer operations (less ANR risk), but slightly more latency.
  // 800ms is a good balance between smooth playback and responsive UI.
  private readonly MIN_CHUNK_MS = 800;
  private get MIN_CHUNK_BYTES() {
    return Math.floor((this.MIN_CHUNK_MS / 1000) * this.BYTES_PER_SEC);
  }

  /**
   * Convert raw PCM bytes to a valid WAV base64 string.
   * The Gemini Live API SSE stream sends raw L16 PCM — NOT pre-wrapped WAV.
   */
  private pcmBufferToWavBase64(pcmBuffer: Buffer): string {
    const sampleRate = this.SAMPLE_RATE;
    const numChannels = this.CHANNELS;
    const bitsPerSample = this.BYTES_PER_SAMPLE * 8;
    const byteRate = sampleRate * numChannels * this.BYTES_PER_SAMPLE;
    const blockAlign = numChannels * this.BYTES_PER_SAMPLE;
    const wavHeaderSize = 44;
    const wavBuffer = Buffer.alloc(wavHeaderSize + pcmBuffer.length);

    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
    wavBuffer.write('WAVE', 8);
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20);              // PCM format
    wavBuffer.writeUInt16LE(numChannels, 22);
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(byteRate, 28);
    wavBuffer.writeUInt16LE(blockAlign, 32);
    wavBuffer.writeUInt16LE(bitsPerSample, 34);
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
    pcmBuffer.copy(wavBuffer, wavHeaderSize);

    return wavBuffer.toString('base64');
  }

  /**
   * Write the currently accumulated PCM buffer to a temp WAV file and enqueue it.
   */
  private async _flushPendingPcm() {
    if (this.pendingPcmBuffers.length === 0) return;

    // Combine all accumulated PCM buffers into one
    const combined = Buffer.concat(this.pendingPcmBuffers, this.pendingPcmBytes);
    this.pendingPcmBuffers = [];
    this.pendingPcmBytes = 0;

    try {
      const wavBase64 = this.pcmBufferToWavBase64(combined);
      const tempUri = `${FileSystem.cacheDirectory}stream_chunk_${Date.now()}_${this.chunkIndex++}.wav`;
      await FileSystem.writeAsStringAsync(tempUri, wavBase64, { encoding: 'base64' });
      this.queue.push(tempUri);
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (e) {
      logger.error('Failed to flush audio chunk to queue:', e);
    }
  }

  /**
   * Add a raw base64 PCM chunk (from the Gemini Live API SSE stream).
   * Chunks are accumulated until we have enough audio (~400ms) before writing
   * to disk — this prevents the per-file startup gap that makes audio sound choppy.
   */
  async addCompressedChunkBase64(pcmBase64: string) {
    try {
      const pcmBuffer = Buffer.from(pcmBase64, 'base64');
      this.pendingPcmBuffers.push(pcmBuffer);
      this.pendingPcmBytes += pcmBuffer.length;

      // Flush when we have reached the minimum playable chunk size
      if (this.pendingPcmBytes >= this.MIN_CHUNK_BYTES) {
        await this._flushPendingPcm();
      }
    } catch (e) {
      logger.error('Failed to add audio chunk to queue:', e);
    }
  }

  /**
   * Call this when the SSE stream ends to flush any remaining PCM bytes.
   */
  async flush() {
    await this._flushPendingPcm();
  }

  /**
   * Add a raw PCM chunk buffer to the queue if the backend isn't sending WAV.
   * Note: The current backend actually sends base64 WAVs, so `addCompressedChunkBase64` is enough.
   */
  addChunk(pcmData: Float32Array) {
     logger.warn('addChunk (raw Float32Array) not fully implemented on React Native. Using base64 WAV chunks is preferred.');
  }

  /**
   * Plays the next chunk in the queue sequence.
   */
  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentSound = null;
      return;
    }

    this.isPlaying = true;
    const uri = this.queue.shift()!;

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      this.currentSound = sound;

      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          // Playback finished, move to next
          try {
             await sound.unloadAsync();
             // Clean up file to save storage
             await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch(e) {}
          this.playNext();
        }
      });
    } catch (error) {
      logger.error('Failed to play audio chunk:', error);
      // Skip this chunk and try the next one
      try {
         await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch(e) {}
      this.playNext();
    }
  }

  /**
   * Stop processing completely, flush the queue, and unload the current sound.
   */
  async stop() {
    this.queue = [];
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (e) {}
      this.currentSound = null;
    }
    this.isPlaying = false;
  }
}
