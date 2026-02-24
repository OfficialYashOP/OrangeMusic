import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { usePlayerStore } from '../store/playerStore';
import { useSettingsStore } from '../store/settingsStore';
import { useLibraryStore } from '../store/libraryStore';
import { Song, getDownloadUrl, DownloadUrl, getImageUrl, getArtistNames } from '../types/song';

class AudioService {
    private player: AudioPlayer | null = null;
    private progressInterval: ReturnType<typeof setInterval> | null = null;
    private endTrackInterval: ReturnType<typeof setInterval> | null = null;
    private sleepInterval: ReturnType<typeof setInterval> | null = null;
    private initialized = false;
    private playbackSpeed = 1;
    private isPlayInProgress = false; // Guard against rapid double-taps

    async initialize() {
        if (this.initialized) return;
        try {
            await setAudioModeAsync({
                playsInSilentMode: true,
                shouldPlayInBackground: true,
            });
            this.initialized = true;
        } catch (error) {
            console.error('Audio init error:', error);
            // Retry once
            try {
                await setAudioModeAsync({
                    playsInSilentMode: true,
                    shouldPlayInBackground: true,
                });
                this.initialized = true;
            } catch (_) { }
        }
    }

    private getPreferredUrl(urls: DownloadUrl[]): string {
        if (!urls || !Array.isArray(urls) || urls.length === 0) return '';
        const quality = useSettingsStore.getState().audioQuality;
        // Try exact match first
        const preferred = urls.find((u) => u.quality === quality);
        if (preferred?.url) return preferred.url;
        // Fallback: try each quality from highest to lowest
        const fallbackOrder = ['320kbps', '160kbps', '96kbps', '48kbps', '12kbps'];
        for (const q of fallbackOrder) {
            const match = urls.find((u) => u.quality === q);
            if (match?.url) return match.url;
        }
        // Last resort: return the last item's url
        return urls[urls.length - 1]?.url || '';
    }

    private startProgressTracking() {
        this.stopProgressTracking();
        this.progressInterval = setInterval(() => {
            if (this.player && this.player.playing) {
                const store = usePlayerStore.getState();
                store.setPosition(this.player.currentTime * 1000);
                if (this.player.duration > 0) {
                    store.setDuration(this.player.duration * 1000);
                }
            }
        }, 250);
    }

    private stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    private startEndTracking() {
        if (this.endTrackInterval) clearInterval(this.endTrackInterval);
        this.endTrackInterval = setInterval(() => {
            if (!this.player) return;
            if (
                this.player.duration > 0 &&
                this.player.currentTime >= this.player.duration - 0.5 &&
                !this.player.playing
            ) {
                this.playNext();
            }
        }, 500);
    }

    startSleepTimer(minutes: number) {
        this.clearSleepTimer();
        const settings = useSettingsStore.getState();
        settings.setSleepTimer(minutes);

        this.sleepInterval = setTimeout(() => {
            this.pause();
            settings.clearSleepTimer();
        }, minutes * 60 * 1000) as any;
    }

    clearSleepTimer() {
        if (this.sleepInterval) {
            clearTimeout(this.sleepInterval as any);
            this.sleepInterval = null;
        }
        useSettingsStore.getState().clearSleepTimer();
    }

    private cleanupPlayer() {
        this.stopProgressTracking();
        if (this.endTrackInterval) {
            clearInterval(this.endTrackInterval);
            this.endTrackInterval = null;
        }
        if (this.player) {
            try {
                this.player.pause();
            } catch (_) { }
            try {
                this.player.remove();
            } catch (_) { }
            this.player = null;
        }
    }

