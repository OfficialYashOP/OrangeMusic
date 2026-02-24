import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
    token: string | null;
    user: { email: string; role: string } | null;
    isLoading: boolean;
    login: (token: string, user: { email: string; role: string }) => Promise<void>;
    logout: () => Promise<void>;
    loadAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: null,
    user: null,
    isLoading: true, // true until AsyncStorage is read

    login: async (token, user) => {
        await AsyncStorage.setItem('auth_token', token);
        await AsyncStorage.setItem('auth_user', JSON.stringify(user));
        set({ token, user });
    },

    logout: async () => {
        await AsyncStorage.removeItem('auth_token');
        await AsyncStorage.removeItem('auth_user');
        set({ token: null, user: null });
    },

    loadAuth: async () => {
        try {
            const token = await AsyncStorage.getItem('auth_token');
            const userStr = await AsyncStorage.getItem('auth_user');
            if (token && userStr) {
                set({ token, user: JSON.parse(userStr), isLoading: false });
            } else {
                set({ token: null, user: null, isLoading: false });
            }
        } catch (e) {
            set({ token: null, user: null, isLoading: false });
        }
    }
}));
