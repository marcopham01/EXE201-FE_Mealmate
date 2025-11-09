import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationContext = React.createContext({ 
  unreadCount: 0, 
  setUnreadCount: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
});

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCountState] = React.useState(0);
  const [notificationsEnabled, setNotificationsEnabledState] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem('unreadCount');
      const n = v ? parseInt(v, 10) : 0;
      setUnreadCountState(Number.isNaN(n) ? 0 : n);
      const en = await AsyncStorage.getItem('notificationsEnabled');
      if (en === 'false') {
        setNotificationsEnabledState(false);
      } else {
        setNotificationsEnabledState(true);
      }
    })();
  }, []);

  const setUnreadCount = async (val) => {
    setUnreadCountState(val);
    await AsyncStorage.setItem('unreadCount', String(val));
  };
  const setNotificationsEnabled = async (val) => {
    setNotificationsEnabledState(!!val);
    await AsyncStorage.setItem('notificationsEnabled', val ? 'true' : 'false');
    if (!val) {
      // Nếu tắt thông báo, ẩn badge
      setUnreadCountState(0);
      await AsyncStorage.setItem('unreadCount', '0');
    }
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount, notificationsEnabled, setNotificationsEnabled }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => React.useContext(NotificationContext);