    async playSong(song: Song) {
        // Guard against double-taps
        if (this.isPlayInProgress) return;
        this.isPlayInProgress = true;

        try {
            await this.initialize();
            const store = usePlayerStore.getState();

            store.setIsLoading(true);
            store.setCurrentSong(song);

            // Check if song is downloaded
            const downloadInfo = useLibraryStore.getState().downloads.find(s => s.id === song.id);
            const downloadUrl = downloadInfo?.localUri || this.getPreferredUrl(song.downloadUrl);

            if (!downloadUrl) {
                console.error('No download URL for song:', song.name);
                store.setIsLoading(false);
                this.isPlayInProgress = false;
                return;
            }

            // Clean up old player completely
            this.cleanupPlayer();

            // Small delay to ensure cleanup is complete
            await new Promise((r) => setTimeout(r, 50));

            // Create new player with the audio source
            this.player = createAudioPlayer({ uri: downloadUrl });
            this.player.volume = store.volume;

            // Play
            this.player.play();

            // Re-apply playback speed
            if (this.playbackSpeed !== 1) {
                try {
                    this.player.setPlaybackRate(this.playbackSpeed);
                } catch (_) { }
            }

            store.setIsPlaying(true);
            store.setIsLoading(false);
            store.setDuration((song.duration || 0) * 1000);
            store.setPosition(0);

            // Set Lock Screen Info
            try {
                this.player.setActiveForLockScreen(true, {
                    title: song.name,
                    artist: getArtistNames(song),
                });
            } catch (_) { }

            this.startProgressTracking();
            this.startEndTracking();
        } catch (error) {
            console.error('Play error:', error);
            const store = usePlayerStore.getState();
            store.setIsLoading(false);
            store.setIsPlaying(false);
        } finally {
            this.isPlayInProgress = false;
        }
    }

    async togglePlayPause() {
        if (!this.player) {
            // No player — try to play current song from store
            const currentSong = usePlayerStore.getState().currentSong;
            if (currentSong) {
                await this.playSong(currentSong);
            }
            return;
        }
        const store = usePlayerStore.getState();

        if (this.player.playing) {
            this.player.pause();
            store.setIsPlaying(false);
        } else {
            this.player.play();
            store.setIsPlaying(true);
        }
    }

    async pause() {
        if (!this.player) return;
        this.player.pause();
        usePlayerStore.getState().setIsPlaying(false);
    }

    async seekTo(positionMs: number) {
        if (!this.player) return;
        const seconds = Math.max(0, positionMs / 1000);
        try {
            await this.player.seekTo(seconds);
        } catch (_) { }
        usePlayerStore.getState().setPosition(positionMs);
    }

    async setVolume(volume: number) {
        if (this.player) {
            this.player.volume = volume;
        }
        usePlayerStore.getState().setVolume(volume);
    }

    async setPlaybackSpeed(speed: number) {
        this.playbackSpeed = speed;
        if (this.player) {
            try {
                this.player.setPlaybackRate(speed);
            } catch (_) { }
        }
    }

    getPlaybackSpeed(): number {
        return this.playbackSpeed;
    }

    async playNext() {
        if (this.endTrackInterval) {
            clearInterval(this.endTrackInterval);
            this.endTrackInterval = null;
        }

        const store = usePlayerStore.getState();
        const nextSong = store.playNext();
        if (nextSong) {
            await this.playSong(nextSong);
        } else {
            store.setIsPlaying(false);
            this.stopProgressTracking();
        }
    }

    async playPrevious() {
        const store = usePlayerStore.getState();
        // If more than 3 seconds in, restart current song
        if (this.player && this.player.currentTime > 3) {
            try {
                await this.player.seekTo(0);
            } catch (_) { }
            store.setPosition(0);
            return;
        }

        const prevSong = store.playPrevious();
        if (prevSong) {
            await this.playSong(prevSong);
        }
    }

    async playQueue(songs: Song[], startIndex: number) {
        if (!songs || songs.length === 0) return;
        const safeIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
        const store = usePlayerStore.getState();

        // If the user taps the song that is currently playing, just toggle play/pause
        if (store.currentSong?.id === songs[safeIndex].id) {
            await this.togglePlayPause();
            // Optional: still update the queue in case they are playing it from a different list
            store.setQueue(songs, safeIndex);
            return;
        }

        store.setQueue(songs, safeIndex);
        await this.playSong(songs[safeIndex]);
    }

    async stop() {
        this.cleanupPlayer();
        const store = usePlayerStore.getState();
        store.setIsPlaying(false);
        store.setPosition(0);
    }
}

export const audioService = new AudioService();
