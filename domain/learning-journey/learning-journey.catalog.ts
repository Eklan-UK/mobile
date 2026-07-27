// Mirror of server-side catalog — hard-coded, no API fetch required.

export type LearningJourneyPartId = 1 | 2 | 3 | 4 | 5;

export interface MyEnrollmentsResponse {
  enrolledParts: LearningJourneyPartId[];
}

export type LearningJourneyTopic = {
  id: string;
  title: string;
  order: number;
  /** Matches drill items where item.drill.scenarioType === freeTalkScenarioType */
  freeTalkScenarioType?: string;
};

/** Icon keys mapped to Ionicons / MaterialCommunityIcons in the roadmap UI. */
export type MissionIconKey =
  | 'stethoscope'
  | 'people'
  | 'message'
  | 'clipboard'
  | 'star';

export type MissionTheme = {
  accent: string;
  iconKey: MissionIconKey;
};

/** Per-mission Figma accents (light timeline; completed rail/nodes use MISSION_COMPLETED_COLOR). */
export const MISSION_THEMES: Record<LearningJourneyPartId, MissionTheme> = {
  1: { accent: '#3b82f6', iconKey: 'stethoscope' },
  2: { accent: '#ff7a00', iconKey: 'people' },
  3: { accent: '#a855f7', iconKey: 'message' },
  4: { accent: '#3b82f6', iconKey: 'clipboard' },
  5: { accent: '#ff7a00', iconKey: 'star' },
};

export const MISSION_COMPLETED_COLOR = '#2a602c';

export type MissionVisualStatus =
  | 'locked'
  | 'active'
  | 'completed'
  | 'journeyComplete';

export type PartProgressInput = {
  completed: number;
  total: number;
};

export type MissionCtaLabel = 'start' | 'continue' | null;

export type MissionState = {
  part: LearningJourneyPartId;
  status: MissionVisualStatus;
  percent: number;
  completed: number;
  total: number;
  isEnrolled: boolean;
  /**
   * Lowest incomplete enrolled mission — View Details / optional ring emphasis.
   * CTA visibility uses `ctaLabel`, not `isCurrent`.
   */
  isCurrent: boolean;
  /** Active missions: Start at 0%, Continue when percent > 0; else null. */
  ctaLabel: MissionCtaLabel;
};

export type LearningJourneyPart = {
  part: LearningJourneyPartId;
  title: string;
  topics: LearningJourneyTopic[];
  theme: MissionTheme;
};

export const LEARNING_JOURNEY_PARTS: LearningJourneyPart[] = [
  {
    part: 1,
    title: 'Communication with Patients',
    theme: MISSION_THEMES[1],
    topics: [
      { id: 'handling_emergency_critical', title: 'Handling Emergency/Critical Situation', order: 1, freeTalkScenarioType: 'icu_emergency' },
      { id: 'conducting_cpr', title: 'Conducting CPR', order: 2, freeTalkScenarioType: 'cpr' },
      { id: 'patient_follow_up', title: 'Follow-up with Patients', order: 3, freeTalkScenarioType: 'patient_follow_up' },
      { id: 'admitting_patient', title: 'Admitting a Patient', order: 4, freeTalkScenarioType: 'admission' },
      { id: 'small_talk_patient', title: 'Small Talk with a Patient', order: 5, freeTalkScenarioType: 'small_talk_patient' },
    ],
  },
  {
    part: 2,
    title: 'Communication with Colleagues',
    theme: MISSION_THEMES[2],
    topics: [
      { id: 'receiving_handover', title: 'Receiving an Handover', order: 1, freeTalkScenarioType: 'handover_receive' },
      { id: 'giving_handover', title: 'Giving an Handover', order: 2, freeTalkScenarioType: 'handover' },
      { id: 'declining_request', title: 'Declining a Request and Professionally Saying No', order: 3, freeTalkScenarioType: 'decline_request' },
      { id: 'small_talk_colleagues', title: 'Small Talk with Colleagues', order: 4, freeTalkScenarioType: 'small_talk_colleague' },
    ],
  },
  {
    part: 3,
    title: 'Communication with Doctors, Families and Friends',
    theme: MISSION_THEMES[3],
    topics: [
      { id: 'providing_updates_doctor', title: 'Providing Updates to a Doctor', order: 1, freeTalkScenarioType: 'phone_doctor' },
      { id: 'doctor_rounds', title: 'Going on Rounds with Doctors', order: 2, freeTalkScenarioType: 'doctor_rounds' },
      { id: 'answering_family_questions', title: "Answering Families and Friend's Questions", order: 3, freeTalkScenarioType: 'family_questions' },
    ],
  },
  {
    part: 4,
    title: 'Interview Preparation',
    theme: MISSION_THEMES[4],
    topics: [
      { id: 'motivation_prep', title: 'Motivation prep', order: 1 },
      { id: 'technical_prep', title: 'Technical prep', order: 2 },
      { id: 'situation_judgement_prep', title: 'Situation Judgement Prep', order: 3 },
      { id: 'mock_1', title: 'Mock 1', order: 4 },
      { id: 'mock_2', title: 'Mock 2', order: 5 },
      { id: 'mock_3', title: 'Mock 3', order: 6 },
      { id: 'mock_4', title: 'Mock 4', order: 7 },
      { id: 'mock_5', title: 'Mock 5', order: 8 },
    ],
  },
  {
    part: 5,
    title: 'Bonus Scenarios',
    theme: MISSION_THEMES[5],
    topics: [
      { id: 'phone_colleagues', title: 'Phone Communication with Colleagues', order: 1, freeTalkScenarioType: 'phone_colleague' },
      { id: 'phone_other_departments', title: 'Phone Communication with Other Departments', order: 2, freeTalkScenarioType: 'phone_department' },
      { id: 'phone_patient_families', title: "Phone Communication with the Patient's Families", order: 3, freeTalkScenarioType: 'phone_family' },
      { id: 'grammar', title: 'Grammar', order: 4 },
    ],
  },
];

