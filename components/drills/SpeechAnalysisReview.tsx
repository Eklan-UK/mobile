import { useState, useMemo } from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import tw from "@/lib/tw";
import { AppText } from "../ui/AppText";
import DrillLineReviewAccordion from "@/components/drills/DrillLineReviewAccordion";
import type {
  TextScore,
  WordScore,
  PhoneScore,
  SyllableScore,
} from "@/services/speechace.service";

// ─── Types ───────────────────────────────────────────────────────

export interface AnalysisResult {
  text: string;
  score: number;
  textScore: TextScore | null;
  itemIndex?: number;
  step?: "word" | "sentence";
}

interface SpeechAnalysisReviewProps {
  analysisResults: AnalysisResult[];
  drillType: "vocabulary" | "roleplay" | "pronunciation";
  onDone: () => void;
  onPracticeAgain: () => void;
  // vocabulary / pronunciation only
  totalItems?: number;
  passedItems?: number;
  itemTitles?: string[];
}

// ─── Shared icons ────────────────────────────────────────────────

function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <Svg
      width={20}
      height={20}
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

// ─── Overall Score Donut ─────────────────────────────────────────

function OverallScoreDonut({
  score,
  size = 180,
  strokeWidth = 16,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const gapAngle = 60;
  const visibleArc = 360 - gapAngle;
  const visibleCircumference = (visibleArc / 360) * circumference;
  const gapDashOffset = circumference - visibleCircumference;
  const progress = Math.min(score / 100, 1);
  const rotateAngle = 90 + gapAngle / 2;

  return (
    <View style={tw`items-center justify-center`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${visibleCircumference} ${gapDashOffset}`}
          strokeLinecap="round"
          transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#3B883E"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${progress * visibleCircumference} ${circumference - progress * visibleCircumference}`}
          strokeLinecap="round"
          transform={`rotate(${rotateAngle} ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={tw`absolute items-center justify-center`}>
        <AppText style={tw`text-5xl font-bold text-neutral-900`}>
          {Math.round(score)}
        </AppText>
        <AppText style={tw`text-sm text-neutral-500 mt-1`}>
          Overall Score
        </AppText>
      </View>
    </View>
  );
}

// ─── Mini Score Ring (roleplay cards) ────────────────────────────

function MiniScoreRing({
  score,
  size = 44,
  strokeWidth = 4,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(score / 100, 1);
  const strokeDashoffset = circumference - progress * circumference;
  const color = score >= 70 ? "#3B883E" : score >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <View style={tw`items-center justify-center`}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e5e5" strokeWidth={strokeWidth} fill="transparent" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={tw`absolute`}>
        <AppText style={[tw`text-xs font-bold`, { color }]}>{Math.round(score)}%</AppText>
      </View>
    </View>
  );
}

// ─── Score Category Card (roleplay) ──────────────────────────────

function ScoreCategoryCard({ icon, label, subtitle, score }: { icon: string; label: string; subtitle: string; score: number }) {
  return (
    <View style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3.5 mb-3 border border-gray-100`}>
      <AppText style={tw`text-2xl mr-3`}>{icon}</AppText>
      <View style={tw`flex-1`}>
        <AppText style={tw`text-base font-semibold text-neutral-900`}>{label}</AppText>
        <AppText style={tw`text-xs text-green-600 mt-0.5`}>{subtitle}</AppText>
      </View>
      <MiniScoreRing score={score} />
    </View>
  );
}

// ─── Collapsible Section (roleplay) ──────────────────────────────

function CollapsibleSection({ title, subtitle, initiallyOpen = false, children }: { title: string; subtitle?: string; initiallyOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={tw`bg-white rounded-2xl border border-gray-100 mb-4`}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={tw`flex-row items-center justify-between px-4 py-3.5`} activeOpacity={0.7}>
        <View style={tw`flex-1`}>
          <AppText style={tw`text-base font-bold text-neutral-900`}>{title}</AppText>
          {subtitle && <AppText style={tw`text-xs text-neutral-500 mt-0.5`}>{subtitle}</AppText>}
        </View>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <Path d="M6 9l6 6 6-6" stroke="#737373" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </TouchableOpacity>
      {open && <View style={tw`px-4 pb-4`}>{children}</View>}
    </View>
  );
}

// ─── Score Pill (roleplay) ────────────────────────────────────────

function ScorePill({ label, score }: { label: string; score: number }) {
  const bg = score >= 80 ? "bg-green-100" : score >= 50 ? "bg-yellow-100" : "bg-red-100";
  const text = score >= 80 ? "text-green-700" : score >= 50 ? "text-yellow-700" : "text-red-700";
  return (
    <View style={tw`${bg} rounded-lg px-2.5 py-1.5 mr-2 mb-2`}>
      <AppText style={tw`${text} text-xs font-semibold`}>{label} {Math.round(score)}</AppText>
    </View>
  );
}

// ─── Helpers (roleplay) ──────────────────────────────────────────

function getAverageScore(results: AnalysisResult[]): number {
  if (results.length === 0) return 0;
  return Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length);
}

