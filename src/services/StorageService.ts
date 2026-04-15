import AsyncStorage from '@react-native-async-storage/async-storage';
import { SwarmMessage } from '../types';

const HISTORY_KEY = '@swarm_history';

export const StorageService = {
  saveMessages: async (messages: SwarmMessage[]) => {
    try {
      const jsonValue = JSON.stringify(messages);
      await AsyncStorage.setItem(HISTORY_KEY, jsonValue);
    } catch (e) {
      console.error('Failed to save history', e);
    }
  },

  loadMessages: async (): Promise<SwarmMessage[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(HISTORY_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : [];
    } catch (e) {
      console.error('Failed to load history', e);
      return [];
    }
  },

  clearHistory: async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.error('Failed to clear history', e);
    }
  }
};