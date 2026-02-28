import React from "react";
import { TouchableOpacity, Text, View, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ChevronRightIcon from "@/assets/icons/chevron-double-right.svg";
import tw from "@/lib/tw";

interface CallToActionCardProps {
    // Text content
    title: string;
    subtitle?: string;

    // Icon
    icon?: React.ReactNode
    iconBackgroundColor?: string;

    // Styling
    backgroundColor?: string;
    gradientColors?: string[]; // Array of colors for gradient [from, to]
    gradientAngle?: number; // Gradient angle in degrees (0 = left to right, 90 = top to bottom)
    titleColor?: string;
    subtitleColor?: string;
    customStyle?: ViewStyle;
    customTitleStyle?: TextStyle;
    customSubtitleStyle?: TextStyle;

    // Arrow
    showArrow?: boolean;
    arrowColor?: string;

    // Action
    onPress?: () => void;
    disabled?: boolean;
}

export default function CallToActionCard({
    title,
    subtitle,
    icon = "call",
    iconBackgroundColor,
    backgroundColor = "#00BCD4",
    gradientColors,
    gradientAngle = 0, // Default: left to right (0 degrees)
    titleColor = "#FFFFFF",
    subtitleColor = "#E0F7FA",
    customStyle,
    customTitleStyle,
    customSubtitleStyle,
    showArrow = true,
    arrowColor = "#FFFFFF",
    onPress,
    disabled = false,
}: CallToActionCardProps) {
    // Use gradient if provided, otherwise use solid color
    const hasGradient = gradientColors && gradientColors.length >= 2;
    const gradientFrom = gradientColors?.[0] || backgroundColor;
    const gradientTo = gradientColors?.[1] || backgroundColor;

    // Convert angle in degrees to LinearGradient start/end coordinates
    // 0° = left to right, 90° = top to bottom, 180° = right to left, 270° = bottom to top
    const angleRad = (gradientAngle * Math.PI) / 180;
    const startX = 0.5 - 0.5 * Math.cos(angleRad);
    const startY = 0.5 - 0.5 * Math.sin(angleRad);
    const endX = 0.5 + 0.5 * Math.cos(angleRad);
    const endY = 0.5 + 0.5 * Math.sin(angleRad);

    const content = (
        <View
            style={[
                tw`rounded-3xl px-5 py-4 flex-row items-center`,
                customStyle,
            ]}
        >
            {/* Icon Container */}
            <View
                style={[
                    tw`w-14 h-14 rounded-2xl items-center justify-center mr-4`,
                    { backgroundColor: iconBackgroundColor },
                ]}
            >
                {icon}
            </View>

            {/* Text Content */}
            <View style={tw`flex-1`}>
                <Text
                    style={[
                        tw`text-lg font-semibold mb-0.5`,
                        { color: titleColor },
                        customTitleStyle,
                    ]}
                >
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        style={[
                            tw`text-sm`,
                            { color: subtitleColor },
                            customSubtitleStyle,
                        ]}
                    >
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* Arrow Icon */}
            {showArrow && (
                <View style={tw`ml-2`}>
                    <ChevronRightIcon />
                </View>
            )}
        </View>
    );

    if (hasGradient) {
        return (
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || !onPress}
                activeOpacity={0.8}
                style={tw`rounded-3xl overflow-hidden`}
            >
                <LinearGradient
                    colors={[gradientFrom, gradientTo]}
                    start={{ x: startX, y: startY }}
                    end={{ x: endX, y: endY }}
                    style={tw`rounded-3xl`}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || !onPress}
            activeOpacity={0.8}
            style={[
                tw`rounded-3xl`,
                { backgroundColor },
                customStyle,
            ]}
        >
            {content}
        </TouchableOpacity>
    );
}