function getAllPhonemes(results: AnalysisResult[]): PhoneScore[] {
  const phonemes: PhoneScore[] = [];
  for (const r of results) {
    if (!r.textScore) continue;
    for (const ws of r.textScore.word_score_list || []) {
      for (const ps of ws.phone_score_list || []) phonemes.push(ps);
    }
  }
  return phonemes;
}

function getAllSyllables(results: AnalysisResult[]): SyllableScore[] {
  const syllables: SyllableScore[] = [];
  for (const r of results) {
    if (!r.textScore) continue;
    for (const ws of r.textScore.word_score_list || []) {
      for (const syl of ws.syllable_score_list || []) syllables.push(syl);
    }
  }
  return syllables;
}

function getAllWordScores(results: AnalysisResult[]): WordScore[] {
  const words: WordScore[] = [];
  for (const r of results) {
    if (!r.textScore) continue;
    for (const ws of r.textScore.word_score_list || []) words.push(ws);
  }
  return words;
}

function deriveHighlights(phonemes: PhoneScore[]) {
  const grouped: Record<string, { total: number; count: number }> = {};
  for (const p of phonemes) {
    const key = p.phone.toLowerCase();
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
    grouped[key].total += p.quality_score;
    grouped[key].count += 1;
  }
  const avgScores = Object.entries(grouped).map(([phone, data]) => ({ phone, avg: data.total / data.count }));
  const strengths: string[] = [];
  const focus: string[] = [];
  for (const item of [...avgScores].sort((a, b) => b.avg - a.avg)) {
    if (item.avg >= 80 && strengths.length < 2) strengths.push(`Clear '${item.phone}' pronunciation`);
  }
  for (const item of [...avgScores].sort((a, b) => a.avg - b.avg)) {
    if (item.avg < 60 && focus.length < 2) focus.push(`Practice '${item.phone}' sound`);
  }
  if (strengths.length === 0) strengths.push("Good effort overall");
  if (focus.length === 0) focus.push("Keep practicing for consistency");
  return { strengths, focus };
}

// ─── Review Performance UI (vocabulary / pronunciation) ──────────

const PASS_THRESHOLD = 65;

interface ReviewGroup {
  sceneIndex: number;
  sceneTitle: string;
  rows: AnalysisResult[];
}

