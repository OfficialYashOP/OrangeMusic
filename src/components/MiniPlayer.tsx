import React, { useCallback, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore } from '../store/playerStore';
import { useTheme } from '../store/themeStore';
import { audioService } from '../services/audioService';
import { getImageUrl, getArtistNames } from '../types/song';

interface MiniPlayerProps {
    onPress: () => void;
}

export default function MiniPlayer({ onPress }: MiniPlayerProps) {
    const c = useTheme();
    const currentSong = usePlayerStore((s) => s.currentSong);
    const isPlaying = usePlayerStore((s) => s.isPlaying);
    const position = usePlayerStore((s) => s.position);
    const duration = usePlayerStore((s) => s.duration);
    const isLoading = usePlayerStore((s) => s.isLoading);

    const progress = useMemo(() => {
        if (!duration || duration <= 0) return 0;
        return Math.min(position / duration, 1);
    }, [position, duration]);

    const handlePlayPause = useCallback(() => {
        audioService.togglePlayPause();
    }, []);

    const handleNext = useCallback(() => {
        audioService.playNext();
    }, []);

    if (!currentSong) return null;

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: c.miniPlayer, borderColor: c.miniPlayerBorder }]}
            onPress={onPress}
            activeOpacity={0.96}
        >
            <View style={[styles.progressBg, { backgroundColor: c.border }]}>
                <View style={[styles.progressFill, { backgroundColor: c.accent, width: `${progress * 100}%` }]} />
            </View>

            <View style={styles.content}>
                <Image source={{ uri: getImageUrl(currentSong.image, '150x150') }} style={[styles.albumArt, { backgroundColor: c.cardAlt }]} />
                <View style={styles.songInfo}>
                    <Text style={[styles.songName, { color: c.text }]} numberOfLines={1}>
                        {currentSong.name} - {getArtistNames(currentSong)}
                    </Text>
                </View>
                <TouchableOpacity onPress={handlePlayPause} style={styles.controlBtn}>
                    <Ionicons
                        name={isLoading ? 'hourglass-outline' : isPlaying ? 'pause' : 'play'}
                        size={17}
                        color={c.accent}
                        style={!isPlaying && !isLoading ? { marginLeft: 1 } : undefined}
                    />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} style={styles.controlBtn}>
                    <Ionicons name="play-skip-forward" size={16} color={c.accent} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 72,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    progressBg: { height: 2 },
    progressFill: { height: '100%' },
    content: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9 },
    albumArt: { width: 32, height: 32, borderRadius: 6 },
    songInfo: { flex: 1, marginLeft: 10, marginRight: 6 },
    songName: { fontSize: 14, fontWeight: '500' },
    controlBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
});
