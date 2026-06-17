import { AppText, BoldText, Button } from "@/components/ui";
import { useNotificationToast } from "@/contexts/NotificationToastContext";
import { useUserCurrent } from "@/hooks/useSettings";
import tw from "@/lib/tw";
import {
  getProSubscriptionProduct,
  IAP_UNAVAILABLE_MESSAGE,
  initAppleIap,
  teardownAppleIap,
} from "@/services/apple-iap.service";
import { isExpoGo } from "@/utils/expo-runtime";
import {
  iapErrorMessage,
  manageSubscription,
  pollUntilSubscribed,
  restorePurchases,
  startUpgrade,
} from "@/services/billing";
import { useAuthStore } from "@/store/auth-store";
import { Alert } from "@/utils/alert";
import { logger } from "@/utils/logger";
import { isProSubscriber } from "@/utils/subscription";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import type { ProductSubscription } from "react-native-iap";

const IS_IOS = Platform.OS === "ios";

const FREE_FEATURES = [
  "Basic pronunciation practice",
  "Progress tracking",
  "Limited daily activity",
];

const PRO_FEATURES = [
  "Eklan Free Talk — unlimited AI conversation practice sessions",
  "Assigned drills & My Plan — see everything your tutor assigns",
  "Full access to all current and future AI-powered features",
  "AI-driven feedback and scoring on every session",
  "Personalised difficulty that adapts as you improve",
];

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke={tw.prefixMatch("dark") ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon({ color = "#22c55e" }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export default function PremiumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useNotificationToast();
  const { data: me, isLoading: userLoading, refetch } = useUserCurrent();
  const user = me?.user;

  const isPro = isProSubscriber(user);
  const expiresAt = user?.subscriptionExpiresAt;

  const checkoutPollStarted = useRef(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [iapProduct, setIapProduct] = useState<ProductSubscription | null>(null);

  const statusMessage = isPro
    ? "You have full access to AI features — dive in!"
    : IS_IOS
      ? "Subscribe with your Apple ID to unlock Eklan Free Talk and all AI features."
      : "Upgrade to Pro to unlock Eklan Free Talk and all AI features.";

  const showPostPurchaseToast = useCallback(
    (subscribed: boolean) => {
      if (subscribed) {
        showToast({
          title: "Welcome to Pro!",
          body: "AI features are now unlocked.",
          variant: "dark",
          duration: 4500,
          emoji: "✨",
        });
      } else {
        showToast({
          title: IS_IOS ? "Purchase confirmed" : "Payment received",
          body: "Access will activate shortly — pull to refresh on this screen if it doesn't appear within a minute.",
          variant: "dark",
          duration: 6000,
        });
      }
    },
    [showToast]
  );

  const runPostPurchaseFlow = useCallback(async () => {
    const ok = await pollUntilSubscribed(queryClient);
    showPostPurchaseToast(ok);
    await refetch();
  }, [queryClient, refetch, showPostPurchaseToast]);

  useEffect(() => {
    if (params.checkout !== "success") return;
    if (checkoutPollStarted.current) return;
    checkoutPollStarted.current = true;
    router.replace("/premium" as never);
    void runPostPurchaseFlow();
  }, [params.checkout, router, runPostPurchaseFlow]);

  useEffect(() => {
    if (!IS_IOS) return;

    let cancelled = false;

    void (async () => {
      try {
        await initAppleIap();
        const product = await getProSubscriptionProduct();
        if (!cancelled) setIapProduct(product);
      } catch (e) {
        logger.warn("Failed to load App Store product:", e);
      }
    })();

    return () => {
      cancelled = true;
      void teardownAppleIap();
    };
  }, []);

  const handleBack = () => {
    router.replace("/(tabs)/profile" as never);
  };

  const handleUpgrade = async () => {
    setUpgradeBusy(true);
    try {
      await startUpgrade();
      if (IS_IOS) {
        await runPostPurchaseFlow();
      }
    } catch (e: unknown) {
      const msg = IS_IOS ? iapErrorMessage(e) : extractStripeError(e);
      if (msg !== "Purchase cancelled.") {
        Alert.alert(IS_IOS ? "Subscribe" : "Checkout", msg);
      }
    } finally {
      setUpgradeBusy(false);
    }
  };

  const handleRestore = async () => {
    setRestoreBusy(true);
    try {
      const subscribed = await restorePurchases(queryClient);
      if (subscribed) {
        showPostPurchaseToast(true);
        await refetch();
      } else if (isPro) {
        Alert.alert(
          "Restore purchases",
          "Your account already has Pro access. If features are missing, pull to refresh or sign out and back in."
        );
      } else {
        Alert.alert(
          "Restore purchases",
          "No active Pro subscription was found for this Apple ID."
        );
      }
    } catch (e: unknown) {
      Alert.alert("Restore purchases", iapErrorMessage(e));
    } finally {
      setRestoreBusy(false);
    }
  };

  const handleManage = async () => {
    setManageBusy(true);
    try {
      await manageSubscription();
      if (!IS_IOS) {
        await refetch();
        await useAuthStore.getState().checkSession();
      }
    } catch (e: unknown) {
      const msg = IS_IOS ? iapErrorMessage(e) : extractStripeError(e);
      Alert.alert("Billing", msg);
    } finally {
      setManageBusy(false);
    }
  };

  const handleSupport = () => {
    router.push("/contact" as never);
  };

  const upgradeLabel = IS_IOS
    ? upgradeBusy
      ? "Processing…"
      : iapProduct?.displayPrice
        ? `Subscribe — ${iapProduct.displayPrice}/mo`
        : "Subscribe to Pro"
    : upgradeBusy
      ? "Preparing checkout…"
      : "Upgrade to Pro";

  return (
    <SafeAreaView style={tw`flex-1 bg-white dark:bg-neutral-900`} edges={["top", "bottom"]}>
      <View style={tw`px-5 pt-3 flex-row items-center justify-between`}>
        <TouchableOpacity
          onPress={handleBack}
          style={tw`w-10 h-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800`}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
        >
          <BackIcon />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`px-5 pt-4 pb-8`}
        showsVerticalScrollIndicator={false}
      >
        <BoldText style={tw`text-2xl text-neutral-900 dark:text-white mb-1`}>Subscriptions</BoldText>
        <AppText style={tw`text-sm text-neutral-500 dark:text-neutral-400 mb-6`}>
          Manage your Eklan Pro plan
        </AppText>

        {userLoading && !user ? (
          <View style={tw`py-12 items-center`}>
            <ActivityIndicator color="#16a34a" />
          </View>
        ) : (
          <>
            <View
              style={tw`rounded-2xl px-4 py-4 mb-6 border ${
                isPro
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
              }`}
            >
              <AppText style={tw`text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide`}>
                Current plan
              </AppText>
              <BoldText
                style={tw`text-xl mt-1 ${isPro ? "text-green-700 dark:text-green-400" : "text-neutral-900 dark:text-white"}`}
              >
                {isPro ? "Pro" : "Free"}
              </BoldText>
              <AppText style={tw`text-sm text-neutral-600 dark:text-neutral-300 mt-2 leading-5`}>
                {statusMessage}
              </AppText>
              {isPro && expiresAt ? (
                <AppText style={tw`text-xs text-neutral-500 dark:text-neutral-400 mt-2`}>
                  Renews or ends on {formatDate(expiresAt)}
                </AppText>
              ) : null}
            </View>

            <BoldText style={tw`text-base text-neutral-900 dark:text-white mb-3`}>Compare plans</BoldText>

            <View style={tw`flex-row gap-3 mb-6`}>
              <View
                style={tw`flex-1 rounded-2xl p-4 border-2 ${
                  !isPro
                    ? "border-green-600 bg-white dark:bg-neutral-900"
                    : "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50"
                }`}
              >
                <AppText style={tw`text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2`}>FREE</AppText>
                {FREE_FEATURES.map((line) => (
                  <View key={line} style={tw`flex-row gap-2 mb-2`}>
                    <CheckIcon color={tw.prefixMatch("dark") ? "#4ade80" : "#22c55e"} />
                    <AppText style={tw`flex-1 text-xs text-neutral-700 dark:text-neutral-200 leading-4`}>{line}</AppText>
                  </View>
                ))}
              </View>

              <View
                style={tw`flex-1 rounded-2xl p-4 border-2 ${
                  isPro
                    ? "border-green-600 bg-white dark:bg-neutral-900"
                    : "border-green-400/80 bg-green-50/40 dark:bg-green-900/15 dark:border-green-700"
                }`}
              >
                <View style={tw`flex-row items-center justify-between mb-2`}>
                  <AppText style={tw`text-xs font-bold text-green-800 dark:text-green-200`}>PRO</AppText>
                  {!isPro ? (
                    <View style={tw`bg-green-600 px-2 py-0.5 rounded-full`}>
                      <AppText style={tw`text-[10px] font-bold text-white`}>Pro</AppText>
                    </View>
                  ) : null}
                </View>
                {PRO_FEATURES.map((line) => (
                  <View key={line} style={tw`flex-row gap-2 mb-2`}>
                    <CheckIcon color={tw.prefixMatch("dark") ? "#4ade80" : "#22c55e"} />
                    <AppText style={tw`flex-1 text-xs text-neutral-700 dark:text-neutral-200 leading-4`}>{line}</AppText>
                  </View>
                ))}
              </View>
            </View>

            {isPro ? (
              <Button onPress={handleManage} loading={manageBusy}>
                {manageBusy ? "Opening…" : "Manage subscription"}
              </Button>
            ) : (
              <Button onPress={handleUpgrade} loading={upgradeBusy}>
                {upgradeLabel}
              </Button>
            )}

            {IS_IOS ? (
              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoreBusy}
                style={tw`mt-4 py-3 items-center`}
                accessibilityRole="button"
                accessibilityLabel="Restore purchases"
              >
                {restoreBusy ? (
                  <ActivityIndicator color="#16a34a" size="small" />
                ) : (
                  <AppText style={tw`text-sm text-neutral-600 dark:text-neutral-300 font-semibold`}>
                    Restore purchases
                  </AppText>
                )}
              </TouchableOpacity>
            ) : null}

            {IS_IOS && !isPro ? (
              <AppText style={tw`text-xs text-neutral-500 dark:text-neutral-400 text-center mt-3 leading-4 px-2`}>
                {isExpoGo()
                  ? IAP_UNAVAILABLE_MESSAGE
                  : "Pro access works across devices when you sign in with the same account. Payment is handled by Apple on iOS and may differ on Android or web."}
              </AppText>
            ) : null}

            <TouchableOpacity onPress={handleSupport} style={tw`mt-6 py-3 items-center`}>
              <AppText style={tw`text-sm text-green-700 dark:text-green-400 font-semibold`}>
                Contact support
              </AppText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function extractStripeError(e: unknown): string {
  return (
    (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (e instanceof Error ? e.message : "Something went wrong.")
  );
}
