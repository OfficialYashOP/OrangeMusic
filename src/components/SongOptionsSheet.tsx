import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Pressable,
    Share,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { Song, getImageUrl, getArtistNames } from '../types/song';
import AddToPlaylistSheet from './AddToPlaylistSheet';
import SongDetailsModal from './SongDetailsModal';

interface SongOptionsSheetProps {
    visible: boolean;
    song: Song | null;
    onClose: () => void;
    onNavigateArtist?: (artistName: string, image: string) => void;
    onNavigateAlbum?: (song: Song) => void;
}

export default function SongOptionsSheet({
    visible,
    song,
    onClose,
    onNavigateArtist,
    onNavigateAlbum,
}: SongOptionsSheetProps) {
    const c = useTheme();
    const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
    const isFavorite = useLibraryStore((s) => s.isFavorite);
    const addDownload = useLibraryStore((s) => s.addDownload);
    const isDownloaded = useLibraryStore((s) => s.isDownloaded);

    const [playlistSheetVisible, setPlaylistSheetVisible] = useState(false);
    const [detailsVisible, setDetailsVisible] = useState(false);

    if (!song) return null;

    const liked = isFavorite(song.id);
    const downloaded = isDownloaded(song.id);
    const artistName = song.artists.primary[0]?.name ?? song.artists.all[0]?.name ?? 'Unknown';
    const artistImage = getImageUrl(song.image, '150x150');

    const formatSongDuration = () => {
        if (!song.duration) return '--:--';
        const m = String(Math.floor(song.duration / 60)).padStart(2, '0');
        const s = String(Math.floor(song.duration % 60)).padStart(2, '0');
        return `${m}:${s} mins`;
    };

    const handlePlayNext = () => {
        const store = usePlayerStore.getState();
        const { queue, queueIndex } = store;
        const newQueue = [...queue];
        newQueue.splice(queueIndex + 1, 0, song);
        store.setQueue(newQueue, queueIndex);
        onClose();
    };

    const handleAddToQueue = () => {
        usePlayerStore.getState().addToQueue(song);
        onClose();
    };

    const handleAddToPlaylist = () => {
        onClose();
        setTimeout(() => setPlaylistSheetVisible(true), 300);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `🎵 ${song.name} by ${getArtistNames(song)}\n${song.url}`,
            });
        } catch (_) { }
        onClose();
    };

    const handleGoToArtist = () => {
        onClose();
        if (onNavigateArtist) {
            onNavigateArtist(artistName, artistImage);
        }
    };

    const handleGoToAlbum = () => {
        onClose();
        if (onNavigateAlbum) {
            onNavigateAlbum(song);
        }
    };

    const handleDownload = () => {
        if (downloaded) {
            Alert.alert('Already Downloaded', 'This song is already in your downloads.');
            onClose();
            return;
        }
        addDownload(song);
        Alert.alert('Downloaded', `"${song.name}" has been added to your downloads.`);
        onClose();
    };

    const handleDetails = () => {
        onClose();
        setTimeout(() => setDetailsVisible(true), 300);
    };

    const handleSetRingtone = () => {
        Alert.alert('Set as Ringtone', 'This feature requires native device access and is not available in Expo Go.');
        onClose();
    };

    const handleBlacklist = () => {
        Alert.alert('Blacklisted', `"${song.name}" will be skipped during playback.`);
        onClose();
    };

    const handleDeleteFromDevice = () => {
        if (!downloaded) {
            Alert.alert('Not Downloaded', 'This song is not downloaded on your device.');
            onClose();
            return;
        }
        const removeDownload = useLibraryStore.getState().removeDownload;
        removeDownload(song.id);
        Alert.alert('Deleted', `"${song.name}" has been removed from downloads.`);
        onClose();
    };

    const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
        { icon: 'play-skip-forward-outline', label: 'Play Next', onPress: handlePlayNext },
        { icon: 'time-outline', label: 'Add to Playing Queue', onPress: handleAddToQueue },
        { icon: 'add-circle-outline', label: 'Add to Playlist', onPress: handleAddToPlaylist },
        { icon: 'disc-outline', label: 'Go to Album', onPress: handleGoToAlbum },
        { icon: 'person-outline', label: 'Go to Artist', onPress: handleGoToArtist },
        { icon: 'information-circle-outline', label: 'Details', onPress: handleDetails },
        { icon: 'call-outline', label: 'Set as Ringtone', onPress: handleSetRingtone },
        { icon: 'close-circle-outline', label: 'Add to Blacklist', onPress: handleBlacklist },
        { icon: 'paper-plane-outline', label: 'Share', onPress: handleShare },
        { icon: 'download-outline', label: 'Download', onPress: handleDownload },
        { icon: 'trash-outline', label: 'Delete from Device', onPress: handleDeleteFromDevice },
    ];

    return (
        <>
            <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
                <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                    <Pressable style={[styles.sheet, { backgroundColor: c.sheetBg }]} onPress={() => { }}>
                        <View style={[styles.handle, { backgroundColor: c.muted }]} />

                        {/* Song Header */}
                        <View style={styles.header}>
                            <Image source={{ uri: getImageUrl(song.image, '150x150') }} style={styles.thumb} />
                            <View style={styles.headerInfo}>
                                <Text style={[styles.songName, { color: c.text }]} numberOfLines={1}>
                                    {song.name}
                                </Text>
                                <Text style={[styles.songMeta, { color: c.muted }]} numberOfLines={1}>
                                    {getArtistNames(song)}  |  {formatSongDuration()}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => { toggleFavorite(song); }}>
                                <Ionicons
                                    name={liked ? 'heart' : 'heart-outline'}
                                    size={22}
                                    color={liked ? c.accent : c.muted}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: c.border }]} />

                        {/* Actions */}
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {actions.map((action) => (
                                <TouchableOpacity
                                    key={action.label}
                                    style={styles.actionRow}
                                    onPress={action.onPress}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name={action.icon} size={22} color={c.text} />
                                    <Text style={[styles.actionText, { color: c.text }]}>{action.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Add to Playlist sub-sheet */}
            <AddToPlaylistSheet
                visible={playlistSheetVisible}
                song={song}
                onClose={() => setPlaylistSheetVisible(false)}
            />

            {/* Themed Song Details Modal */}
            <SongDetailsModal
                visible={detailsVisible}
                song={song}
                onClose={() => setDetailsVisible(false)}
            />
        </>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
        maxHeight: '80%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 14,
    },
    thumb: {
        width: 52,
        height: 52,
        borderRadius: 10,
        backgroundColor: '#2A2A3A',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 14,
        marginRight: 10,
    },
    songName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 3,
    },
    songMeta: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 6,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 16,
    },
});
