export type BadgeId =
  | 'first-steps'
  | 'seven-day-stretch'
  | 'done-and-dusted'
  | 'deja-vu'
  | 'monthly-challenge'
  | 'master-collector'
  | 'medication-master'
  | 'handover-hero'
  | 'nightingale-award'
  | 'skill-keeper';

export interface BadgeProgress {
  current: number;
  target: number;
}

export interface BadgeView {
  badgeId: BadgeId;
  badgeName: string;
  icon: string;
  sortOrder: number;
  beforeDescription: string;
  afterOutcome: string;
  humorousLine: string;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: BadgeProgress | null;
}

export interface BadgeStateResponse {
  badges: BadgeView[];
  featuredBadge: BadgeView;
}
