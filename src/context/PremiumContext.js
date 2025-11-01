import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PremiumContext = React.createContext({ premiumActive: false, setPremiumActive: () => {} });

export function PremiumProvider({ children }) {
  const [premiumActive, setPremiumActiveState] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem('premiumActive');
      setPremiumActiveState(v === 'true');
    })();
  }, []);

  const setPremiumActive = async (val) => {
    setPremiumActiveState(val);
    await AsyncStorage.setItem('premiumActive', val ? 'true' : 'false');
  };

  return (
    <PremiumContext.Provider value={{ premiumActive, setPremiumActive }}>
      {children}
    </PremiumContext.Provider>
  );
}

export const usePremium = () => React.useContext(PremiumContext);
