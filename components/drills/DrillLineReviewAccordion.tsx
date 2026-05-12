import { useState } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import tw from "@/lib/tw";
import { AppText } from "@/components/ui/AppText";
import type {
  TextScore,
  WordScore,
  PhoneScore,
  SyllableScore,
} from "@/services/speechace.service";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DrillLineReviewAccordionProps {
  step: "word" | "sentence";
  text: string;
  score: number;
  textScore: TextScore | null;
  passThreshold: number;
  attempts: number;
}

// ─── Score colour helpers ────────────────────────────────────────────────────

function scoreColor(q: number): string {
  if (q >= 80) return "#16a34a";
  if (q >= 50) return "#d97706";
  return "#dc2626";
}

function scoreBg(q: number): string {
  if (q >= 80) return "#dcfce7";
  if (q >= 50) return "#fef3c7";
  return "#fee2e2";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText style={tw`text-xs font-semibold text-gray-500 mb-2`}>
      {label}
    </AppText>
  );
}

function SyllableCard({ syl }: { syl: SyllableScore }) {
  const color = scoreColor(syl.quality_score);
  return (
    <View
      style={[
        tw`border border-gray-200 rounded-lg px-3 py-2 mr-2 mb-2 min-w-14 items-center`,
        { backgroundColor: "#f9fafb" },
      ]}
    >
      <AppText style={tw`text-sm text-gray-800 font-medium`}>
        {syl.letters}
      </AppText>
      <AppText style={[tw`text-sm font-bold`, { color }]}>
        {Math.round(syl.quality_score)}
      </AppText>
      <AppText style={tw`text-xs text-gray-400`}>
        stress: {syl.stress_level ?? 0}
      </AppText>
    </View>
  );
}

function PhonemePill({ ph }: { ph: PhoneScore }) {
  return (
    <View
      style={[
        tw`rounded-full px-2.5 py-1 mr-1.5 mb-1.5`,
        { backgroundColor: scoreBg(ph.quality_score) },
      ]}
    >
      <AppText style={[tw`text-xs font-semibold`, { color: scoreColor(ph.quality_score) }]}>
        {ph.phone} {Math.round(ph.quality_score)}
      </AppText>
    </View>
  );
}

function LetterFeedbackPill({ syl }: { syl: SyllableScore }) {
  return (
    <View
      style={[
        tw`rounded-full px-2.5 py-1 mr-1.5 mb-1.5`,
        { backgroundColor: scoreBg(syl.quality_score) },
      ]}
    >
      <AppText style={[tw`text-xs font-semibold`, { color: scoreColor(syl.quality_score) }]}>
        {syl.letters} {Math.round(syl.quality_score)}
      </AppText>
    </View>
  );
}

function WordBreakdown({ ws }: { ws: WordScore }) {
  return (
    <View style={tw`mb-5`}>
      {/* Word heading */}
      <AppText style={tw`text-base font-bold text-gray-900 mb-3`}>
        {ws.word}
      </AppText>

      {/* Syllables */}
      {ws.syllable_score_list?.length > 0 && (
        <View style={tw`mb-3`}>
          <SectionLabel label="Syllables" />
          <View style={tw`flex-row flex-wrap`}>
            {ws.syllable_score_list.map((syl, idx) => (
              <SyllableCard key={idx} syl={syl} />
            ))}
          </View>
        </View>
      )}

      {/* Phonemes */}
      {ws.phone_score_list?.length > 0 && (
        <View style={tw`mb-3`}>
          <SectionLabel label="Phonemes" />
          <View style={tw`flex-row flex-wrap`}>
            {ws.phone_score_list.map((ph, idx) => (
              <PhonemePill key={idx} ph={ph} />
            ))}
          </View>
        </View>
      )}

      {/* Letter level Feedback */}
      {ws.syllable_score_list?.length > 0 && (
        <View>
          <SectionLabel label="Letter level Feedback" />
          <View style={tw`flex-row flex-wrap`}>
            {ws.syllable_score_list.map((syl, idx) => (
              <LetterFeedbackPill key={idx} syl={syl} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Chevron icon ────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <Svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
    >
      <Path
        d="M6 9l6 6 6-6"
        stroke="#737373"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DrillLineReviewAccordion({
  step,
  text,
  score,
  textScore,
  passThreshold,
  attempts,
}: DrillLineReviewAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const passed = score >= passThreshold;
  const scorePillBg = passed ? "#dcfce7" : "#fef3c7";
  const scorePillText = passed ? "#15803d" : "#92400e";
  const stepLabel = step === "word" ? "WORD" : "SENTENCE";

  return (
    <View style={tw`bg-white border border-gray-200 rounded-2xl mb-4 overflow-hidden`}>
      {/* ── Header: step label + scored text + score pill + chevron ── */}
      <View style={tw`px-4 pt-3 pb-2`}>
        <AppText style={tw`text-xs font-semibold text-gray-500 mb-1`}>
          {stepLabel}
        </AppText>
        <AppText style={tw`text-sm text-gray-900 font-medium`}>
          {text}
        </AppText>
      </View>

      {/* ── Score row ── */}
      <View style={tw`flex-row items-center justify-between px-4 py-2.5 border-t border-gray-100`}>
        <AppText style={tw`text-sm font-semibold text-gray-800`}>
          Performance score
        </AppText>
        <View style={[tw`rounded-full px-3 py-1`, { backgroundColor: scorePillBg }]}>
          <AppText style={[tw`text-sm font-bold`, { color: scorePillText }]}>
            {Math.round(score)}%
          </AppText>
        </View>
      </View>

      {/* ── Accordion toggle row ── */}
      <TouchableOpacity
        onPress={() => setIsOpen((v) => !v)}
        activeOpacity={0.7}
        style={tw`flex-row items-center justify-between px-4 py-2.5 border-t border-gray-100`}
      >
        <AppText style={tw`text-sm font-medium text-green-600`}>
          Breakdown of the analysis
        </AppText>
        <ChevronIcon open={isOpen} />
      </TouchableOpacity>

      {/* ── Expanded body ── */}
      {isOpen && (
        <View style={tw`px-4 pt-2 pb-5 border-t border-gray-100`}>
          {!textScore ? (
            <AppText style={tw`text-sm text-gray-400 mt-2`}>
              No detailed breakdown available.
            </AppText>
          ) : (
            <>
              {(textScore.word_score_list || []).map((ws, idx) => (
                <WordBreakdown key={idx} ws={ws} />
              ))}

              {/* Transcript */}
              <View style={tw`flex-row mt-1`}>
                <AppText style={tw`text-xs text-gray-400`}>Transcript: </AppText>
                <AppText style={tw`text-xs text-green-600 font-medium`}>
                  {textScore.text || text}
                </AppText>
              </View>

              {/* Attempts */}
              <AppText style={tw`text-xs text-gray-400 mt-1`}>
                Attempts: {attempts}
              </AppText>
            </>
          )}
        </View>
      )}
    </View>
  );
}
