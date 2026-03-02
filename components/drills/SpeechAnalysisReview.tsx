import { useState, useMemo } from "react";
import {
  ScrollView,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { Button } from "@/components/ui";
import tw from "@/lib/tw";
import { useAuth } from "@/hooks/useAuth";
import { AppText } from "../ui/AppText";
import { DetailedFeedbackLocked } from "@/components/gating/DetailedFeedbackLocked";
import { FluencyReviewGate } from "@/components/gating/FluencyReviewGate";
import { router } from "expo-router";
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
}

interface SpeechAnalysisReviewProps {
  analysisResults: AnalysisResult[];
  drillType: "vocabulary" | "roleplay";
  onDone: () => void;
  onPracticeAgain: () => void;
}

// ─── Close Icon ──────────────────────────────────────────────────

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

// ─── Clarity Score Ring ──────────────────────────────────────────

function ClarityRing({
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
        {/* Track */}
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
        {/* Progress */}
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
          Clarity Score
        </AppText>
      </View>
    </View>
  );
}

// ─── Mini Score Ring (used in category cards) ────────────────────

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
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e5e5"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={tw`absolute`}>
        <AppText style={[tw`text-xs font-bold`, { color }]}>
          {Math.round(score)}%
        </AppText>
      </View>
    </View>
  );
}

// ─── Score Category Card ─────────────────────────────────────────

