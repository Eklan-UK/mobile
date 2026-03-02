import { AppText, BoldText, Button } from "@/components/ui";
import tw from "@/lib/tw";
import { router } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { logger } from "@/utils/logger";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop
} from "react-native-svg";

// Close Icon
function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={tw.prefixMatch('dark') ? "#F9FAFB" : "#171717"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Check Icon for button
function CheckIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Notification Illustration based on notification_header.svg
function NotificationIllustration() {
  return (
    <View style={tw`items-center justify-center py-6`}>
      <Svg width={300} height={150} viewBox="0 0 353 176">
        <Defs>
          {/* Background gradient */}
          <LinearGradient
            id="bgGradient"
            x1="0"
            y1="0"
            x2="140.534"
            y2="281.899"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FFF4F4" />
            <Stop offset="0.5" stopColor="#FFF1F1" />
            <Stop offset="1" stopColor="#FDF4FF" />
          </LinearGradient>
          {/* Main bell card gradient */}
          <LinearGradient
            id="bellGradient"
            x1="124.473"
            y1="39.9927"
            x2="220.467"
            y2="135.987"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FDD819" />
            <Stop offset="1" stopColor="#E80505" />
          </LinearGradient>
          {/* Badge gradient */}
          <LinearGradient
            id="badgeGradient"
            x1="196.464"
            y1="31.998"
            x2="228.462"
            y2="63.996"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FB2C36" />
            <Stop offset="1" stopColor="#EC003F" />
          </LinearGradient>
        </Defs>

        {/* Background card */}
        <Path
          d="M0 24C0 10.7452 10.7452 0 24 0H329C342.255 0 353 10.7452 353 24V151.979C353 165.234 342.255 175.979 329 175.979H24C10.7452 175.979 0 165.234 0 151.979V24Z"
          fill="url(#bgGradient)"
        />

        {/* Decorative circles */}
        <Circle
          cx={300.95}
          cy={43.99}
          r={30}
          stroke="#E9D4FF"
          strokeWidth={1.8}
          fill="none"
          opacity={0.4}
        />
        <Circle
          cx={35.99}
          cy={139.99}
          r={22}
          stroke="#DDD6FF"
          strokeWidth={1.8}
          fill="none"
          opacity={0.4}
        />

        {/* Main bell card */}
        <Rect
          x={124.473}
          y={39.99}
          width={95.99}
          height={95.99}
          rx={24}
          fill="url(#bellGradient)"
        />

        {/* Bell icon smile */}
        <Path
          d="M169.001 105.984C169.352 106.592 169.857 107.097 170.465 107.448C171.073 107.799 171.763 107.983 172.465 107.983C173.167 107.983 173.857 107.799 174.465 107.448C175.073 107.097 175.578 106.592 175.929 105.984"
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bell sound waves right */}
        <Path
          d="M192.464 79.9853C192.464 75.3856 190.864 71.3859 188.464 67.9861"
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bell body */}
        <Path
          d="M154.99 94.6364C154.729 94.9228 154.556 95.2789 154.494 95.6614C154.431 96.0439 154.481 96.4364 154.638 96.7911C154.794 97.1458 155.05 97.4474 155.375 97.6592C155.699 97.871 156.078 97.9839 156.466 97.9842H188.464C188.852 97.9844 189.231 97.8719 189.556 97.6604C189.881 97.449 190.137 97.1478 190.294 96.7933C190.45 96.4389 190.501 96.0465 190.439 95.6639C190.377 95.2814 190.205 94.9251 189.944 94.6384C187.284 91.8966 184.464 88.9828 184.464 79.9853C184.464 76.8029 183.2 73.7509 180.95 71.5006C178.699 69.2503 175.647 67.9861 172.465 67.9861C169.283 67.9861 166.231 69.2503 163.98 71.5006C161.73 73.7509 160.466 76.8029 160.466 79.9853C160.466 88.9828 157.644 91.8966 154.99 94.6364Z"
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Bell sound waves left */}
        <Path
          d="M156.466 67.9861C154.066 71.3859 152.466 75.3856 152.466 79.9853"
          stroke="white"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Notification badge with number 3 */}
        <Circle cx={212.463} cy={47.997} r={16} fill="url(#badgeGradient)" />
        <Circle
          cx={212.463}
          cy={47.997}
          r={16}
          stroke="white"
          strokeWidth={3.5}
        />
        <Path
          d="M212.547 52.7289C211.984 52.7289 211.483 52.6323 211.043 52.4392C210.605 52.246 210.257 51.9775 209.999 51.6338C209.743 51.2872 209.604 50.8852 209.581 50.4278H210.655C210.678 50.7091 210.774 50.9519 210.945 51.1565C211.115 51.3582 211.338 51.5144 211.614 51.6252C211.889 51.736 212.195 51.7914 212.53 51.7914C212.905 51.7914 213.237 51.7261 213.527 51.5954C213.817 51.4647 214.044 51.2829 214.209 51.05C214.374 50.817 214.456 50.5471 214.456 50.2403C214.456 49.9193 214.377 49.6366 214.217 49.3923C214.058 49.1451 213.825 48.9519 213.519 48.8127C213.212 48.6735 212.837 48.6039 212.394 48.6039H211.695V47.6664H212.394C212.74 47.6664 213.044 47.6039 213.305 47.4789C213.57 47.3539 213.776 47.1778 213.923 46.9505C214.074 46.7233 214.149 46.4562 214.149 46.1494C214.149 45.8539 214.084 45.5968 213.953 45.3781C213.823 45.1593 213.638 44.9889 213.399 44.8667C213.163 44.7446 212.885 44.6835 212.564 44.6835C212.263 44.6835 211.979 44.7389 211.712 44.8497C211.448 44.9576 211.232 45.1153 211.064 45.3227C210.896 45.5272 210.805 45.7744 210.791 46.0642H209.769C209.786 45.6068 209.923 45.2062 210.182 44.8625C210.44 44.5159 210.778 44.246 211.196 44.0528C211.617 43.8596 212.078 43.763 212.581 43.763C213.121 43.763 213.584 43.8724 213.97 44.0912C214.357 44.3071 214.653 44.5926 214.861 44.9477C215.068 45.3028 215.172 45.6863 215.172 46.0983C215.172 46.5897 215.043 47.0088 214.784 47.3554C214.528 47.7019 214.18 47.942 213.74 48.0755V48.1437C214.291 48.2346 214.722 48.469 215.031 48.8468C215.341 49.2218 215.496 49.6863 215.496 50.2403C215.496 50.7147 215.367 51.1409 215.108 51.5187C214.852 51.8937 214.503 52.1892 214.06 52.4051C213.617 52.621 213.112 52.7289 212.547 52.7289Z"
          fill="white"
        />

        {/* Top left floating card - Orange star */}
        <Rect x={106} y={15.4} width={40.4} height={40.4} rx={8} fill="white" />
        <Path
          d="M125.39 27.8714C125.427 27.6782 125.529 27.5038 125.68 27.3783C125.831 27.2528 126.022 27.1841 126.218 27.1841C126.414 27.1841 126.605 27.2528 126.756 27.3783C126.907 27.5038 127.009 27.6782 127.046 27.8714L127.93 32.5504C127.993 32.8831 128.155 33.189 128.394 33.4284C128.634 33.6678 128.94 33.8295 129.272 33.8923L133.951 34.7771C134.144 34.8132 134.319 34.9157 134.444 35.0668C134.57 35.2179 134.639 35.4082 134.639 35.6047C134.639 35.8011 134.57 35.9914 134.444 36.1425C134.319 36.2937 134.144 36.3961 133.951 36.4322L129.272 37.317C128.94 37.3798 128.634 37.5415 128.394 37.7809C128.155 38.0203 127.993 38.3262 127.93 38.6589L127.046 43.3379C127.009 43.5311 126.907 43.7055 126.756 43.831C126.605 43.9565 126.414 44.0252 126.218 44.0252C126.022 44.0252 125.831 43.9565 125.68 43.831C125.529 43.7055 125.427 43.5311 125.39 43.3379L124.506 38.6589C124.443 38.3262 124.281 38.0203 124.042 37.7809C123.802 37.5415 123.496 37.3798 123.164 37.317L118.485 36.4322C118.292 36.3961 118.117 36.2937 117.992 36.1425C117.866 35.9914 117.797 35.8011 117.797 35.6047C117.797 35.4082 117.866 35.2179 117.992 35.0668C118.117 34.9157 118.292 34.8132 118.485 34.7771L123.164 33.8923C123.496 33.8295 123.802 33.6678 124.042 33.4284C124.281 33.189 124.443 32.8831 124.506 32.5504L125.39 27.8714Z"
          fill="#FE9A00"
        />
        <Path
          d="M132.953 27.186V30.5535"
          stroke="#FE9A00"
          strokeWidth={1.68}
          strokeLinecap="round"
        />
        <Path
          d="M134.637 28.8699H131.269"
          stroke="#FE9A00"
          strokeWidth={1.68}
          strokeLinecap="round"
        />
        <Circle cx={119.483} cy={42.34} r={1.68} fill="#FE9A00" />

        {/* Top right floating card - Green checkmark */}
        <Rect
          x={197.85}
          y={13.43}
          width={41.74}
          height={41.74}
          rx={8}
          fill="white"
        />
        <Circle
          cx={218.71}
          cy={34.3}
          r={8.7}
          stroke="#00BC7D"
          strokeWidth={2.17}
        />
        <Path
          d="M216.103 34.2983L217.842 36.0374L221.32 32.5593"
          stroke="#00BC7D"
          strokeWidth={2.17}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom left floating card - primary bell */}
        <Rect
          x={14.2}
          y={82.12}
          width={43.6}
          height={43.6}
          rx={8}
          fill="white"
        />
        <Path
          d="M34.7323 110.46C34.8599 110.681 35.0434 110.864 35.2643 110.992C35.4853 111.119 35.7359 111.187 35.9911 111.187C36.2462 111.187 36.4968 111.119 36.7178 110.992C36.9387 110.864 37.1222 110.681 37.2498 110.46"
          stroke="#8E51FF"
          strokeWidth={1.82}
          strokeLinecap="round"
        />
        <Path
          d="M43.2585 101.012C43.2585 99.3408 42.6771 97.8873 41.805 96.6519"
          stroke="#8E51FF"
          strokeWidth={1.82}
          strokeLinecap="round"
        />
        <Path
          d="M29.6407 106.336C29.5458 106.441 29.4832 106.57 29.4604 106.709C29.4377 106.848 29.4558 106.991 29.5126 107.119C29.5694 107.248 29.6625 107.358 29.7805 107.435C29.8984 107.512 30.0362 107.553 30.1771 107.553H41.805C41.9459 107.553 42.0837 107.512 42.2017 107.435C42.3198 107.359 42.413 107.249 42.4699 107.12C42.5269 106.991 42.5452 106.849 42.5227 106.71C42.5001 106.571 42.4376 106.441 42.3428 106.337C41.3763 105.341 40.3515 104.282 40.3515 101.012C40.3515 99.8559 39.8921 98.7468 39.0744 97.929C38.2566 97.1113 37.1475 96.6519 35.9911 96.6519C34.8346 96.6519 33.7255 97.1113 32.9077 97.929C32.09 98.7468 31.6306 99.8559 31.6306 101.012C31.6306 104.282 30.6051 105.341 29.6407 106.336Z"
          stroke="#8E51FF"
          strokeWidth={1.82}
          strokeLinecap="round"
        />
        <Path
          d="M30.1771 96.6519C29.305 97.8873 28.7236 99.3408 28.7236 101.012"
          stroke="#8E51FF"
          strokeWidth={1.82}
          strokeLinecap="round"
        />

        {/* Bottom right floating card - Pink star */}
        <Rect
          x={288.17}
          y={85.72}
          width={41.54}
          height={41.54}
          rx={8}
          fill="white"
        />
        <Path
          d="M308.259 100.126C308.288 99.9675 308.373 99.824 308.497 99.7208C308.621 99.6176 308.778 99.561 308.939 99.561C309.101 99.561 309.257 99.6176 309.382 99.7208C309.506 99.824 309.59 99.9675 309.62 100.126L310.348 103.975C310.4 104.249 310.532 104.501 310.729 104.697C310.926 104.894 311.178 105.027 311.452 105.079L315.3 105.807C315.459 105.837 315.603 105.921 315.706 106.045C315.809 106.169 315.866 106.326 315.866 106.488C315.866 106.649 315.809 106.806 315.706 106.93C315.603 107.054 315.459 107.139 315.3 107.168L311.452 107.896C311.178 107.948 310.926 108.081 310.729 108.278C310.532 108.475 310.4 108.726 310.348 109L309.62 112.849C309.59 113.008 309.506 113.151 309.382 113.254C309.257 113.358 309.101 113.414 308.939 113.414C308.778 113.414 308.621 113.358 308.497 113.254C308.373 113.151 308.288 113.008 308.259 112.849L307.531 109C307.479 108.726 307.346 108.475 307.149 108.278C306.952 108.081 306.701 107.948 306.427 107.896L302.578 107.168C302.419 107.139 302.276 107.054 302.173 106.93C302.069 106.806 302.013 106.649 302.013 106.488C302.013 106.326 302.069 106.169 302.173 106.045C302.276 105.921 302.419 105.837 302.578 105.807L306.427 105.079C306.701 105.027 306.952 104.894 307.149 104.697C307.346 104.501 307.479 104.249 307.531 103.975L308.259 100.126Z"
          fill="#F6339A"
        />
        <Path
          d="M314.479 99.5627V102.333"
          stroke="#F6339A"
          strokeWidth={1.38}
          strokeLinecap="round"
        />
        <Path
          d="M315.864 100.948H313.094"
          stroke="#F6339A"
          strokeWidth={1.38}
          strokeLinecap="round"
        />
        <Circle cx={303.4} cy={112.03} r={1.38} fill="#F6339A" />
      </Svg>
    </View>
  );
}

