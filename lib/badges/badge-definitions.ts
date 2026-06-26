import type { BadgeId, BadgeUnlockCelebration } from '@/types/badge.types';

export const BADGE_UNLOCK_DEFINITIONS: Record<BadgeId, Omit<BadgeUnlockCelebration, 'badgeId'>> = {
  'first-steps': {
    badgeName: 'First Steps',
    icon: '👣',
    afterOutcome:
      "You've earned this award for completing your first drill and officially started your journey toward confident nursing communication.",
    humorousLine: "Looks like someone's been busy.",
  },
  'seven-day-stretch': {
    badgeName: '7-Day Stretch',
    icon: '🔥',
    afterOutcome:
      "You've earned this award for practicing for at least 5 minutes every day for 7 consecutive days.",
    humorousLine: 'At this point, your phone expects to see you.',
  },
  'done-and-dusted': {
    badgeName: 'Done & Dusted',
    icon: '🏆',
    afterOutcome: "You've earned this award for completing all drills for the week.",
    humorousLine: 'And they all lived happily ever after... or not. Next?',
  },
  'deja-vu': {
    badgeName: 'Déjà Vu',
    icon: '🔭',
    afterOutcome:
      "You've earned this award for practising a difficult drill at least 10 times.",
    humorousLine: 'If this drill could talk, it would know your voice by now.',
  },
  'monthly-challenge': {
    badgeName: 'Monthly Challenge',
    icon: '📅',
    afterOutcome:
      "You've earned this award for practicing at least 5 minutes everyday for 14 consecutive days within a single month.",
    humorousLine: 'Not every hero wears a cape... Turns out consistency is a superpower.',
  },
  'master-collector': {
    badgeName: 'Master Collector',
    icon: '📚',
    afterOutcome:
      "You've earned this award for saving difficult drills to revisit and master later.",
    humorousLine: 'This difficult drill is already getting nervous. We love seeing it.',
  },
  'medication-master': {
    badgeName: 'Medication Master',
    icon: '💊',
    afterOutcome:
      "You've earned this award for correctly practicing 50 medication names and explanations.",
    humorousLine: "Metoprolol is even scared of you now... You're in charge.",
  },
  'handover-hero': {
    badgeName: 'Handover Hero',
    icon: '📋',
    afterOutcome: "You've earned this award for completing handover drills.",
    humorousLine: 'Clear. Concise. Complete. Look at you!',
  },
  'nightingale-award': {
    badgeName: 'Nightingale Award',
    icon: '👑',
    afterOutcome: "You've earned this award for completing Zero Pause Challenge.",
    humorousLine: 'Florence is looking down on you and smiling.',
  },
  'skill-keeper': {
    badgeName: 'Skill Keeper',
    icon: '🔄',
    afterOutcome: "You've earned this award for completing your assigned daily refresh.",
    humorousLine: "You keep showing up. That's what stars do.",
  },
};

const BADGE_IDS = new Set<string>(Object.keys(BADGE_UNLOCK_DEFINITIONS));

export function isBadgeId(value: string): value is BadgeId {
  return BADGE_IDS.has(value);
}