function ScoreCategoryCard({
  icon,
  label,
  subtitle,
  score,
}: {
  icon: string;
  label: string;
  subtitle: string;
  score: number;
}) {
  return (
    <View
      style={tw`flex-row items-center bg-white rounded-2xl px-4 py-3.5 mb-3 border border-gray-100`}
    >
      <AppText style={tw`text-2xl mr-3`}>{icon}</AppText>
      <View style={tw`flex-1`}>
        <AppText style={tw`text-base font-semibold text-neutral-900`}>
          {label}
        </AppText>
        <AppText style={tw`text-xs text-green-600 mt-0.5`}>{subtitle}</AppText>
      </View>
      <MiniScoreRing score={score} />
    </View>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────

function CollapsibleSection({
  title,
  subtitle,
  initiallyOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  initiallyOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={tw`bg-white rounded-2xl border border-gray-100 mb-4`}>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={tw`flex-row items-center justify-between px-4 py-3.5`}
        activeOpacity={0.7}
      >
        <View style={tw`flex-1`}>
          <AppText style={tw`text-base font-bold text-neutral-900`}>
            {title}
          </AppText>
          {subtitle && (
            <AppText style={tw`text-xs text-neutral-500 mt-0.5`}>
              {subtitle}
            </AppText>
          )}
        </View>
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
      </TouchableOpacity>
      {open && <View style={tw`px-4 pb-4`}>{children}</View>}
    </View>
  );
}

// ─── Score Pill ──────────────────────────────────────────────────

function ScorePill({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const bg =
    score >= 80
      ? "bg-green-100"
      : score >= 50
      ? "bg-yellow-100"
      : "bg-red-100";
  const text =
    score >= 80
      ? "text-green-700"
      : score >= 50
      ? "text-yellow-700"
      : "text-red-700";

  return (
    <View style={tw`${bg} rounded-lg px-2.5 py-1.5 mr-2 mb-2`}>
      <AppText style={tw`${text} text-xs font-semibold`}>
        {label} {Math.round(score)}
      </AppText>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function getAverageScore(results: AnalysisResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.score, 0);
  return Math.round(sum / results.length);
}

function getAllPhonemes(results: AnalysisResult[]): PhoneScore[] {
  const phonemes: PhoneScore[] = [];
  for (const r of results) {
    if (!r.textScore) continue;
    for (const ws of r.textScore.word_score_list || []) {
      for (const ps of ws.phone_score_list || []) {
        phonemes.push(ps);
      }
    }
  }
  return phonemes;
}

function getAllSyllables(results: AnalysisResult[]): SyllableScore[] {
  const syllables: SyllableScore[] = [];
  for (const r of results) {
    if (!r.textScore) continue;
    for (const ws of r.textScore.word_score_list || []) {
      for (const syl of ws.syllable_score_list || []) {
        syllables.push(syl);
      }
    }
  }
  return syllables;
}

function getAllWordScores(results: AnalysisResult[]): WordScore[] {
  const words: WordScore[] = [];
  for (const r of results) {
    if (!r.textScore) continue;
    for (const ws of r.textScore.word_score_list || []) {
      words.push(ws);
    }
  }
  return words;
}

function deriveHighlights(phonemes: PhoneScore[]) {
  // Group phonemes by their phone and compute average score
  const grouped: Record<string, { total: number; count: number }> = {};
  for (const p of phonemes) {
    const key = p.phone.toLowerCase();
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
    grouped[key].total += p.quality_score;
    grouped[key].count += 1;
  }

  const avgScores = Object.entries(grouped).map(([phone, data]) => ({
    phone,
    avg: data.total / data.count,
  }));

  const strengths: string[] = [];
  const focus: string[] = [];

  // Sort by score descending for strengths
  const sorted = [...avgScores].sort((a, b) => b.avg - a.avg);
  for (const item of sorted) {
    if (item.avg >= 80 && strengths.length < 2) {
      strengths.push(`Clear '${item.phone}' pronunciation`);
    }
  }

  // Sort ascending for focus areas
  const sortedAsc = [...avgScores].sort((a, b) => a.avg - b.avg);
  for (const item of sortedAsc) {
    if (item.avg < 60 && focus.length < 2) {
      focus.push(`Practice '${item.phone}' sound`);
    }
  }

  // Fallbacks
  if (strengths.length === 0) strengths.push("Good effort overall");
  if (focus.length === 0) focus.push("Keep practicing for consistency");

  return { strengths, focus };
}

// ─── Main Component ──────────────────────────────────────────────

export default function SpeechAnalysisReview({
  analysisResults,
  drillType,
  onDone,
  onPracticeAgain,
}: SpeechAnalysisReviewProps) {
  const avgScore = useMemo(() => getAverageScore(analysisResults), [analysisResults]);
  const allPhonemes = useMemo(() => getAllPhonemes(analysisResults), [analysisResults]);
  const allSyllables = useMemo(() => getAllSyllables(analysisResults), [analysisResults]);
  const allWords = useMemo(() => getAllWordScores(analysisResults), [analysisResults]);
  const highlights = useMemo(() => deriveHighlights(allPhonemes), [allPhonemes]);

  // Compute category scores
  const wordAccuracy = useMemo(() => {
    if (allWords.length === 0) return avgScore;
    const sum = allWords.reduce((a, w) => a + w.quality_score, 0);
    return Math.round(sum / allWords.length);
  }, [allWords, avgScore]);

  const sentenceClarity = useMemo(() => {
    // Average of the top-level per-result scores (sentence-level)
    if (analysisResults.length === 0) return avgScore;
    return avgScore;
  }, [analysisResults, avgScore]);

  const categoryCards = useMemo(() => {
    if (drillType === "vocabulary") {
      return [
        { icon: "🗣️", label: "Word Accuracy", subtitle: "Keep it up!", score: wordAccuracy },
        { icon: "📝", label: "Sentence Clarity", subtitle: "Great progress", score: sentenceClarity },
      ];
    }
    return [
      { icon: "🗣️", label: "Word Accuracy", subtitle: "Keep it up!", score: wordAccuracy },
      { icon: "📝", label: "Sentence Clarity", subtitle: "Great progress", score: sentenceClarity },
      { icon: "💬", label: "Role-Play Score", subtitle: "Well done!", score: avgScore },
    ];
  }, [drillType, wordAccuracy, sentenceClarity, avgScore]);

  const { user } = useAuth();
  const isFreeUser = !user?.isSubscribed;
  const [showFluencyGate, setShowFluencyGate] = useState(false);

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100`} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={tw`px-5 pt-3 flex-row items-center justify-between`}>
        <View>
          <AppText style={tw`text-2xl font-bold text-neutral-900`}>
            Lesson Review
          </AppText>
          <AppText style={tw`text-sm text-neutral-500 mt-1`}>
            Here's how your voice grew today.
          </AppText>
        </View>
        <TouchableOpacity onPress={onDone} hitSlop={8}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pb-8 pt-4`}
        showsVerticalScrollIndicator={false}
      >
        {/* Clarity Score Ring */}
        <View style={tw`items-center mb-6`}>
          <ClarityRing score={avgScore} />
        </View>

        {/* Score Category Cards */}
        {categoryCards.map((card, idx) => (
          <ScoreCategoryCard
            key={idx}
            icon={card.icon}
            label={card.label}
            subtitle={card.subtitle}
            score={card.score}
          />
        ))}

        {/* Highlights From Today */}
        <CollapsibleSection
          title="Highlights From Today"
          subtitle="Here are some feedback based on the above"
          initiallyOpen={true}
        >
          {/* Strengths */}
          <View style={tw`mb-4`}>
            <View style={tw`flex-row items-center mb-2`}>
              <View style={tw`w-5 h-5 rounded-full bg-green-100 items-center justify-center mr-2`}>
                <AppText style={tw`text-xs`}>✓</AppText>
              </View>
              <AppText style={tw`text-sm font-bold text-neutral-900`}>
                Strengths
              </AppText>
            </View>
            {highlights.strengths.map((s, i) => (
              <View key={i} style={tw`flex-row items-start ml-7 mb-1`}>
                <AppText style={tw`text-neutral-400 mr-2`}>•</AppText>
                <AppText style={tw`text-sm text-neutral-600 flex-1`}>{s}</AppText>
              </View>
            ))}
          </View>

          {/* Focus for Tomorrow */}
          <View>
            <View style={tw`flex-row items-center mb-2`}>
              <View style={tw`w-5 h-5 rounded-full bg-yellow-100 items-center justify-center mr-2`}>
                <AppText style={tw`text-xs`}>◎</AppText>
              </View>
              <AppText style={tw`text-sm font-bold text-neutral-900`}>
                Focus for Tomorrow
              </AppText>
            </View>
            {highlights.focus.map((f, i) => (
              <View key={i} style={tw`flex-row items-start ml-7 mb-1`}>
                <AppText style={tw`text-neutral-400 mr-2`}>•</AppText>
                <AppText style={tw`text-sm text-neutral-600 flex-1`}>{f}</AppText>
              </View>
            ))}
          </View>
        </CollapsibleSection>

        {/* Detailed Breakdown */}
        {isFreeUser ? (
          <DetailedFeedbackLocked onBookCall={() => setShowFluencyGate(true)} />
        ) : (
          <CollapsibleSection
            title="Detailed breakdown"
            subtitle="Here is a breakdown of your performance"
            initiallyOpen={false}
          >
            {/* Syllables */}
            {allSyllables.length > 0 && (
              <View style={tw`mb-4`}>
                <AppText style={tw`text-xs font-semibold text-neutral-500 mb-2`}>
                  Syllables
                </AppText>
                <View style={tw`flex-row flex-wrap`}>
                  {allSyllables.map((syl, idx) => (
                    <View key={idx} style={tw`mr-4 mb-3 min-w-16`}>
                      <AppText style={tw`text-sm text-neutral-900`}>
                        {syl.letters}
                      </AppText>
                      <View style={tw`flex-row items-center gap-1`}>
                        <AppText
                          style={[
                            tw`text-xs font-bold`,
                            {
                              color:
                                syl.quality_score >= 80
                                  ? "#16a34a"
                                  : syl.quality_score >= 50
                                  ? "#d97706"
                                  : "#dc2626",
                            },
                          ]}
                        >
                          {Math.round(syl.quality_score)}
                        </AppText>
                        <AppText style={tw`text-xs text-neutral-400`}>
                          stress: {syl.stress_level ?? 0}
                        </AppText>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Phonemes */}
            {allPhonemes.length > 0 && (
              <View style={tw`mb-4`}>
                <AppText style={tw`text-xs font-semibold text-neutral-500 mb-2`}>
                  Phonemes
                </AppText>
                <View style={tw`flex-row flex-wrap`}>
                  {allPhonemes.map((ph, idx) => (
                    <ScorePill
                      key={idx}
                      label={ph.phone}
                      score={ph.quality_score}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Letter-level Feedback */}
            {allWords.length > 0 && (
              <View>
                <AppText style={tw`text-xs font-semibold text-neutral-500 mb-2`}>
                  Letter level Feedback
                </AppText>
                {allWords.map((ws, wIdx) => (
                  <View key={wIdx} style={tw`mb-3`}>
                    <AppText style={tw`text-sm font-semibold text-neutral-700 mb-1`}>
                      {ws.word}
                    </AppText>
                    <View style={tw`flex-row flex-wrap`}>
                      {ws.phone_score_list?.map((ph, pIdx) => (
                        <ScorePill
                          key={pIdx}
                          label={ph.phone}
                          score={ph.quality_score}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </CollapsibleSection>
        )}
      </ScrollView>

      {/* Bottom Buttons + Book a call */}
      <View style={tw`px-5 pb-4`}>
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
          style={tw`w-full border-2 border-primary-500 rounded-full py-4 items-center mb-3`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-primary-500 text-base font-semibold`}>
            practice again
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            if (isFreeUser) {
              setShowFluencyGate(true);
            } else {
              router.push("/book-call");
            }
          }}
          style={tw`w-full border border-neutral-300 rounded-full py-3 items-center`}
          activeOpacity={0.8}
        >
          <AppText style={tw`text-neutral-800 text-sm font-semibold`}>
            Book a fluency review call
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Fluency call gating overlay */}
      <FluencyReviewGate visible={isFreeUser && showFluencyGate} onClose={() => setShowFluencyGate(false)} />
    </SafeAreaView>
  );
}




