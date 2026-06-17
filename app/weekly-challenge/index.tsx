/**
 * Legacy weekly challenge hub — redirects to the full practice/weekly-challenge stack.
 * Kept for backward compatibility (e.g. roleplay "Continue Later" previously navigated here).
 */
import { Redirect } from "expo-router";

export default function WeeklyChallengeRedirect() {
  return <Redirect href="/practice/weekly-challenge" />;
}
