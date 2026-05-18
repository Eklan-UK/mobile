# Eklan Free Talk – Backend Implementation Spec

This document describes everything the backend must implement for the **Eklan Free Talk** feature to work with the mobile app.

---

## Overview

The mobile app calls two endpoints. Both stream responses over **Server-Sent Events (SSE)**. The app already has the SSE consumer wired up — the backend just needs to produce the right stream format.

---

## SSE Stream Format

Every chunk the backend emits must follow this exact format:

```
data: {"type":"text","data":"Hello, I'm..."}\n\n
data: {"type":"audio","data":"<base64-encoded WAV chunk>"}\n\n
data: {"type":"metadata","data":{...}}\n\n
```

- `type: "text"` — a piece of the AI's spoken text. The app appends these together in the chat bubble as they arrive.
- `type: "audio"` — a base64-encoded compressed audio chunk (WAV). The app plays these gaplessly via its `AudioStreamPlayer`. Send these **interleaved with text chunks** so audio starts before the full text is done.
- `type: "metadata"` — sent **once at the end** of the stream. Contains the full text and any scenario data the app needs (see field specs below).

**Headers required:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Authentication:** The app sends a `Bearer` token in the `Authorization` header on every request.

---

## Endpoint 1 — Scenario Greeting

### `GET /api/v1/ai/free-talk/greeting`

Called when the user first opens the Eklan Free Talk screen. No request body.

### What the backend must do

1. **Pick a scenario** from the Eklan Free Talk scenario bank (see scenario format below). Either pick randomly or cycle through them session-by-session.
2. **Build a system prompt** that instructs the AI to:
   - Act as an ICU nursing trainer / evaluator named Eklan.
   - Read the **Situation** text from the chosen scenario naturally and clearly, as if setting the scene for the user.
   - Not yet ask for the user's response — just present the scenario.
   - Keep tone calm, professional, and encouraging.
3. **Stream the AI response** as `text` + `audio` chunks.
4. **End with a `metadata` chunk** containing:

```json
{
  "type": "metadata",
  "data": {
    "fullText": "<the complete AI spoken text>",
    "scenarioTitle": "Sudden Oxygen Drop",
    "hint": "Calm the patient. Explain what is happening. Call for help if necessary.",
    "usefulPhrases": [
      "Stay calm.",
      "Your oxygen level is dropping.",
      "Take slow, deep breaths.",
      "I'm calling the respiratory therapist."
    ]
  }
}
```

The `hint` and `usefulPhrases` values power the **hint modal** the app shows after the AI finishes speaking. They must be included — if they are missing, the modal will not appear.

### Example AI opening (what it should say)

> "Good morning. I'm going to present a clinical scenario for you to practise. Mr. Miller's oxygen saturation has suddenly dropped from 96% to 82%. He looks frightened and is beginning to breathe rapidly. He has just grabbed at his oxygen mask. How would you respond?"

---

## Endpoint 2 — User Message

### `POST /api/v1/ai/free-talk`

Called every time the user sends a voice or text response during the scenario.

### Request body

```json
{
  "userMessage": "Mr. Miller, stay calm. Your oxygen level is dropping but I'm here to help you.",
  "activeScenarioTitle": "Sudden Oxygen Drop",
  "conversationHistory": [
    { "role": "model", "content": "<AI's previous message text>" },
    { "role": "user", "content": "<user's previous message>" }
  ]
}
```

- `userMessage` is what the user just said (transcribed from voice or typed).
- `activeScenarioTitle` is the title of the scenario that was started in the greeting. The app always sends this so the backend can anchor the system prompt to the correct scenario without having to parse the conversation history.
- `conversationHistory` is the full turn-by-turn history **excluding the current message**. The app sends it so the AI remembers the whole conversation.

### Golden rule — never pick a new scenario mid-conversation

> **If `activeScenarioTitle` is set OR `conversationHistory` is non-empty, the backend MUST NOT call the scenario-picker. A new scenario must never be introduced until the current one has been marked complete and the user has explicitly agreed to continue.**

This is the most common source of the "drops a new situation on every reply" bug. The scenario-picker logic must only run inside the greeting handler (`GET /api/v1/ai/free-talk/greeting`) and in the specific branch that starts a new scenario after `scenarioComplete: true`.

### What the backend must do

1. Look up the current scenario by `activeScenarioTitle` in the scenario bank to get the full `situation` text. Use this — not a random pick — when building the system prompt.
2. **Evaluate** the user's response in context of that scenario.
3. **Respond as Eklan** — give natural conversational feedback and continue the role-play. Examples:
   - Acknowledge what the user did well.
   - Correct any missing steps gently.
   - Continue the scenario if there's more to play out (e.g. patient escalates, new information arrives).
