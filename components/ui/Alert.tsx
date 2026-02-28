import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button } from './';
import tw from '@/lib/tw';
import { Ionicons } from '@expo/vector-icons';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title?: string;
  message: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
  type?: 'info' | 'error' | 'success' | 'warning';
}

interface AlertProps {
  visible: boolean;
  title?: string;
  message: string;
  buttons?: AlertButton[];
  onDismiss: () => void;
  cancelable?: boolean;
  type?: 'info' | 'error' | 'success' | 'warning';
}

export const Alert: React.FC<AlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onDismiss,
  cancelable = true,
  type = 'info',
}) => {
  const getIconConfig = () => {
    switch (type) {
      case 'error':
        return { name: 'close-circle' as const, color: '#EF4444', bgColor: '#FEE2E2' };
      case 'success':
        return { name: 'checkmark-circle' as const, color: '#10B981', bgColor: '#D1FAE5' };
      case 'warning':
        return { name: 'warning' as const, color: '#F59E0B', bgColor: '#FEF3C7' };
      default:
        return { name: 'information-circle' as const, color: '#3B82F6', bgColor: '#DBEAFE' };
    }
  };

  const iconConfig = getIconConfig();
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    onDismiss();
  };

  const handleBackdropPress = () => {
    if (cancelable) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancelable ? onDismiss : undefined}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleBackdropPress}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.container}
        >
          <SafeAreaView edges={['bottom']} style={styles.content}>
            {/* Icon */}
            <View style={[tw`w-16 h-16 rounded-full items-center justify-center mb-4`, { backgroundColor: iconConfig.bgColor }]}>
              <Ionicons name={iconConfig.name} size={32} color={iconConfig.color} />
            </View>

            {/* Title */}
            {title && (
              <AppText style={tw`text-xl font-bold text-gray-900 mb-2 text-center`}>
                {title}
              </AppText>
            )}

            {/* Message */}
            <AppText style={tw`text-base text-gray-700 mb-6 text-center leading-6`}>
              {message}
            </AppText>

            {/* Buttons */}
            <View style={tw`w-full gap-3`}>
              {buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const isPrimary = !isDestructive && !isCancel && index === buttons.length - 1;

                return (
                  <Button
                    key={index}
                    variant={isDestructive ? 'destructive' : isPrimary ? 'primary' : isCancel ? 'secondary' : 'outline'}
                    size="lg"
                    fullWidth
                    onPress={() => handleButtonPress(button)}
                  >
                    {button.text}
                  </Button>
                );
              })}
            </View>
          </SafeAreaView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
});

