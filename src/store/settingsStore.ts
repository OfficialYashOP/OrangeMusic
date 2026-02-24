import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@orangemusic_settings';

export type AudioQuality = '96kbps' | '160kbps' | '320kbps';

export interface SettingsState {
    audioQuality: AudioQuality;
    downloadQuality: AudioQuality;
    sleepTimerMinutes: number | null;
    sleepTimerEndTime: number | null;
    isLoaded: boolean;

    loadSettings: () => Promise<void>;
    setAudioQuality: (q: AudioQuality) => Promise<void>;
    setDownloadQuality: (q: AudioQuality) => Promise<void>;
    setSleepTimer: (minutes: number | null) => void;
    clearSleepTimer: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    audioQuality: '320kbps',
    downloadQuality: '320kbps',
    sleepTimerMinutes: null,
    sleepTimerEndTime: null,
    isLoaded: false,

    loadSettings: async () => {
        try {
            const data = await AsyncStorage.getItem(SETTINGS_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                set({
                    audioQuality: parsed.audioQuality || '320kbps',
                    downloadQuality: parsed.downloadQuality || '320kbps',
                    isLoaded: true,
                });
            } else {
                set({ isLoaded: true });
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
            set({ isLoaded: true });
        }
    },

    setAudioQuality: async (q) => {
        set({ audioQuality: q });
        try {
            const { downloadQuality } = get();
            await AsyncStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify({ audioQuality: q, downloadQuality })
            );
        } catch (_) { }
    },

    setDownloadQuality: async (q) => {
        set({ downloadQuality: q });
        try {
            const { audioQuality } = get();
            await AsyncStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify({ audioQuality, downloadQuality: q })
            );
        } catch (_) { }
    },

    setSleepTimer: (minutes) => {
        if (minutes === null) {
            set({ sleepTimerMinutes: null, sleepTimerEndTime: null });
            return;
        }
        set({
            sleepTimerMinutes: minutes,
            sleepTimerEndTime: Date.now() + minutes * 60 * 1000,
        });
    },

    clearSleepTimer: () => {
        set({ sleepTimerMinutes: null, sleepTimerEndTime: null });
    },
}));