4. **Stream the AI reply** as `text` + `audio` chunks.
5. **End with a `metadata` chunk**:

```json
{
  "type": "metadata",
  "data": {
    "fullText": "<the complete AI reply text>",
    "scenarioComplete": false
  }
}
```

### Minimum exchanges before completing a scenario

Do **not** set `scenarioComplete: true` until the user has replied **at least 3 times** within the current scenario. A single correct reply does not mean the scenario is over — Eklan should push back, add a complication, or ask a follow-up to deepen the practice before wrapping up.

### When a scenario is complete

When the AI determines the scenario has been fully played out (all key responses handled, minimum 3 user turns), set `scenarioComplete: true` in the metadata. You may optionally include `scenarioTitle`, `hint`, and `usefulPhrases` for the **next** scenario — the app will pre-load them silently — but the hint modal will **not** be shown at this point:

```json
{
  "type": "metadata",
  "data": {
    "fullText": "<brief celebration + automatic transition to next scenario>",
    "scenarioComplete": true,
    "scenarioTitle": "Airway Obstruction",
    "hint": "Explain the problem. Encourage coughing. Prepare suction equipment.",
    "usefulPhrases": [
      "There may be an airway obstruction.",
      "Keep coughing slowly.",
      "We need to suction your airway.",
      "You're doing well."
    ]
  }
}
```

**IMPORTANT — never ask the user if they want to stop.** The AI must always move straight to the next scenario. The session continues until the user taps the Leave button in the app — that is their decision, not Eklan's. The AI's spoken text at this point should be a brief celebration followed by an automatic transition, for example:

> "Well done — you handled that situation perfectly. Let's keep going with another scenario."

After all 10 scenarios have been used, cycle back to scenario 1 (or pick randomly) so the session can continue indefinitely.

### Starting the next scenario (automatic — no user confirmation needed)

After `scenarioComplete: true`, the backend immediately streams the next scenario's situation text (using the **greeting prompt template**) as the next response. The metadata for this response **must** include `scenarioTitle`, `hint`, and `usefulPhrases` — with **no** `scenarioComplete` flag. This is the signal the app uses to show the hint modal at the correct moment (while the AI is reading the new scenario aloud):

```json
{
  "type": "metadata",
  "data": {
    "fullText": "<new scenario situation text Eklan just read>",
    "scenarioTitle": "Airway Obstruction",
    "hint": "Explain the problem. Encourage coughing. Prepare suction equipment.",
    "usefulPhrases": [
      "There may be an airway obstruction.",
      "Keep coughing slowly.",
      "We need to suction your airway.",
      "You're doing well."
    ]
  }
}
```

This is the same metadata shape as the original greeting endpoint — reuse the same metadata-building code.

---

## Scenario Bank

The backend must store (or load at startup) the scenarios from `eklan-free-talk.md`. Each scenario has this structure:

```ts
interface Scenario {
  title: string;       // e.g. "Sudden Oxygen Drop"
  situation: string;   // What the AI reads aloud
  hint: string;        // "Your Response" guidance shown in the hint modal
  usefulPhrases: string[];
}
```

**All 10 scenarios** from `eklan-free-talk.md`:

| # | Title | Situation summary |
|---|---|---|
| 1 | Sudden Oxygen Drop | SpO2 drops 96→82%, patient frightened, breathing rapidly |
| 2 | Airway Obstruction | Patient coughing heavily, mucus suspected |
| 3 | Patient Panic During Ventilator Removal | Patient anxious post-extubation, "I can't breathe!" |
| 4 | Alcohol Withdrawal Symptoms | Patient irritable, demands alcohol, refuses treatment |
| 5 | Emergency Team Communication | Condition worsening rapidly, must brief ICU team |
| 6 | Medication Questions | Patient worried about side effects |
| 7 | CRRT Dialysis Concern | Mrs. Thompson nervous about CRRT machine |
| 8 | Family Member Anxiety | Daughter worried after emergency |
| 9 | Refusing Breathing Exercises | Patient too tired to continue |
| 10 | Overnight Monitoring | Patient asks why staff keep checking overnight |

---

## System Prompt Guidelines

The AI must be instructed to:

- **Role:** Act as Eklan, an ICU English practice tutor. Speak as if role-playing with the user in a real clinical setting.
- **Tone:** Calm, professional, encouraging. Not robotic.
- **On greeting:** Read the Situation text naturally as a scenario setup. End with an implicit or explicit prompt for the user to respond.
- **On user reply:** Evaluate fluency, appropriateness, and clinical correctness of the English response. Give constructive feedback. Continue the scene if appropriate.
- **Language:** Always respond in English only, regardless of what language the user writes in.
- **Speed:** Keep responses concise — this is a fast-paced conversation. Avoid long monologues.
- **Scenario end:** Only after the user has replied at least 3 times, wrap up warmly and ask the user to continue or stop.

### IMPORTANT — use two separate system prompt templates

The greeting endpoint and the message endpoint have different jobs. Using the same prompt template for both is the root cause of the "new scenario on every reply" bug.

#### Greeting prompt (used ONLY on `GET /api/v1/ai/free-talk/greeting`)

```
You are Eklan, an ICU English language practice tutor. You present realistic clinical scenarios
to help nurses practise communicating clearly in emergency situations.

You are about to introduce a new scenario. Read the situation below naturally and clearly,
as if setting the scene for the learner. Invite them to respond — but do not give them the answer.

Scenario: {scenarioTitle}
Situation: {situationText}

Keep your opening brief (3–5 sentences). End with a gentle prompt for the user to respond.
Respond in English only.
```

#### Continuation prompt (used on EVERY `POST /api/v1/ai/free-talk` call)

```
You are Eklan, an ICU English language practice tutor.
You are currently in the middle of the scenario: "{activeScenarioTitle}".
Situation context: {situationText}

DO NOT introduce a new scenario. DO NOT re-read the full situation text.
The conversation history below shows what has already been said.

INTERNAL REASONING (do NOT print these labels in your reply):
1. Evaluate what the user just said — note what was clinically appropriate and what was missing or incorrect.
2. Decide how the patient or scene would react next.
3. Decide what to ask the user to do next.

OUTPUT RULES — your reply must:
- Sound like a real clinical conversation, not a structured report.
- Start with brief feedback on what the user said (e.g. "Good — calming the patient is the right first step, but you also need to…").
- If their answer was wrong or incomplete, correct it gently and ask again in simpler terms.
- If their answer was correct, confirm it clearly and advance the scene.
- End with a natural question or prompt for the user to respond to.
- NEVER print "Step 1", "Step 2", "Step 3", "EVALUATE", "ADVANCE", or any structural label.
- Keep the whole reply to 2–4 natural sentences.

Do not wrap up the scenario until the user has replied at least 3 times in total.
After 3+ turns with all key steps covered, congratulate the user briefly and move
immediately to the next scenario — do NOT ask if they want to stop.

NEVER ask the user if they want to stop or end the session. Always move to the next
scenario after completing one. After 10 scenarios, cycle back to the beginning.

Respond in English only — even if the user writes in another language.
```

---

## Audio Requirements

- Audio chunks must be **base64-encoded compressed WAV** (same format used by the existing `topic-practice` and `drill-practice` endpoints).
- Chunks should be sent every **~400ms** of audio (matching the `AudioStreamPlayer` buffer size the app already uses).
- The app's `AudioStreamPlayer` calls `flush()` after the stream ends to play any remaining buffered audio — make sure all audio chunks are sent before closing the stream.

---

## Error Handling

If the AI call fails or any error occurs:

- Return HTTP `500` with JSON: `{ "success": false, "message": "..." }`
- Do **not** send a partial SSE stream followed by an HTTP error — pick one. The app handles a failed stream by showing a fallback message.

---

## Summary of what the app expects

| Moment | App action | Backend must provide |
|---|---|---|
| Screen opens | Calls `GET /api/v1/ai/free-talk/greeting` | SSE stream: situation text + audio + metadata with `scenarioTitle`, `hint`, `usefulPhrases` |
| User responds | Calls `POST /api/v1/ai/free-talk` with `userMessage` + `activeScenarioTitle` + history | SSE stream: evaluation + continuation text + audio + metadata with `scenarioComplete: false` — **use continuation prompt, never pick a new scenario** |
| Scenario ends (after ≥3 user turns) | Same POST call, AI decides it's done | metadata with `scenarioComplete: true` + next scenario's `hint` and `usefulPhrases` (app pre-loads silently, **no modal yet**); AI text celebrates briefly and transitions — **never asks to stop** |
| Next scenario starts automatically | Immediately after `scenarioComplete`, backend streams next scenario situation | metadata **must** include `scenarioTitle` + `hint` + `usefulPhrases` (no `scenarioComplete`) — **this triggers the hint modal** |
| Session ends | User taps Leave button in app — no backend call needed | N/A — the session never ends from the AI side |
