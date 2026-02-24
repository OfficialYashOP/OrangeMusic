import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, Platform } from 'react-native';
import { Song } from '../types/song';

const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    }
};

const FAVORITES_KEY = '@orangemusic_favorites';
const DOWNLOADS_KEY = '@orangemusic_downloads';
const RECENT_SEARCHES_KEY = '@orangemusic_recent_searches';

export interface LibraryState {
    favorites: Song[];
    downloads: Song[];
    recentSearches: string[];
    isLoaded: boolean;

    loadFavorites: () => Promise<void>;
    addFavorite: (song: Song) => Promise<void>;
    removeFavorite: (songId: string) => Promise<void>;
    isFavorite: (songId: string) => boolean;
    toggleFavorite: (song: Song) => Promise<void>;

    loadDownloads: () => Promise<void>;
    addDownload: (song: Song) => Promise<void>;
    removeDownload: (songId: string) => Promise<void>;
    isDownloaded: (songId: string) => boolean;
    clearDownloads: () => Promise<void>;

    loadRecentSearches: () => Promise<void>;
    addRecentSearch: (query: string) => Promise<void>;
    removeRecentSearch: (query: string) => Promise<void>;
    clearRecentSearches: () => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
    favorites: [],
    downloads: [],
    recentSearches: [],
    isLoaded: false,

    loadFavorites: async () => {
        try {
            const data = await AsyncStorage.getItem(FAVORITES_KEY);
            if (data) {
                set({ favorites: JSON.parse(data), isLoaded: true });
            } else {
                set({ isLoaded: true });
            }
        } catch (error) {
            console.error('Failed to load favorites:', error);
            set({ isLoaded: true });
        }
    },

    addFavorite: async (song) => {
        const { favorites } = get();
        if (favorites.some((s) => s.id === song.id)) return;
        const updated = [song, ...favorites];
        set({ favorites: updated });
        try {
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            showToast('Added to Favorites');
        } catch (error) {
            console.error('Failed to save favorite:', error);
        }
    },

    removeFavorite: async (songId) => {
        const { favorites } = get();
        const updated = favorites.filter((s) => s.id !== songId);
        set({ favorites: updated });
        try {
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
            showToast('Removed from Favorites');
        } catch (error) {
            console.error('Failed to remove favorite:', error);
        }
    },

    isFavorite: (songId) => {
        return get().favorites.some((s) => s.id === songId);
    },

    toggleFavorite: async (song) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(song.id)) {
            await removeFavorite(song.id);
        } else {
            await addFavorite(song);
        }
    },

    // Downloads
    loadDownloads: async () => {
        try {
            const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
            if (data) {
                set({ downloads: JSON.parse(data) });
            }
        } catch (error) {
            console.error('Failed to load downloads:', error);
        }
    },

    addDownload: async (song) => {
        const { downloads } = get();
        if (downloads.some((s) => s.id === song.id)) return;
        const updated = [song, ...downloads];
        set({ downloads: updated });
        try {
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to save download:', error);
        }
    },

    removeDownload: async (songId) => {
        const { downloads } = get();
        const updated = downloads.filter((s) => s.id !== songId);
        set({ downloads: updated });
        try {
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error('Failed to remove download:', error);
        }
    },

    isDownloaded: (songId) => {
        return get().downloads.some((s) => s.id === songId);
    },

    clearDownloads: async () => {
        set({ downloads: [] });
        try {
            await AsyncStorage.removeItem(DOWNLOADS_KEY);
        } catch (_) { }
    },

    // Recent Searches
    loadRecentSearches: async () => {
        try {
            const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (data) {
                set({ recentSearches: JSON.parse(data) });
            }
        } catch (error) {
            console.error('Failed to load recent searches:', error);
        }
    },

    addRecentSearch: async (query) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        const { recentSearches } = get();
        const cleaned = recentSearches.filter(
            (i) => i.toLowerCase() !== trimmed.toLowerCase()
        );
        const updated = [trimmed, ...cleaned].slice(0, 15);
        set({ recentSearches: updated });
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (_) { }
    },

    removeRecentSearch: async (query) => {
        const { recentSearches } = get();
        const updated = recentSearches.filter((t) => t !== query);
        set({ recentSearches: updated });
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
        } catch (_) { }
    },

    clearRecentSearches: async () => {
        set({ recentSearches: [] });
        try {
            await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (_) { }
    },
}));
