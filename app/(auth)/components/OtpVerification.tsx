import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, TextInput, TouchableOpacity, View } from "react-native";
import { logger } from "@/utils/logger";

// ─── Public handle exposed via ref ────────────────────────
export interface OtpVerificationHandle {
  /** Reset all internal state (otp, error, countdown) and optionally start countdown */
  reset: (startCountdown?: boolean) => void;
  /** Focus the first OTP input */
  focusFirst: () => void;
}

// ─── Props ────────────────────────────────────────────────
export interface OtpVerificationProps {
  /** Title displayed at the top */
  title?: string;
  /** Subtitle / description – the email is interpolated for you */
  subtitle?: string;
  /** The email address to show in the subtitle */
  email: string;
  /** Called when the user submits all 6 digits. Must throw on failure so the component shows the error. */
  onVerify: (otpCode: string) => Promise<void>;
  /** Called when the user taps Resend. Must throw on failure. */
  onResend: () => Promise<void>;
  /** Optional "Wrong email? Edit" link handler */
  onEditEmail?: () => void;
  /** Countdown duration in seconds (default 600 = 10 min) */
  countdownDuration?: number;
  /** If true the countdown starts immediately on mount */
  autoStartCountdown?: boolean;
}

const OtpVerification = forwardRef<OtpVerificationHandle, OtpVerificationProps>(
  (
    {
      title = "Verify your email",
      subtitle,
      email,
      onVerify,
      onResend,
      onEditEmail,
      countdownDuration = 600,
      autoStartCountdown = true,
    },
    ref
  ) => {
    // ── Internal state ────────────────────────────────────
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [countdown, setCountdown] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const otpInputRefs = useRef<(TextInput | null)[]>([]);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Imperative handle ─────────────────────────────────
    useImperativeHandle(ref, () => ({
      reset: (startCountdown = true) => {
        setOtp(["", "", "", "", "", ""]);
        setError("");
        setIsLoading(false);
        if (startCountdown) {
          setCountdown(countdownDuration);
        } else {
          setCountdown(0);
        }
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 300);
      },
      focusFirst: () => {
        otpInputRefs.current[0]?.focus();
      },
    }));

    // ── Auto-start countdown on mount ─────────────────────
    useEffect(() => {
      if (autoStartCountdown) {
        setCountdown(countdownDuration);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 300);
      }
    }, []);

    // ── Countdown timer ───────────────────────────────────
    useEffect(() => {
      if (countdown > 0) {
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
                countdownIntervalRef.current = null;
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      };
    }, [countdown]);

    // ── Verify ────────────────────────────────────────────
    const handleVerify = useCallback(
      async (otpDigits: string[]) => {
        const otpCode = otpDigits.join("");
        if (otpCode.length !== 6) return;

        setIsLoading(true);
        setError("");

        try {
          await onVerify(otpCode);
        } catch (e: any) {
          logger.error("OTP verification failed:", e);
          const msg =
            e?.response?.data?.message ||
            e?.message ||
            "Invalid code. Please try again.";
          setError(msg);
          // Clear inputs on error
          setOtp(["", "", "", "", "", ""]);
          otpInputRefs.current[0]?.focus();
        } finally {
          setIsLoading(false);
        }
      },
      [onVerify]
    );

    // ── OTP input change ──────────────────────────────────
    const handleOtpChange = useCallback(
      (index: number, value: string) => {
        if (value.length <= 1) {
          const newOtp = [...otp];
          newOtp[index] = value;
          setOtp(newOtp);

          // Auto-focus next input
          if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
          }

          // Auto-verify when all 6 digits entered
          if (value && index === 5) {
            const otpCode = newOtp.join("");
            if (otpCode.length === 6) {
              setTimeout(() => {
                handleVerify(newOtp);
              }, 300);
            }
          }
        }
      },
      [otp, handleVerify]
    );

    // ── Backspace navigation ──────────────────────────────
    const handleOtpKeyPress = useCallback(
      (index: number, key: string) => {
        if (key === "Backspace" && !otp[index] && index > 0) {
          otpInputRefs.current[index - 1]?.focus();
        }
      },
      [otp]
    );

    // ── Resend ────────────────────────────────────────────
    const handleResend = useCallback(async () => {
      if (countdown > 0 || isLoading) return;

      setIsLoading(true);
      setError("");

      try {
        await onResend();
        setCountdown(countdownDuration);
        setOtp(["", "", "", "", "", ""]);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } catch (e: any) {
        logger.error("OTP resend failed:", e);
        setError(
          e?.response?.data?.message ||
          e?.message ||
          "Failed to resend OTP. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    }, [countdown, isLoading, onResend, countdownDuration]);

    // ── Render ────────────────────────────────────────────
    const displaySubtitle =
      subtitle || `We sent a 6-digit code to ${email}. Please enter it below.`;

    return (
      <View style={tw`flex-1`}>
        {/* Header */}
        <View style={tw`mb-8`}>
          <BoldText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-2`}>
            {title}
          </BoldText>
          <AppText style={tw`text-neutral-500 dark:text-neutral-400 text-center`}>
            {displaySubtitle}
          </AppText>
        </View>

        {/* OTP Input */}
        <View style={tw`flex-row justify-between mb-4`}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(el) => {
                otpInputRefs.current[index] = el;
              }}
              style={tw`w-12 h-14 border-2 ${digit ? "border-primary-500" : "border-gray-300 dark:border-neutral-700"
                } rounded-xl text-center text-xl font-bold text-gray-900 dark:text-white`}
              value={digit}
              onChangeText={(value) => handleOtpChange(index, value)}
              onKeyPress={({ nativeEvent: { key } }) =>
                handleOtpKeyPress(index, key)
              }
              keyboardType="number-pad"
              maxLength={1}
            />
          ))}
        </View>

        {/* Resend */}
        <View style={tw`flex-row justify-center mb-8`}>
          <AppText style={tw`text-neutral-500 dark:text-neutral-400`}>Didn't get it? </AppText>
          <TouchableOpacity
            onPress={handleResend}
            disabled={countdown > 0 || isLoading}
          >
            <AppText
              weight="bold"
              style={tw`${countdown > 0 || isLoading
                ? "text-gray-400"
                : "text-primary-500"
                } font-bold`}
            >
              Resend
            </AppText>
          </TouchableOpacity>
          {countdown > 0 && (
            <AppText style={tw`text-neutral-500 dark:text-neutral-400`}>
              {" "}
              ({Math.floor(countdown / 60)}:
              {(countdown % 60).toString().padStart(2, "0")})
            </AppText>
          )}
        </View>

        {/* Error Message */}
        {error ? (
          <AppText style={tw`text-red-500 text-sm mb-4 text-center`}>
            {error}
          </AppText>
        ) : null}

        {/* Verify Button */}
        <Button
          onPress={() => handleVerify(otp)}
          style={tw`${otp.every((d) => d) && !isLoading
            ? "bg-primary-500"
            : "bg-gray-300"
            } rounded-full py-4 items-center mb-4`}
          disabled={!otp.every((d) => d) || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <AppText
              weight="bold"
              style={tw`${otp.every((d) => d) ? "text-white" : "text-gray-500"
                } font-semibold text-lg`}
            >
              Verify
            </AppText>
          )}
        </Button>

        {/* Edit Email (optional) */}
        {onEditEmail && (
          <TouchableOpacity onPress={onEditEmail}>
            <AppText style={tw`text-center text-neutral-500 dark:text-neutral-400`}>
              Wrong email? Edit
            </AppText>
          </TouchableOpacity>
        )}
      </View>
    );
  }
);

export default OtpVerification;

