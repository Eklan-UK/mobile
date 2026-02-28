import { AlertButton, AlertOptions } from '@/components/ui/Alert';

// This will be set by the AlertProvider
let alertFunction: ((options: AlertOptions) => void) | null = null;

export const setAlertFunction = (fn: (options: AlertOptions) => void) => {
  alertFunction = fn;
};

// Helper to detect alert type from title/message
const detectAlertType = (title?: string, message?: string): 'info' | 'error' | 'success' | 'warning' => {
  const text = `${title} ${message}`.toLowerCase();
  if (text.includes('error') || text.includes('failed') || text.includes('delete')) {
    return 'error';
  }
  if (text.includes('success') || text.includes('saved') || text.includes('thank')) {
    return 'success';
  }
  if (text.includes('warning') || text.includes('required')) {
    return 'warning';
  }
  return 'info';
};

// Mimics native Alert.alert() API
export const Alert = {
  alert: (title?: string, message?: string, buttons?: AlertButton[]) => {
    if (alertFunction) {
      const type = detectAlertType(title, message);
      alertFunction({
        title,
        message: message || title || '',
        buttons: buttons || [{ text: 'OK' }],
        type,
      });
    } else {
      // Fallback to console if alert is not initialized
      console.warn('Alert not initialized. Title:', title, 'Message:', message);
    }
  },
};

