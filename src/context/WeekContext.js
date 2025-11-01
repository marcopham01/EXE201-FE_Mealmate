import React from 'react';

const WeekContext = React.createContext({ selectedDayIdx: 0, setSelectedDayIdx: () => {} });

export function WeekProvider({ children }) {
  const today = new Date();
  const defaultIdx = (today.getDay() + 6) % 7; // Mon=0..Sun=6
  const [selectedDayIdx, setSelectedDayIdx] = React.useState(defaultIdx);

  // Đồng bộ theo thời gian thực (qua ngày mới)
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const idx = (now.getDay() + 6) % 7;
      setSelectedDayIdx((prev) => (prev !== idx ? idx : prev));
    }, 60 * 1000); // kiểm tra mỗi phút
    return () => clearInterval(timer);
  }, []);

  const value = React.useMemo(() => ({ selectedDayIdx, setSelectedDayIdx }), [selectedDayIdx]);
  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>;
}

export function useWeek() {
  return React.useContext(WeekContext);
}
