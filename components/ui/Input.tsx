import { AppText } from "./AppText";
import tw from "@/lib/tw";
import React, { useState } from "react";
import {
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View
} from "react-native";
import { Fonts } from "@/constants/fonts";

type InputVariant = "default" | "outline" | "filled" | "ghost";
type InputSize = "sm" | "md" | "lg";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;

  /** Icons */
  icon?: React.ReactNode; // left icon
  secondaryIcon?: React.ReactNode; // right icon (e.g eye)

  /** Styles */
  variant?: InputVariant;
  size?: InputSize;
  containerStyle?: any;
}

const variantStyles: Record<
  InputVariant,
  { container: string; input: string }
> = {
  default: {
    container: "bg-neutral-50 border border-neutral-200",
    input: "text-neutral-900",
  },
  outline: {
    // Border colour applied dynamically based on focus state below
    container: "bg-transparent border",
    input: "text-neutral-900",
  },
  filled: {
    container: "bg-neutral-100 border border-transparent",
    input: "text-neutral-900",
  },
  ghost: {
    container: "bg-transparent border-b border-neutral-300 rounded-none",
    input: "text-neutral-900",
  },
};

const sizeStyles: Record<InputSize, { container: string; text: string }> = {
  sm: {
    container: "px-3 py-1 rounded-xl",
    text: "text-sm",
  },
  md: {
    container: "px-4 py-3.5 rounded-xl",
    text: "text-base",
  },
  lg: {
    container: "px-5 py-4 rounded-2xl",
    text: "text-lg",
  },
};

export function Input({
  label,
  error,
  icon,
  secondaryIcon,
  variant = "default",
  size = "md",
  secureTextEntry,
  style,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const isPassword = secureTextEntry === true;

  // Border priority: error > focused (primary-500) > default (neutral-200)
  const borderColorClass = error
    ? "border-error"
    : variant === "outline"
    ? isFocused
      ? "border-primary-500"
      : "border-neutral-200"
    : "";

  return (
    <View style={containerStyle}>
      {label && (
        <AppText weight="medium" style={tw`text-neutral-500 text-sm mb-2`}>
          {label}
        </AppText>
      )}

      <View
        style={tw`
          flex-row items-center
          ${variantStyle.container}
          ${sizeStyle.container}
          ${borderColorClass}
        `}
      >
        {/* Left Icon */}
        {icon && <View style={tw`mr-3`}>{icon}</View>}

        {/* Input */}
        <TextInput
          style={[
            tw`
              flex-1
              ${variantStyle.input}
              ${sizeStyle.text}
            `,
            { fontFamily: Fonts.satoshi.regular },
            style,
          ]}
          placeholderTextColor="#a3a3a3"
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={(e) => { setIsFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setIsFocused(false); onBlur?.(e); }}
          {...props}
        />

        {/* Right Icon (Eye / Action) */}
        {(secondaryIcon || isPassword) && (
          <TouchableOpacity
            onPress={() => {
              if (isPassword) {
                setIsPasswordVisible((prev) => !prev);
              }
            }}
            activeOpacity={0.7}
            style={tw`ml-3`}
          >
            {secondaryIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <AppText style={tw`text-error text-sm mt-1`}>
          {error}
        </AppText>
      )}
    </View>
  );
}
