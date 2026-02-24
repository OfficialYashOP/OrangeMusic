import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, Platform } from 'react-native';
import { Song } from '../types/song';

const showToast = (message: string) => {
    if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
    }
};

const PLAYLISTS_KEY = '@orangemusic_playlists';

export interface Playlist {
    id: string;
    name: string;
    songs: Song[];
    createdAt: number;
}

export interface PlaylistState {
    playlists: Playlist[];
    isLoaded: boolean;

    loadPlaylists: () => Promise<void>;
    createPlaylist: (name: string) => Promise<Playlist>;
    deletePlaylist: (id: string) => Promise<void>;
    renamePlaylist: (id: string, name: string) => Promise<void>;
    addSongToPlaylist: (playlistId: string, song: Song) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
    isSongInPlaylist: (playlistId: string, songId: string) => boolean;
}

const savePlaylists = async (playlists: Playlist[]) => {
    try {
        await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch (_) { }
};

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
    playlists: [],
    isLoaded: false,

    loadPlaylists: async () => {
        try {
            const data = await AsyncStorage.getItem(PLAYLISTS_KEY);
            if (data) {
                set({ playlists: JSON.parse(data), isLoaded: true });
            } else {
                set({ isLoaded: true });
            }
        } catch (_) {
            set({ isLoaded: true });
        }
    },

    createPlaylist: async (name) => {
        const newPlaylist: Playlist = {
            id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name,
            songs: [],
            createdAt: Date.now(),
        };
        const updated = [newPlaylist, ...get().playlists];
        set({ playlists: updated });
        await savePlaylists(updated);
        return newPlaylist;
    },

    deletePlaylist: async (id) => {
        const updated = get().playlists.filter((p) => p.id !== id);
        set({ playlists: updated });
        await savePlaylists(updated);
    },

    renamePlaylist: async (id, name) => {
        const updated = get().playlists.map((p) =>
            p.id === id ? { ...p, name } : p
        );
        set({ playlists: updated });
        await savePlaylists(updated);
    },

    addSongToPlaylist: async (playlistId, song) => {
        let added = false;
        let pName = '';
        const updated = get().playlists.map((p) => {
            if (p.id !== playlistId) return p;
            if (p.songs.some((s) => s.id === song.id)) return p;
            added = true;
            pName = p.name;
            return { ...p, songs: [...p.songs, song] };
        });
        if (added) {
            set({ playlists: updated });
            await savePlaylists(updated);
            showToast(`Added to ${pName}`);
        } else {
            showToast('Already in playlist');
        }
    },

    removeSongFromPlaylist: async (playlistId, songId) => {
        const updated = get().playlists.map((p) => {
            if (p.id !== playlistId) return p;
            return { ...p, songs: p.songs.filter((s) => s.id !== songId) };
        });
        set({ playlists: updated });
        await savePlaylists(updated);
    },

    isSongInPlaylist: (playlistId, songId) => {
        const playlist = get().playlists.find((p) => p.id === playlistId);
        return playlist ? playlist.songs.some((s) => s.id === songId) : false;
    },
}));
