import { APPLE_PRO_MONTHLY_PRODUCT_ID, APPLE_VERIFY_PATH } from '@/constants/apple-iap';
import apiClient from '@/lib/api';
import type { AppleVerifyRequest, AppleVerifyResponse } from '@/types/apple-iap';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { Platform } from 'react-native';
import {
  endConnection,
  finishTransaction,
  fetchProducts,
  getAvailablePurchases,
  getTransactionJwsIOS,
  initConnection,
  isUserCancelledError,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  restorePurchases,
  showManageSubscriptionsIOS,
  type ProductSubscription,
  type Purchase,
  type PurchaseIOS,
} from 'react-native-iap';

let connectionReady = false;
let listenersRegistered = false;

type PurchaseWaiter = {
  resolve: (purchase: Purchase) => void;
  reject: (error: Error) => void;
};

let purchaseWaiter: PurchaseWaiter | null = null;

function assertIos(): void {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple IAP is only available on iOS.');
  }
}

function clearPurchaseWaiter(): void {
  purchaseWaiter = null;
}

function registerListenersOnce(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  purchaseUpdatedListener((purchase) => {
    if (purchaseWaiter) {
      purchaseWaiter.resolve(purchase);
      clearPurchaseWaiter();
    }
  });

  purchaseErrorListener((error) => {
    if (!purchaseWaiter) return;
    if (isUserCancelledError(error)) {
      purchaseWaiter.reject(new Error('Purchase cancelled.'));
    } else {
      purchaseWaiter.reject(new Error(error.message || 'Purchase failed.'));
    }
    clearPurchaseWaiter();
  });
}

export async function initAppleIap(): Promise<void> {
  assertIos();
  if (connectionReady) return;

  registerListenersOnce();
  await initConnection();
  connectionReady = true;
  logger.log('Apple IAP connection initialized');
}

export async function teardownAppleIap(): Promise<void> {
  if (!connectionReady) return;
  clearPurchaseWaiter();
  await endConnection();
  connectionReady = false;
}

export async function getProSubscriptionProduct(): Promise<ProductSubscription | null> {
  await initAppleIap();
  const products = await fetchProducts({
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
    const jws = await getTransactionJwsIOS(purchase.productId);
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
    await finishTransaction({ purchase, isConsumable: false });
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

  const purchasePromise = waitForPurchase();

  try {
    await requestPurchase({
      type: 'subs',
      request: {
        apple: { sku: APPLE_PRO_MONTHLY_PRODUCT_ID },
      },
    });
  } catch (e) {
    clearPurchaseWaiter();
    if (isUserCancelledError(e)) {
      throw new Error('Purchase cancelled.');
    }
    throw e instanceof Error ? e : new Error('Could not start purchase.');
  }

  return purchasePromise;
}

export async function restorePurchasesAndVerify(): Promise<boolean> {
  await initAppleIap();
  await restorePurchases();

  const purchases = await getAvailablePurchases({
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
  assertIos();
  await initAppleIap();
  await showManageSubscriptionsIOS();
}

export function iapErrorMessage(error: unknown): string {
  if (isUserCancelledError(error)) {
    return 'Purchase cancelled.';
  }
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
