import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Alert as AlertComponent, AlertButton, AlertOptions } from '@/components/ui/Alert';
import { setAlertFunction } from '@/utils/alert';

interface AlertContextType {
  alert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title?: string;
    message: string;
    buttons?: AlertButton[];
    cancelable?: boolean;
    type?: 'info' | 'error' | 'success' | 'warning';
  }>({
    visible: false,
    message: '',
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      visible: true,
      title: options.title,
      message: options.message,
      buttons: options.buttons || [{ text: 'OK' }],
      cancelable: options.cancelable !== false,
      type: options.type || 'info',
    });
  }, []);

  // Initialize the global alert function
  useEffect(() => {
    setAlertFunction((options: AlertOptions) => {
      showAlert(options);
    });
  }, [showAlert]);

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ alert: showAlert }}>
      {children}
      <AlertComponent
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onDismiss={hideAlert}
        cancelable={alertState.cancelable}
        type={alertState.type}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

// Helper function to match native Alert.alert() API
export const createAlert = (alertFn: (options: AlertOptions) => void) => {
  return {
    alert: (title?: string, message?: string, buttons?: AlertButton[]) => {
      alertFn({
        title,
        message: message || title || '',
        buttons: buttons || [{ text: 'OK' }],
      });
    },
  };
};

