import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Song } from '../types/song';

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;

const ensureDirExists = async () => {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
};

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
    downloads: (Song & { localUri?: string })[];
    recentSearches: string[];
    smartMix: Song[];
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

    // AI
    setSmartMix: (songs: Song[]) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
    favorites: [],
    downloads: [],
    recentSearches: [],
    smartMix: [],
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

        showToast(`Downloading "${song.name}"...`);

        try {
            await ensureDirExists();
            const fileName = `${song.id}.mp3`;
            const fileUri = `${DOWNLOAD_DIR}${fileName}`;

            // Get the best URL available
            const downloadUrl = song.downloadUrl[song.downloadUrl.length - 1].url;

            const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);

            if (downloadRes.status === 200) {
                const updatedSong = { ...song, localUri: downloadRes.uri };
                const updated = [updatedSong, ...downloads];
                set({ downloads: updated });
                await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
                showToast('Download complete!');
            } else {
                showToast('Download failed');
            }
        } catch (error) {
            console.error('Download error:', error);
            showToast('Download error');
        }
    },

    removeDownload: async (songId) => {
        const { downloads } = get();
        const songToRemove = downloads.find(s => s.id === songId);
        const updated = downloads.filter((s) => s.id !== songId);
        set({ downloads: updated });
        try {
            if (songToRemove?.localUri) {
                await FileSystem.deleteAsync(songToRemove.localUri, { idempotent: true });
            }
            await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(updated));
            showToast('Deleted from device');
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
            await FileSystem.deleteAsync(DOWNLOAD_DIR, { idempotent: true });
            await AsyncStorage.removeItem(DOWNLOADS_KEY);
            showToast('All downloads cleared');
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

    setSmartMix: (songs) => set({ smartMix: songs }),
}));