export default function NotificationsPermissionScreen() {
  const handleEnableNotifications = async () => {
    // TODO: Request notification permissions
    logger.log("Enable notifications");
    router.back();
  };

  const handleMaybeLater = () => {
    router.back();
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-cream-100 dark:bg-neutral-900`} edges={["top", "bottom"]}>
      {/* Close Button */}
      <View style={tw`px-6 pt-4 flex-row justify-end`}>
        <TouchableOpacity onPress={handleClose}>
          <CloseIcon />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={tw`flex-1 px-6`}>
        {/* Illustration */}
        <NotificationIllustration />

        {/* Text Content */}
        <View style={tw`mt-8`}>
          <AppText style={tw`text-2xl font-bold text-neutral-900 dark:text-white mb-3`}>
            Stay on track with gentle reminders?
          </AppText>
          <AppText style={tw`text-base text-neutral-600 dark:text-neutral-400 leading-6`}>
            We'll send you thoughtful notifications when it's time to practice
            again. Never miss a moment.
          </AppText>
        </View>

        {/* Spacer */}
        <View style={tw`flex-1`} />

        {/* Action Buttons */}
        <View style={tw`gap-3 pb-4`}>
          <Button onPress={handleEnableNotifications} icon={<CheckIcon />}>
            Yes, remind me
          </Button>

          <TouchableOpacity
            onPress={handleMaybeLater}
            style={tw`py-3 items-center`}
          >
            <AppText style={tw`text-base text-neutral-700 dark:text-neutral-300 font-medium`}>
              Maybe later
            </AppText>
          </TouchableOpacity>

          <AppText style={tw`text-center text-sm text-neutral-400 dark:text-neutral-500`}>
            You can change this anytime in settings
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}
