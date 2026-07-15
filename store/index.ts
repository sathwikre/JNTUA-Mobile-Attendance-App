import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Consider splitting into `store/attendanceStore.ts` for better separation of concerns.

interface Subject {
  subject: string;
  code: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  records: Array<{ date: string; status: string }>;
  error?: string;
}

interface Overall {
  totalDays: number;
  totalPresent: number;
  overallPercent: number;
}

interface AttendanceData {
  type: string;
  semester: string;
  subjects: Subject[];
  overall: Overall;
}

interface AttendanceState {
  data: AttendanceData | null;
  setData: (data: AttendanceData) => void;
  clearData: () => void;
}

// Debug logging for Zustand store
const storeLogger = (config) => (set, get, api) =>
  config((...args) => {
    console.log('Zustand store action:', args);
    set(...args);
  }, get, api);

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    storeLogger((set) => ({
      data: null,
      setData: (data) => {
        console.log('Zustand: Setting attendance data:', data);
        set({ data });
      },
      clearData: () => {
        console.log('Zustand: Clearing attendance data');
        set({ data: null });
      },
    })),
    {
      name: 'attendance-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);