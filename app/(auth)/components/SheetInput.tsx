import { AppText } from "@/components/ui";
import tw from "@/lib/tw";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import React, { useState } from "react";
import {
  TextInputProps,
  TouchableOpacity,
  View
} from "react-native";
import EyeOpen from '@/assets/icons/eye-open.svg';
import EyeClosed from '@/assets/icons/eye-closed.svg';

type InputVariant = "default" | "outline" | "filled" | "ghost";
type InputSize = "sm" | "md" | "lg";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  secondaryIcon?: React.ReactNode;
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
    container: "bg-transparent  border border-primary-500 ",
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

export function SheetInput({
  label,
  error,
  icon,
  secondaryIcon,
  variant = "default",
  size = "md",
  secureTextEntry,
  style,
  containerStyle,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const isPassword = secureTextEntry === true;

  return (
    <View style={containerStyle}>
      {label && (
        <AppText style={tw`text-neutral-500 text-sm mb-2`}>
          {label}
        </AppText>
      )}

      <View
        style={tw`
          flex-row items-center
          ${variantStyle.container}
          ${sizeStyle.container}
          ${error ? "border-error" : ""}
        `}
      >
        {/* Left Icon */}
        {icon && <View style={tw`mr-3`}>{icon}</View>}

        {/* Input */}
        <BottomSheetTextInput
          style={[
            tw`
              flex-1
              ${variantStyle.input}
              ${sizeStyle.text}
            `,
            style,
          ]}
          placeholderTextColor="#a3a3a3"
          secureTextEntry={isPassword && !isPasswordVisible}
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
            {isPassword ? (
              // Show eye-open when password is hidden, eye-closed when visible
              isPasswordVisible ? (
                <EyeClosed width={20} height={20} />
              ) : (
                <EyeOpen width={20} height={20} />
              )
            ) : (
              secondaryIcon
            )}
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