function ReviewPerformanceUI({
  analysisResults,
  totalItems,
  passedItems,
  itemTitles,
  onDone,
  onPracticeAgain,
}: {
  analysisResults: AnalysisResult[];
  totalItems: number;
  passedItems: number;
  itemTitles: string[];
  onDone: () => void;
  onPracticeAgain: () => void;
}) {
  const [expandedGroupIndex, setExpandedGroupIndex] = useState<number | null>(null);

  const avgScore = useMemo(() => getAverageScore(analysisResults), [analysisResults]);

  const groups = useMemo<ReviewGroup[]>(() => {
    const map = new Map<number, AnalysisResult[]>();
    for (const r of analysisResults) {
      const idx = r.itemIndex ?? 0;
      if (!map.has(idx)) map.set(idx, []);
      map.get(idx)!.push(r);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([idx, rows]) => {
        const title = itemTitles?.[idx]
          ? `Item ${idx + 1}: ${itemTitles[idx]}`
          : `Item ${idx + 1}`;
        return { sceneIndex: idx, sceneTitle: title, rows };
      });
  }, [analysisResults, itemTitles]);

  const statsLine = `${passedItems} of ${totalItems} items passed · ${analysisResults.length} scored attempts`;

  const toggleGroup = (idx: number) => {
    setExpandedGroupIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-5 pt-3 pb-2 flex-row items-center justify-between border-b border-gray-100`}>
        <AppText style={tw`text-xl font-bold text-neutral-900`}>
          Review Performance
        </AppText>
        <TouchableOpacity onPress={onDone} hitSlop={8}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pb-8 pt-5`}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall score donut */}
        <View style={tw`items-center mb-2`}>
          <OverallScoreDonut score={avgScore} />
        </View>

        {/* Stats line */}
        <AppText style={tw`text-center text-sm text-gray-400 mb-6`}>
          {statsLine}
        </AppText>

        {/* Section heading */}
        <AppText style={tw`text-base font-bold text-neutral-900 text-center mb-4`}>
          Item-by-Item Analysis
        </AppText>

        {/* Item accordion list */}
        {groups.length === 0 ? (
          <AppText style={tw`text-sm text-gray-400 text-center`}>
            No scored attempts recorded.
          </AppText>
        ) : (
          groups.map((group, gIdx) => {
            const isOpen = expandedGroupIndex === gIdx;
            return (
              <View
                key={group.sceneIndex}
                style={tw`border border-gray-200 rounded-2xl mb-3 overflow-hidden`}
              >
                {/* Group header row */}
                <TouchableOpacity
                  onPress={() => toggleGroup(gIdx)}
                  activeOpacity={0.7}
                  style={tw`flex-row items-center justify-between px-4 py-3.5`}
                >
                  <AppText style={tw`flex-1 text-sm font-semibold text-gray-800`}>
                    {group.sceneTitle}
                  </AppText>
                  <ChevronIcon open={isOpen} />
                </TouchableOpacity>

                {/* Expanded group body */}
                {isOpen && (
                  <View style={tw`px-4 pb-4 border-t border-gray-100`}>
                    <AppText style={tw`text-xs text-gray-500 mt-3 mb-3`}>
                      Here is a Breakdown of your performance
                    </AppText>

                    {group.rows.map((row, rIdx) => {
                      // Count attempts for this item+step
                      const attemptsCount = analysisResults.filter(
                        (r) => r.itemIndex === row.itemIndex && r.step === row.step
                      ).length;

                      return (
                        <DrillLineReviewAccordion
                          key={`${group.sceneIndex}-${row.step}-${rIdx}`}
                          step={row.step ?? "word"}
                          text={row.text}
                          score={row.score}
                          textScore={row.textScore}
                          passThreshold={PASS_THRESHOLD}
                          attempts={attemptsCount}
                        />
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={tw`px-5 pb-4 border-t border-gray-100 pt-3`}>
        <TouchableOpacity
          onPress={onDone}
          style={tw`w-full bg-primary-500 rounded-full py-4 items-center mb-3`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-white text-base font-semibold`}>
            Done for today
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onPracticeAgain}
          style={tw`w-full border-2 border-primary-500 rounded-full py-4 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-primary-500 text-base font-semibold`}>
            Practice again
          </AppText>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ─── Back arrow icon for roleplay review ─────────────────────────

function BackArrowIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="#171717"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Roleplay UI ─────────────────────────────────────────────────

function RoleplayReviewUI({
  analysisResults,
  onDone,
  onPracticeAgain,
}: {
  analysisResults: AnalysisResult[];
  onDone: () => void;
  onPracticeAgain: () => void;
}) {
  const avgScore = useMemo(() => getAverageScore(analysisResults), [analysisResults]);
  const allPhonemes = useMemo(() => getAllPhonemes(analysisResults), [analysisResults]);
  const allSyllables = useMemo(() => getAllSyllables(analysisResults), [analysisResults]);
  const allWords = useMemo(() => getAllWordScores(analysisResults), [analysisResults]);
  const highlights = useMemo(() => deriveHighlights(allPhonemes), [allPhonemes]);

  const wordAccuracy = useMemo(() => {
    if (allWords.length === 0) return avgScore;
    return Math.round(allWords.reduce((a, w) => a + w.quality_score, 0) / allWords.length);
  }, [allWords, avgScore]);

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header: back arrow + "Review Performance" title (Figma 186588) */}
      <View style={tw`px-5 pt-3 flex-row items-center`}>
        <TouchableOpacity onPress={onDone} hitSlop={12} style={tw`mr-3`}>
          <BackArrowIcon />
        </TouchableOpacity>
        <AppText style={tw`text-xl font-bold text-neutral-900 flex-1`}>Review Performance</AppText>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-5 pb-8 pt-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`items-center mb-6`}>
          {/* Reuse donut but labelled Clarity Score for roleplay */}
          <OverallScoreDonut score={avgScore} />
        </View>

        {[
          { icon: "🗣️", label: "Word Accuracy", subtitle: "Keep it up!", score: wordAccuracy },
          { icon: "📝", label: "Sentence Clarity", subtitle: "Great progress", score: avgScore },
          { icon: "💬", label: "Role-Play Score", subtitle: "Well done!", score: avgScore },
        ].map((card, idx) => (
          <ScoreCategoryCard key={idx} icon={card.icon} label={card.label} subtitle={card.subtitle} score={card.score} />
        ))}

        <CollapsibleSection title="Scene-by-Scene Analysis" subtitle="Feedback based on your recorded lines" initiallyOpen={true}>
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center mb-2`}>
              <View style={tw`w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-2`}>
                <AppText style={tw`text-xs`}>✓</AppText>
              </View>
              <AppText style={tw`text-sm font-bold text-neutral-900`}>Strengths</AppText>
            </View>
            {highlights.strengths.map((s, i) => (
              <View key={i} style={tw`flex-row items-start ml-7 mb-1`}>
                <AppText style={tw`text-neutral-400 mr-2`}>•</AppText>
                <AppText style={tw`text-sm text-neutral-600 flex-1`}>{s}</AppText>
              </View>
            ))}
          </View>
          <View>
            <View style={tw`flex-row items-center mb-2`}>
              <View style={tw`w-5 h-5 rounded-full bg-yellow-100 items-center justify-center mr-2`}>
                <AppText style={tw`text-xs`}>◎</AppText>
              </View>
              <AppText style={tw`text-sm font-bold text-neutral-900`}>Focus for Tomorrow</AppText>
            </View>
            {highlights.focus.map((f, i) => (
              <View key={i} style={tw`flex-row items-start ml-7 mb-1`}>
                <AppText style={tw`text-neutral-400 mr-2`}>•</AppText>
                <AppText style={tw`text-sm text-neutral-600 flex-1`}>{f}</AppText>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        <CollapsibleSection title="Detailed breakdown" subtitle="Here is a breakdown of your performance" initiallyOpen={false}>
          {allSyllables.length > 0 && (
            <View style={tw`mb-4`}>
              <AppText style={tw`text-xs font-semibold text-neutral-500 mb-2`}>Syllables</AppText>
              <View style={tw`flex-row flex-wrap`}>
                {allSyllables.map((syl, idx) => (
                  <View key={idx} style={tw`mr-4 mb-3 min-w-16`}>
                    <AppText style={tw`text-sm text-neutral-900`}>{syl.letters}</AppText>
                    <View style={tw`flex-row items-center gap-1`}>
                      <AppText style={[tw`text-xs font-bold`, { color: syl.quality_score >= 80 ? "#16a34a" : syl.quality_score >= 50 ? "#d97706" : "#dc2626" }]}>
                        {Math.round(syl.quality_score)}
                      </AppText>
                      <AppText style={tw`text-xs text-neutral-400`}>stress: {syl.stress_level ?? 0}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
          {allPhonemes.length > 0 && (
            <View style={tw`mb-4`}>
              <AppText style={tw`text-xs font-semibold text-neutral-500 mb-2`}>Phonemes</AppText>
              <View style={tw`flex-row flex-wrap`}>
                {allPhonemes.map((ph, idx) => <ScorePill key={idx} label={ph.phone} score={ph.quality_score} />)}
              </View>
            </View>
          )}
          {allWords.length > 0 && (
            <View>
              <AppText style={tw`text-xs font-semibold text-neutral-500 mb-2`}>Letter level Feedback</AppText>
              {allWords.map((ws, wIdx) => (
                <View key={wIdx} style={tw`mb-3`}>
                  <AppText style={tw`text-sm font-semibold text-neutral-700 mb-1`}>{ws.word}</AppText>
                  <View style={tw`flex-row flex-wrap`}>
                    {ws.phone_score_list?.map((ph, pIdx) => <ScorePill key={pIdx} label={ph.phone} score={ph.quality_score} />)}
                  </View>
                </View>
              ))}
            </View>
          )}
        </CollapsibleSection>
      </ScrollView>

      <View style={tw`px-5 pb-4 pt-2`}>
        <TouchableOpacity onPress={onDone} style={tw`w-full bg-primary-500 rounded-full py-4 items-center mb-3`} activeOpacity={0.8}>
          <AppText style={tw`text-white text-base font-semibold`}>Done for today</AppText>
        </TouchableOpacity>
        <TouchableOpacity onPress={onPracticeAgain} style={tw`w-full border-2 border-primary-500 rounded-full py-4 items-center`} activeOpacity={0.8}>
          <AppText style={tw`text-primary-500 text-base font-semibold`}>Practice again</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Main export ─────────────────────────────────────────────────

export default function SpeechAnalysisReview({
  analysisResults,
  drillType,
  onDone,
  onPracticeAgain,
  totalItems = 0,
  passedItems = 0,
  itemTitles = [],
}: SpeechAnalysisReviewProps) {
  if (drillType === "vocabulary" || drillType === "pronunciation") {
    return (
      <ReviewPerformanceUI
        analysisResults={analysisResults}
        totalItems={totalItems}
        passedItems={passedItems}
        itemTitles={itemTitles}
        onDone={onDone}
        onPracticeAgain={onPracticeAgain}
      />
    );
  }

  return (
    <RoleplayReviewUI
      analysisResults={analysisResults}
      onDone={onDone}
      onPracticeAgain={onPracticeAgain}
    />
  );
}
