import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotificationContext = React.createContext({ unreadCount: 0, setUnreadCount: () => {} });

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCountState] = React.useState(0);

  React.useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem('unreadCount');
      const n = v ? parseInt(v, 10) : 0;
      setUnreadCountState(Number.isNaN(n) ? 0 : n);
    })();
  }, []);

  const setUnreadCount = async (val) => {
    setUnreadCountState(val);
    await AsyncStorage.setItem('unreadCount', String(val));
  };

  return (
    <NotificationContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => React.useContext(NotificationContext);


