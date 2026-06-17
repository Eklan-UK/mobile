import { APPLE_PRO_MONTHLY_PRODUCT_ID, APPLE_VERIFY_PATH } from '@/constants/apple-iap';
import apiClient from '@/lib/api';
import type { AppleVerifyRequest, AppleVerifyResponse } from '@/types/apple-iap';
import { isExpoGo } from '@/utils/expo-runtime';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { Platform } from 'react-native';
import type {
  ProductSubscription,
  Purchase,
  PurchaseIOS,
} from 'react-native-iap';

export const IAP_UNAVAILABLE_MESSAGE =
  'In-app purchases require a development build. Expo Go does not support Apple IAP. Run a dev client with `npx expo run:ios` or an EAS build.';

type IapModule = typeof import('react-native-iap');

let iapModule: IapModule | null = null;
let connectionReady = false;
let listenersRegistered = false;

type PurchaseWaiter = {
  resolve: (purchase: Purchase) => void;
  reject: (error: Error) => void;
};

let purchaseWaiter: PurchaseWaiter | null = null;

function assertIapAvailable(): void {
  if (isExpoGo()) {
    throw new Error(IAP_UNAVAILABLE_MESSAGE);
  }
  if (Platform.OS !== 'ios') {
    throw new Error('Apple IAP is only available on iOS.');
  }
}

async function getIap(): Promise<IapModule> {
  assertIapAvailable();
  if (!iapModule) {
    iapModule = await import('react-native-iap');
  }
  return iapModule;
}

function clearPurchaseWaiter(): void {
  purchaseWaiter = null;
}

async function registerListenersOnce(): Promise<void> {
  if (listenersRegistered) return;
  listenersRegistered = true;

  const iap = await getIap();

  iap.purchaseUpdatedListener((purchase) => {
    if (purchaseWaiter) {
      purchaseWaiter.resolve(purchase);
      clearPurchaseWaiter();
    }
  });

  iap.purchaseErrorListener((error) => {
    if (!purchaseWaiter) return;
    if (iap.isUserCancelledError(error)) {
      purchaseWaiter.reject(new Error('Purchase cancelled.'));
    } else {
      purchaseWaiter.reject(new Error(error.message || 'Purchase failed.'));
    }
    clearPurchaseWaiter();
  });
}

export async function initAppleIap(): Promise<void> {
  assertIapAvailable();
  if (connectionReady) return;

  const iap = await getIap();
  await registerListenersOnce();
  await iap.initConnection();
  connectionReady = true;
  logger.log('Apple IAP connection initialized');
}

export async function teardownAppleIap(): Promise<void> {
  if (!connectionReady || !iapModule) return;
  clearPurchaseWaiter();
  await iapModule.endConnection();
  connectionReady = false;
}

export async function getProSubscriptionProduct(): Promise<ProductSubscription | null> {
  await initAppleIap();
  const iap = await getIap();
  const products = await iap.fetchProducts({
    skus: [APPLE_PRO_MONTHLY_PRODUCT_ID],
    type: 'subs',
  });
  if (!products?.length) return null;
  return products[0] as ProductSubscription;
}

export function purchaseToVerifyRequest(purchase: Purchase): AppleVerifyRequest {
  const iosPurchase = purchase as PurchaseIOS;
  const transactionId = iosPurchase.transactionId ?? purchase.id;
  const originalTransactionId =
    iosPurchase.originalTransactionIdentifierIOS ?? transactionId;

  return {
    transactionId,
    originalTransactionId,
    productId: purchase.productId ?? APPLE_PRO_MONTHLY_PRODUCT_ID,
    signedTransactionInfo: purchase.purchaseToken ?? undefined,
  };
}

export async function verifyApplePurchase(
  body: AppleVerifyRequest
): Promise<AppleVerifyResponse> {
  try {
    const response = await apiClient.post<AppleVerifyResponse>(APPLE_VERIFY_PATH, body);
    return response.data;
  } catch (e) {
    if (axios.isAxiosError(e)) {
      const code = (e.response?.data as { code?: string })?.code;
      const message =
        (e.response?.data as { message?: string })?.message ??
        e.message ??
        'Could not verify purchase with the server.';
      const err = new Error(message) as Error & { code?: string; status?: number };
      err.code = code;
      err.status = e.response?.status;
      throw err;
    }
    throw e;
  }
}

async function enrichSignedTransactionInfo(
  purchase: Purchase,
  payload: AppleVerifyRequest
): Promise<AppleVerifyRequest> {
  if (payload.signedTransactionInfo) return payload;
  if (Platform.OS !== 'ios') return payload;

  try {
    const iap = await getIap();
    const jws = await iap.getTransactionJwsIOS(purchase.productId);
    if (jws) {
      return { ...payload, signedTransactionInfo: jws };
    }
  } catch (e) {
    logger.warn('Could not fetch transaction JWS:', e);
  }
  return payload;
}

export async function verifyAndFinishPurchase(purchase: Purchase): Promise<AppleVerifyResponse> {
  let payload = purchaseToVerifyRequest(purchase);
  payload = await enrichSignedTransactionInfo(purchase, payload);

  const result = await verifyApplePurchase(payload);

  try {
    const iap = await getIap();
    await iap.finishTransaction({ purchase, isConsumable: false });
  } catch (e) {
    logger.warn('finishTransaction failed (non-fatal):', e);
  }

  return result;
}

function waitForPurchase(): Promise<Purchase> {
  return new Promise((resolve, reject) => {
    purchaseWaiter = { resolve, reject };
  });
}

export async function requestProSubscription(): Promise<Purchase> {
  await initAppleIap();
  const iap = await getIap();

  const purchasePromise = waitForPurchase();

  try {
    await iap.requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: APPLE_PRO_MONTHLY_PRODUCT_ID },
      },
    });
  } catch (e) {
    clearPurchaseWaiter();
    if (iap.isUserCancelledError(e)) {
      throw new Error('Purchase cancelled.');
    }
    throw e instanceof Error ? e : new Error('Could not start purchase.');
  }

  return purchasePromise;
}

export async function restorePurchasesAndVerify(): Promise<boolean> {
  await initAppleIap();
  const iap = await getIap();
  await iap.restorePurchases();

  const purchases = await iap.getAvailablePurchases({
    onlyIncludeActiveItemsIOS: true,
  });

  const proPurchases = purchases.filter(
    (p) => p.productId === APPLE_PRO_MONTHLY_PRODUCT_ID
  );

  if (!proPurchases.length) {
    return false;
  }

  for (const purchase of proPurchases) {
    try {
      const result = await verifyAndFinishPurchase(purchase);
      if (result.isSubscribed) return true;
    } catch (e) {
      logger.warn('Restore verify failed for purchase:', purchase.productId, e);
    }
  }

  return false;
}

export async function showManageSubscriptions(): Promise<void> {
  assertIapAvailable();
  await initAppleIap();
  const iap = await getIap();
  await iap.showManageSubscriptionsIOS();
}

export function iapErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string })?.message ??
      error.message ??
      'Something went wrong.'
    );
  }
  return 'Something went wrong. Please try again.';
}
