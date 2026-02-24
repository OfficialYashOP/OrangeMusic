import React, { useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';
import { Song, getImageUrl, getArtistNames } from '../types/song';

interface QueueSheetProps {
    visible: boolean;
    onClose: () => void;
}

export default function QueueSheet({ visible, onClose }: QueueSheetProps) {
    const c = useTheme();
    const queue = usePlayerStore((s) => s.queue);
    const currentSong = usePlayerStore((s) => s.currentSong);
    const queueIndex = usePlayerStore((s) => s.queueIndex);
    const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
    const reorderQueue = usePlayerStore((s) => s.reorderQueue);

    const handlePlayAt = useCallback(async (index: number) => {
        const song = usePlayerStore.getState().playAtIndex(index);
        if (song) {
            await audioService.playSong(song);
        }
    }, []);

    const handleRemove = useCallback((index: number) => {
        if (index === queueIndex) {
            Alert.alert('Cannot Remove', 'Cannot remove the currently playing song.');
            return;
        }
        removeFromQueue(index);
    }, [queueIndex, removeFromQueue]);

    const handleMoveUp = useCallback((index: number) => {
        if (index <= 0) return;
        reorderQueue(index, index - 1);
    }, [reorderQueue]);

    const handleMoveDown = useCallback((index: number) => {
        if (index >= queue.length - 1) return;
        reorderQueue(index, index + 1);
    }, [reorderQueue, queue.length]);

    const handleClearQueue = useCallback(() => {
        Alert.alert(
            'Clear Queue',
            'Remove all songs from the queue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => usePlayerStore.getState().clearPlayer() },
            ]
        );
    }, []);

    const formatDur = (seconds: number | null) => {
        if (!seconds || seconds <= 0) return '--:--';
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        return `${m}:${s}`;
    };

    const renderItem = useCallback(
        ({ item, index }: { item: Song; index: number }) => {
            const isActive = currentSong?.id === item.id && index === queueIndex;

            return (
                <View style={[styles.row, isActive && { backgroundColor: c.cardAlt }]}>
                    {/* Reorder buttons */}
                    <View style={styles.reorderCol}>
                        <TouchableOpacity onPress={() => handleMoveUp(index)} disabled={index === 0}>
                            <Ionicons name="chevron-up" size={16} color={index === 0 ? c.border : c.muted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleMoveDown(index)} disabled={index === queue.length - 1}>
                            <Ionicons name="chevron-down" size={16} color={index === queue.length - 1 ? c.border : c.muted} />
                        </TouchableOpacity>
                    </View>

                    {/* Song info — tap to play */}
                    <TouchableOpacity
                        style={styles.songTouchable}
                        onPress={() => handlePlayAt(index)}
                        activeOpacity={0.75}
                    >
                        <Image
                            source={{ uri: getImageUrl(item.image, '150x150') }}
                            style={[styles.thumb, { backgroundColor: c.card }]}
                        />
                        <View style={styles.info}>
                            <Text style={[styles.name, { color: isActive ? c.accent : c.text }]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            <Text style={[styles.artist, { color: c.muted }]} numberOfLines={1}>
                                {getArtistNames(item)}  •  {formatDur(item.duration)}
                            </Text>
                        </View>

                        {isActive && (
                            <Ionicons name="musical-note" size={16} color={c.accent} style={{ marginRight: 6 }} />
                        )}
                    </TouchableOpacity>

                    {/* Remove button */}
                    <TouchableOpacity onPress={() => handleRemove(index)} style={styles.removeBtn}>
                        <Ionicons name="close" size={18} color={isActive ? c.border : c.muted} />
                    </TouchableOpacity>
                </View>
            );
        },
        [currentSong, queueIndex, handlePlayAt, handleRemove, handleMoveUp, handleMoveDown, c, queue.length],
    );

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: c.sheetBg }]} onPress={() => { }}>
                    <View style={[styles.handle, { backgroundColor: c.muted }]} />

                    <View style={styles.headerRow}>
                        <Text style={[styles.title, { color: c.text }]}>
                            Queue ({queue.length} songs)
                        </Text>
                        {queue.length > 0 && (
                            <TouchableOpacity onPress={handleClearQueue}>
                                <Text style={[styles.clearBtn, { color: c.accent }]}>Clear All</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {queue.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="musical-notes-outline" size={48} color={c.muted} />
                            <Text style={[styles.emptyText, { color: c.muted }]}>Queue is empty</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={queue}
                            renderItem={renderItem}
                            keyExtractor={(item, i) => `queue-${item.id}-${i}`}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 30, maxHeight: '75%' },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
    title: { fontSize: 20, fontWeight: '700' },
    clearBtn: { fontSize: 15, fontWeight: '700' },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
    reorderCol: { alignItems: 'center', width: 24, marginRight: 8 },
    songTouchable: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    thumb: { width: 44, height: 44, borderRadius: 10 },
    info: { flex: 1, marginLeft: 12, marginRight: 6 },
    name: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
    artist: { fontSize: 12 },
    removeBtn: { padding: 6 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, fontWeight: '500', marginTop: 16 },
});
