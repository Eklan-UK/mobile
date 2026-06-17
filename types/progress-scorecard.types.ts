export interface ProgressScorecardMetrics {
  pronunciation: number;
  accuracy: number;
  fluency: number;
  confidence: number;
  pronunciationWeeklyChange: number;
  accuracyWeeklyChange: number;
  fluencyWeeklyChange: number;
  confidenceWeeklyChange: number;
  confidenceLabel:
    | 'Excellent'
    | 'Very Good'
    | 'Good'
    | 'Average'
    | 'Developing'
    | 'Needs Improvement';
  confidenceTrend: 'improving' | 'stable' | 'declining';
  sampleCounts: {
    pronunciationDrills: number;
    accuracyDrills: number;
    fluencyScenarios: number;
  };
}
