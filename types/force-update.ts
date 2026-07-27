/** Response from `GET /api/v1/mobile/app-config` (flat or `{ data }` envelope). */
export interface MobileAppConfig {
  minimumIosVersion: string;
  minimumAndroidVersion: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  title?: string;
  message?: string;
}

export interface ForceUpdateEvaluation {
  required: boolean;
  storeUrl: string;
  title: string;
  message: string;
}
