import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { View, StyleSheet } from 'react-native';
import { NotificationToast, NotificationToastProps } from '@/components/ui/NotificationToast';

interface ToastEntry extends NotificationToastProps {
  id: number;
}

interface NotificationToastContextValue {
  showToast: (opts: Omit<NotificationToastProps, 'onDismiss'>) => void;
}

const NotificationToastContext = createContext<NotificationToastContextValue>({
  showToast: () => {},
});

export const NotificationToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((opts: Omit<NotificationToastProps, 'onDismiss'>) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render toasts in a portal-like overlay */}
      <View style={styles.overlay} pointerEvents="box-none">
        {toasts.map((toast) => (
          <NotificationToast
            key={toast.id}
            title={toast.title}
            body={toast.body}
            variant={toast.variant}
            duration={toast.duration}
            emoji={toast.emoji}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </View>
    </NotificationToastContext.Provider>
  );
};

/**
 * Hook to imperatively show an in-app notification toast.
 *
 * @example
 * const { showToast } = useNotificationToast();
 * showToast({ title: 'Subscription updated', body: 'You are now on the Pro plan 🎉', variant: 'dark' });
 */
export const useNotificationToast = () => useContext(NotificationToastContext);

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});