/**
 * Derive visual mission states from tutor enrollment + drill progress.
 * Unlock gate remains enrollment; only the lowest incomplete enrolled mission is `isCurrent`.
 * Every active mission gets a CTA via `ctaLabel` (Start at 0%, Continue otherwise).
 * When every enrolled mission is complete, `journeyComplete` (trophy) is on the highest enrolled part.
 */
export function deriveMissionStates(
  enrolledParts: readonly LearningJourneyPartId[],
  progressByPart: Partial<Record<LearningJourneyPartId, PartProgressInput>> = {}
): MissionState[] {
  const enrolled = new Set(enrolledParts);

  const base: MissionState[] = LEARNING_JOURNEY_PARTS.map((partDef) => {
    const progress = progressByPart[partDef.part] ?? { completed: 0, total: 0 };
    const completed = Math.max(0, progress.completed);
    const total = Math.max(0, progress.total);
    const isEnrolled = enrolled.has(partDef.part);
    const isPartComplete = isEnrolled && (total === 0 || completed >= total);
    const percent =
      total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

    let status: MissionVisualStatus;
    if (!isEnrolled) {
      status = 'locked';
    } else if (isPartComplete) {
      status = 'completed';
    } else {
      status = 'active';
    }

    const resolvedPercent = isPartComplete ? 100 : percent;
    const ctaLabel: MissionCtaLabel =
      status === 'active' ? (resolvedPercent === 0 ? 'start' : 'continue') : null;

    return {
      part: partDef.part,
      status,
      percent: resolvedPercent,
      completed,
      total,
      isEnrolled,
      isCurrent: false,
      ctaLabel,
    };
  });

  // Journey done = every enrolled mission complete (unenrolled stay locked).
  // Trophy sits on the highest enrolled part, not hardcoded M5.
  const enrolledStates = base.filter((s) => s.isEnrolled);
  const allEnrolledComplete =
    enrolledStates.length >= 1 &&
    enrolledStates.every((s) => s.status === 'completed');
  if (allEnrolledComplete) {
    const highest = enrolledStates.reduce((a, b) =>
      a.part > b.part ? a : b
    );
    highest.status = 'journeyComplete';
    highest.ctaLabel = null;
  }

  const current = base.find(
    (s) => s.isEnrolled && s.status === 'active'
  );
  if (current) current.isCurrent = true;

  return base;
}

/** Rail segment below mission `i` → next: green if done, accent if active, gray if locked. */
export function railSegmentColor(
  status: MissionVisualStatus,
  accent: string
): string {
  if (status === 'completed' || status === 'journeyComplete') {
    return MISSION_COMPLETED_COLOR;
  }
  if (status === 'active') {
    return accent;
  }
  return '#e0e0e0';
}

/**
 * How far the colored rail should grow toward the next mission (0–1).
 * Completed = full; active = actual percent; locked = 0 (gray track only).
 */
export function railSegmentFillRatio(
  status: MissionVisualStatus,
  percent: number
): number {
  if (status === 'completed' || status === 'journeyComplete') return 1;
  if (status === 'active') {
    return Math.min(1, Math.max(0, percent / 100));
  }
  return 0;
}

export function getMissionTheme(part: LearningJourneyPartId): MissionTheme {
  return MISSION_THEMES[part];
}

/** Target part for “View Details”: current active, else first enrolled, else null. */
export function resolveViewDetailsPart(
  states: readonly MissionState[]
): LearningJourneyPartId | null {
  const current = states.find((s) => s.isCurrent);
  if (current) return current.part;
  const firstEnrolled = states.find((s) => s.isEnrolled);
  return firstEnrolled?.part ?? null;
}

export function parseLearningJourneyPartId(value: unknown): LearningJourneyPartId | null {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) {
    return n;
  }
  return null;
}

export function getPartById(part: LearningJourneyPartId): LearningJourneyPart | undefined {
  return LEARNING_JOURNEY_PARTS.find((p) => p.part === part);
}

export function getTopicsForPart(part: LearningJourneyPartId): LearningJourneyTopic[] {
  return getPartById(part)?.topics ?? [];
}
