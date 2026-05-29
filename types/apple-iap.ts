/** POST /api/v1/apple/verify request (at least one identifier required). */
export type AppleVerifyRequest = {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  signedTransactionInfo?: string;
};

/** POST /api/v1/apple/verify success response. */
export type AppleVerifyResponse = {
  success: boolean;
  isSubscribed: boolean;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string | null;
};

export type AppleVerifyErrorCode =
  | 'ValidationError'
  | 'VerificationFailed'
  | 'ConfigError';
