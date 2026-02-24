import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkColors, LightColors, ThemeColors } from '../theme/colors';

const THEME_KEY = '@orangemusic_theme';

interface ThemeState {
    isDark: boolean;
    colors: ThemeColors;
    toggleTheme: () => void;
    setDark: (dark: boolean) => void;
    loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: true,
    colors: DarkColors,

    toggleTheme: () =>
        set((state) => {
            const newDark = !state.isDark;
            AsyncStorage.setItem(THEME_KEY, JSON.stringify({ isDark: newDark })).catch(() => { });
            return {
                isDark: newDark,
                colors: newDark ? DarkColors : LightColors,
            };
        }),

    setDark: (dark) => {
        AsyncStorage.setItem(THEME_KEY, JSON.stringify({ isDark: dark })).catch(() => { });
        set({ isDark: dark, colors: dark ? DarkColors : LightColors });
    },

    loadTheme: async () => {
        try {
            const data = await AsyncStorage.getItem(THEME_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                const isDark = parsed.isDark !== false;
                set({ isDark, colors: isDark ? DarkColors : LightColors });
            }
        } catch (error) {
            console.error('Failed to load theme:', error);
        }
    },
}));

export const useTheme = () => useThemeStore((s) => s.colors);
export const useIsDark = () => useThemeStore((s) => s.isDark);
