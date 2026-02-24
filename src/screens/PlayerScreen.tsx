import React, { useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    StatusBar,
    PanResponder,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { useTheme } from '../store/themeStore';
import { audioService } from '../services/audioService';
import { getImageUrl, getArtistNames } from '../types/song';
import LyricsSheet from '../components/LyricsSheet';
import QueueSheet from '../components/QueueSheet';
import SongOptionsSheet from '../components/SongOptionsSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ART_SIZE = SCREEN_WIDTH - 40;
const SLIDER_WIDTH = SCREEN_WIDTH - 40;

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PlayerScreen({ navigation }: any) {
    const c = useTheme();
    const insets = useSafeAreaInsets();
    const currentSong = usePlayerStore((s) => s.currentSong);
    const isPlaying = usePlayerStore((s) => s.isPlaying);
    const position = usePlayerStore((s) => s.position);
    const duration = usePlayerStore((s) => s.duration);
    const isLoading = usePlayerStore((s) => s.isLoading);
    const shuffleEnabled = usePlayerStore((s) => s.shuffleEnabled);
    const repeatMode = usePlayerStore((s) => s.repeatMode);
    const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
    const isFavorite = useLibraryStore((s) => s.isFavorite);

    const [lyricsVisible, setLyricsVisible] = useState(false);
    const [queueVisible, setQueueVisible] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const isLiked = currentSong ? isFavorite(currentSong.id) : false;
    const positionSec = useMemo(() => Math.floor(position / 1000), [position]);
    const durationSec = useMemo(() => Math.floor(duration / 1000), [duration]);
    const progress = useMemo(() => {
        if (!durationSec || durationSec <= 0) return 0;
        return Math.min(positionSec / durationSec, 1);
    }, [positionSec, durationSec]);

    const formatTime = (sec: number) => {
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(Math.floor(sec % 60)).padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSpeedChange = () => {
        const currentIdx = SPEED_OPTIONS.indexOf(playbackSpeed);
        const nextIdx = (currentIdx + 1) % SPEED_OPTIONS.length;
        const newSpeed = SPEED_OPTIONS[nextIdx];
        setPlaybackSpeed(newSpeed);
        audioService.setPlaybackSpeed(newSpeed);
    };

    const getRepeatIcon = (): keyof typeof Ionicons.glyphMap => {
        if (repeatMode === 'one') return 'repeat';
        return 'repeat';
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const x = evt.nativeEvent.locationX;
                const ratio = Math.max(0, Math.min(1, x / SLIDER_WIDTH));
                audioService.seekTo(ratio * duration);
            },
            onPanResponderMove: (evt) => {
                const x = evt.nativeEvent.locationX;
                const ratio = Math.max(0, Math.min(1, x / SLIDER_WIDTH));
                usePlayerStore.getState().setPosition(ratio * usePlayerStore.getState().duration);
            },
            onPanResponderRelease: (evt) => {
                const x = evt.nativeEvent.locationX;
                const ratio = Math.max(0, Math.min(1, x / SLIDER_WIDTH));
                audioService.seekTo(ratio * usePlayerStore.getState().duration);
            },
        }),
    ).current;

    const navigateToArtist = (artistName: string, image: string) => {
        navigation.navigate('ArtistDetail', { artistName, artistImage: image });
    };

    if (!currentSong) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
                <Text style={[styles.emptyText, { color: c.muted }]}>No song selected</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={() => currentSong && toggleFavorite(currentSong)} style={styles.headerBtn}>
                        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={21} color={isLiked ? c.accent : c.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerBtn} onPress={() => setOptionsVisible(true)}>
                        <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color={c.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.artContainer}>
                <Image source={{ uri: getImageUrl(currentSong.image, '500x500') }} style={[styles.albumArt, { backgroundColor: c.card }]} />
            </View>

            <View style={styles.songInfo}>
                <Text style={[styles.songName, { color: c.text }]} numberOfLines={1}>{currentSong.name}</Text>
                <Text style={[styles.songArtist, { color: c.textSecondary }]} numberOfLines={1}>{getArtistNames(currentSong)}</Text>
            </View>

            <View style={styles.progressContainer}>
                <View style={styles.sliderTrack} {...panResponder.panHandlers}>
                    <View style={[styles.sliderBg, { backgroundColor: c.border }]} />
                    <View style={[styles.sliderFill, { backgroundColor: c.accent, width: `${progress * 100}%` }]} />
                    <View style={[styles.sliderThumb, { backgroundColor: c.accent, left: `${progress * 100}%` }]} />
                </View>
                <View style={styles.timeRow}>
                    <Text style={[styles.timeText, { color: c.textSecondary }]}>{formatTime(positionSec)}</Text>
                    <Text style={[styles.timeText, { color: c.textSecondary }]}>{formatTime(durationSec)}</Text>
                </View>
            </View>

            <View style={styles.controls}>
                <TouchableOpacity onPress={() => audioService.playPrevious()} style={styles.controlBtn}>
                    <Ionicons name="play-skip-back" size={30} color={c.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => audioService.seekTo(Math.max(0, position - 10000))} style={styles.seekBtn}>
                    <Ionicons name="play-back" size={20} color={c.text} />
                    <Text style={[styles.seekText, { color: c.textSecondary }]}>10</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => audioService.togglePlayPause()} style={[styles.playBtn, { backgroundColor: c.accent }]} disabled={isLoading}>
                    <Ionicons
                        name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'}
                        size={34}
                        color={c.playBtnText}
                        style={!isPlaying && !isLoading ? { marginLeft: 2 } : undefined}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => audioService.seekTo(Math.min(duration, position + 10000))} style={styles.seekBtn}>
                    <Ionicons name="play-forward" size={20} color={c.text} />
                    <Text style={[styles.seekText, { color: c.textSecondary }]}>10</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => audioService.playNext()} style={styles.controlBtn}>
                    <Ionicons name="play-skip-forward" size={30} color={c.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
                <TouchableOpacity onPress={() => usePlayerStore.getState().toggleShuffle()} style={styles.bottomBtn}>
                    <Ionicons name="shuffle" size={22} color={shuffleEnabled ? c.accent : c.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => usePlayerStore.getState().toggleRepeat()} style={styles.bottomBtn}>
                    <View>
                        <Ionicons name={getRepeatIcon()} size={22} color={repeatMode !== 'off' ? c.accent : c.muted} />
                        {repeatMode === 'one' && (
                            <View style={styles.repeatOneBadge}>
                                <Text style={[styles.repeatOneText, { color: c.accent }]}>1</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomBtn} onPress={() => setQueueVisible(true)}>
                    <Ionicons name="list-outline" size={22} color={c.muted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.bottomBtn} onPress={handleSpeedChange}>
                    <Text style={[styles.speedText, { color: playbackSpeed !== 1 ? c.accent : c.muted }]}>
                        {playbackSpeed}x
                    </Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.lyricsHandle} onPress={() => setLyricsVisible(true)}>
                <Ionicons name="chevron-up" size={18} color={c.muted} />
                <Text style={[styles.lyricsText, { color: c.text }]}>Lyrics</Text>
            </TouchableOpacity>

            {/* Modals */}
            <LyricsSheet visible={lyricsVisible} onClose={() => setLyricsVisible(false)} />
            <QueueSheet visible={queueVisible} onClose={() => setQueueVisible(false)} />
            <SongOptionsSheet
                visible={optionsVisible}
                song={currentSong}
                onClose={() => setOptionsVisible(false)}
                onNavigateArtist={navigateToArtist}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 20 },
    emptyText: { marginTop: 90, textAlign: 'center', fontSize: 16 },
    header: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    artContainer: { marginTop: 20, alignItems: 'center' },
    albumArt: { width: ART_SIZE, height: ART_SIZE, borderRadius: 26 },
    songInfo: { marginTop: 24, alignItems: 'center' },
    songName: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
    songArtist: { fontSize: 16, fontWeight: '500' },
    progressContainer: { marginTop: 24 },
    sliderTrack: { height: 24, justifyContent: 'center' },
    sliderBg: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 3 },
    sliderFill: { position: 'absolute', left: 0, height: 4, borderRadius: 3 },
    sliderThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8, top: 4 },
    timeRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
    timeText: { fontSize: 12, fontWeight: '500' },
    controls: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    controlBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    seekBtn: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    seekText: { fontSize: 12, fontWeight: '700', marginTop: -2 },
    playBtn: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
    bottomControls: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26 },
    bottomBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    repeatOneBadge: {
        position: 'absolute',
        top: -2,
        right: -6,
        width: 14,
        height: 14,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    repeatOneText: { fontSize: 9, fontWeight: '900' },
    speedText: { fontSize: 14, fontWeight: '800' },
    lyricsHandle: { marginTop: 12, alignItems: 'center', justifyContent: 'center' },
    lyricsText: { marginTop: 2, fontSize: 16, fontWeight: '600' },
});
