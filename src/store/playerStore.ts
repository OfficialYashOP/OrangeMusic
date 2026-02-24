import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song } from '../types/song';

const QUEUE_KEY = '@orangemusic_queue';

export interface PlayerState {
    // Current playback
    currentSong: Song | null;
    queue: Song[];
    queueIndex: number;
    isPlaying: boolean;
    position: number; // in milliseconds
    duration: number; // in milliseconds
    volume: number; // 0 to 1
    isLoading: boolean;

    // Bonus features
    shuffleEnabled: boolean;
    repeatMode: 'off' | 'all' | 'one';

    // Actions
    setCurrentSong: (song: Song) => void;
    setQueue: (songs: Song[], startIndex?: number) => void;
    addToQueue: (song: Song) => void;
    removeFromQueue: (index: number) => void;
    reorderQueue: (fromIndex: number, toIndex: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setPosition: (pos: number) => void;
    setDuration: (dur: number) => void;
    setVolume: (vol: number) => void;
    setIsLoading: (loading: boolean) => void;
    playNext: () => Song | null;
    playPrevious: () => Song | null;
    playAtIndex: (index: number) => Song | null;
    toggleShuffle: () => void;
    toggleRepeat: () => void;
    clearPlayer: () => void;
    loadQueue: () => Promise<void>;
}

const persistQueue = (queue: Song[], queueIndex: number, currentSong: Song | null) => {
    AsyncStorage.setItem(
        QUEUE_KEY,
        JSON.stringify({ queue, queueIndex, currentSong })
    ).catch(() => { });
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
    currentSong: null,
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    position: 0,
    duration: 0,
    volume: 1,
    isLoading: false,
    shuffleEnabled: false,
    repeatMode: 'off',

    setCurrentSong: (song) => {
        const { queue } = get();
        const index = queue.findIndex((s) => s.id === song.id);
        set({
            currentSong: song,
            queueIndex: index >= 0 ? index : -1,
            position: 0,
            duration: (song.duration || 0) * 1000,
        });
        persistQueue(queue, index >= 0 ? index : -1, song);
    },

    setQueue: (songs, startIndex = 0) => {
        const currentSong = songs[startIndex] || null;
        set({
            queue: songs,
            queueIndex: startIndex,
            currentSong,
            position: 0,
        });
        persistQueue(songs, startIndex, currentSong);
    },

    addToQueue: (song) => {
        const newQueue = [...get().queue, song];
        set({ queue: newQueue });
        persistQueue(newQueue, get().queueIndex, get().currentSong);
    },

    removeFromQueue: (index) => {
        const { queue, queueIndex, currentSong } = get();
        if (index < 0 || index >= queue.length) return;

        const newQueue = queue.filter((_, i) => i !== index);
        let newIndex = queueIndex;
        if (index < queueIndex) {
            newIndex = queueIndex - 1;
        } else if (index === queueIndex) {
            // Removing currently playing song — stay at same index
            newIndex = Math.min(queueIndex, newQueue.length - 1);
        }

        const newCurrentSong = newQueue[newIndex] || null;
        set({
            queue: newQueue,
            queueIndex: newIndex,
            currentSong: index === queueIndex ? newCurrentSong : currentSong,
        });
        persistQueue(newQueue, newIndex, index === queueIndex ? newCurrentSong : currentSong);
    },

    reorderQueue: (fromIndex, toIndex) => {
        const { queue, queueIndex, currentSong } = get();
        if (fromIndex < 0 || fromIndex >= queue.length) return;
        if (toIndex < 0 || toIndex >= queue.length) return;

        const newQueue = [...queue];
        const [moved] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, moved);

        // Recalculate currentSong index
        let newIndex = queueIndex;
        if (fromIndex === queueIndex) {
            newIndex = toIndex;
        } else if (fromIndex < queueIndex && toIndex >= queueIndex) {
            newIndex = queueIndex - 1;
        } else if (fromIndex > queueIndex && toIndex <= queueIndex) {
            newIndex = queueIndex + 1;
        }

        set({ queue: newQueue, queueIndex: newIndex });
        persistQueue(newQueue, newIndex, currentSong);
    },

    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setPosition: (pos) => set({ position: pos }),
    setDuration: (dur) => set({ duration: dur }),
    setVolume: (vol) => set({ volume: vol }),
    setIsLoading: (loading) => set({ isLoading: loading }),

    playNext: () => {
        const { queue, queueIndex, repeatMode, shuffleEnabled } = get();
        if (queue.length === 0) return null;

        let nextIndex: number;

        if (repeatMode === 'one') {
            nextIndex = queueIndex;
        } else if (shuffleEnabled) {
            nextIndex = Math.floor(Math.random() * queue.length);
        } else {
            nextIndex = queueIndex + 1;
            if (nextIndex >= queue.length) {
                if (repeatMode === 'all') {
                    nextIndex = 0;
                } else {
                    return null;
                }
            }
        }

        const nextSong = queue[nextIndex];
        set({
            currentSong: nextSong,
            queueIndex: nextIndex,
            position: 0,
            duration: (nextSong.duration || 0) * 1000,
        });
        persistQueue(queue, nextIndex, nextSong);
        return nextSong;
    },

    playPrevious: () => {
        const { queue, queueIndex, position } = get();
        if (queue.length === 0) return null;

        // If more than 3 seconds in, restart the song
        if (position > 3000) {
            set({ position: 0 });
            return get().currentSong;
        }

        let prevIndex = queueIndex - 1;
        if (prevIndex < 0) prevIndex = queue.length - 1;

        const prevSong = queue[prevIndex];
        set({
            currentSong: prevSong,
            queueIndex: prevIndex,
            position: 0,
            duration: (prevSong.duration || 0) * 1000,
        });
        persistQueue(queue, prevIndex, prevSong);
        return prevSong;
    },

    playAtIndex: (index) => {
        const { queue } = get();
        if (index < 0 || index >= queue.length) return null;
        const song = queue[index];
        set({
            currentSong: song,
            queueIndex: index,
            position: 0,
            duration: (song.duration || 0) * 1000,
        });
        persistQueue(queue, index, song);
        return song;
    },

    toggleShuffle: () =>
        set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),

    toggleRepeat: () =>
        set((state) => {
            const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
            const idx = modes.indexOf(state.repeatMode);
            return { repeatMode: modes[(idx + 1) % 3] };
        }),

    clearPlayer: () => {
        set({
            currentSong: null,
            queue: [],
            queueIndex: -1,
            isPlaying: false,
            position: 0,
            duration: 0,
        });
        AsyncStorage.removeItem(QUEUE_KEY).catch(() => { });
    },

    loadQueue: async () => {
        try {
            const data = await AsyncStorage.getItem(QUEUE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                if (parsed.queue && parsed.queue.length > 0) {
                    set({
                        queue: parsed.queue,
                        queueIndex: parsed.queueIndex ?? 0,
                        currentSong: parsed.currentSong || parsed.queue[parsed.queueIndex ?? 0] || null,
                        duration: ((parsed.currentSong?.duration || 0) * 1000),
                    });
                }
            }
        } catch (_) { }
    },
}));
