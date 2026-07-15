import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  getString: async (key: string): Promise<string | null> => {
    return await AsyncStorage.getItem(key);
  },
  set: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
  getObject: async <T = any>(key: string): Promise<T | null> => {
    const val = await AsyncStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  },
  setObject: async (key: string, obj: any): Promise<void> => {
    await AsyncStorage.setItem(key, JSON.stringify(obj));
  },
};