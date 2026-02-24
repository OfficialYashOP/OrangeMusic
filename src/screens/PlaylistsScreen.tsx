import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    StatusBar,
    Alert,
    TextInput,
    Modal,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { usePlaylistStore, Playlist } from '../store/playlistStore';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';
import { Song, getImageUrl, getArtistNames } from '../types/song';
import SongOptionsSheet from '../components/SongOptionsSheet';

export default function PlaylistsScreen({ navigation }: any) {
    const c = useTheme();
    const insets = useSafeAreaInsets();
    const playlists = usePlaylistStore((s) => s.playlists);
    const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
    const deletePlaylist = usePlaylistStore((s) => s.deletePlaylist);
    const currentSong = usePlayerStore((s) => s.currentSong);

    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
    const [optionsSong, setOptionsSong] = useState<Song | null>(null);
    const [optionsVisible, setOptionsVisible] = useState(false);

    const bottomSpacing = currentSong ? 176 : 96;

    const handleCreatePlaylist = useCallback(async () => {
        const name = newPlaylistName.trim();
        if (!name) return;
        await createPlaylist(name);
        setNewPlaylistName('');
        setCreateModalVisible(false);
    }, [newPlaylistName, createPlaylist]);

    const handleDeletePlaylist = useCallback((playlist: Playlist) => {
        Alert.alert(
            'Delete Playlist',
            `Delete "${playlist.name}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(playlist.id) },
            ]
        );
    }, [deletePlaylist]);

    const handlePlayPlaylist = useCallback(async (playlist: Playlist) => {
        if (playlist.songs.length === 0) {
            Alert.alert('Empty Playlist', 'Add songs to this playlist first.');
            return;
        }
        await audioService.playQueue(playlist.songs, 0);
    }, []);

    const navigateToArtist = useCallback((name: string, image: string) => {
        navigation.navigate('ArtistDetail', { artistName: name, artistImage: image });
    }, [navigation]);

    const navigateToAlbum = useCallback((song: Song) => {
        navigation.navigate('AlbumDetail', {
            albumName: song.album.name || song.name,
            albumImage: getImageUrl(song.image, '500x500'),
            albumArtist: getArtistNames(song),
            albumYear: song.year,
        });
    }, [navigation]);

    const renderPlaylistItem = useCallback(({ item }: { item: Playlist }) => {
        const isExpanded = expandedPlaylist === item.id;
        const coverImage = item.songs.length > 0
            ? getImageUrl(item.songs[0].image, '150x150')
            : undefined;

        return (
            <View>
                <TouchableOpacity
                    style={styles.playlistRow}
                    onPress={() => setExpandedPlaylist(isExpanded ? null : item.id)}
                    activeOpacity={0.75}
                >
                    <View style={[styles.playlistCover, { backgroundColor: c.card }]}>
                        {coverImage ? (
                            <Image source={{ uri: coverImage }} style={styles.playlistCoverImg} />
                        ) : (
                            <Ionicons name="musical-notes" size={24} color={c.muted} />
                        )}
                    </View>
                    <View style={styles.playlistInfo}>
                        <Text style={[styles.playlistName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.playlistMeta, { color: c.muted }]}>
                            {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => handlePlayPlaylist(item)} style={[styles.playCircle, { backgroundColor: c.accent }]}>
                        <Ionicons name="play" size={16} color={c.playBtnText} style={{ marginLeft: 2 }} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletePlaylist(item)} style={styles.moreBtn}>
                        <Ionicons name="trash-outline" size={18} color={c.muted} />
                    </TouchableOpacity>
                </TouchableOpacity>

                {isExpanded && item.songs.length > 0 && (
                    <View style={[styles.expandedSongs, { backgroundColor: c.cardAlt }]}>
                        {item.songs.map((song, idx) => {
                            const isActive = currentSong?.id === song.id;
                            return (
                                <TouchableOpacity
                                    key={`${song.id}-${idx}`}
                                    style={styles.songRow}
                                    onPress={() => audioService.playQueue(item.songs, idx)}
                                    activeOpacity={0.75}
                                >
                                    <Image source={{ uri: getImageUrl(song.image, '150x150') }} style={[styles.songImg, { backgroundColor: c.card }]} />
                                    <View style={styles.songInfo}>
                                        <Text style={[styles.songName, { color: isActive ? c.accent : c.text }]} numberOfLines={1}>{song.name}</Text>
                                        <Text style={[styles.songArtist, { color: c.muted }]} numberOfLines={1}>{getArtistNames(song)}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => { setOptionsSong(song); setOptionsVisible(true); }} style={styles.moreBtn}>
                                        <Ionicons name="ellipsis-vertical" size={16} color={c.muted} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    }, [expandedPlaylist, currentSong, c, handlePlayPlaylist, handleDeletePlaylist]);

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />

            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Ionicons name="musical-notes" size={24} color={c.accent} />
                    <Text style={[styles.logoText, { color: c.text }]}>OrangeMusic</Text>
                </View>
                <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.addBtn}>
                    <Ionicons name="add-circle" size={28} color={c.accent} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.pageTitle, { color: c.accent }]}>Playlists</Text>

            {playlists.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="list-outline" size={64} color={c.accent} />
                    <Text style={[styles.emptyTitle, { color: c.text }]}>No Playlists Yet</Text>
                    <Text style={[styles.emptySub, { color: c.muted }]}>
                        Tap the + button to create your first playlist.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={playlists}
                    renderItem={renderPlaylistItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: bottomSpacing }}
                />
            )}

            {/* Create Playlist Modal */}
            <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
                <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlay }]} onPress={() => setCreateModalVisible(false)}>
                    <View style={[styles.modalContent, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
                        <Text style={[styles.modalTitle, { color: c.text }]}>New Playlist</Text>
                        <TextInput
                            style={[styles.modalInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
                            placeholder="Playlist name"
                            placeholderTextColor={c.muted}
                            value={newPlaylistName}
                            onChangeText={setNewPlaylistName}
                            autoFocus
                        />
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border }]} onPress={() => setCreateModalVisible(false)}>
                                <Text style={[styles.modalBtnText, { color: c.muted }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.accent }]} onPress={handleCreatePlaylist}>
                                <Text style={[styles.modalBtnText, { color: c.playBtnText }]}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Pressable>
            </Modal>

            <SongOptionsSheet
                visible={optionsVisible}
                song={optionsSong}
                onClose={() => setOptionsVisible(false)}
                onNavigateArtist={navigateToArtist}
                onNavigateAlbum={navigateToAlbum}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
    addBtn: { padding: 4 },
    pageTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12, marginTop: 6 },
    playlistRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    playlistCover: { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    playlistCoverImg: { width: 56, height: 56, borderRadius: 12 },
    playlistInfo: { flex: 1, marginLeft: 14, marginRight: 8 },
    playlistName: { fontSize: 17, fontWeight: '600', marginBottom: 3 },
    playlistMeta: { fontSize: 13 },
    playCircle: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    moreBtn: { padding: 6 },
    expandedSongs: { marginHorizontal: 16, borderRadius: 12, marginBottom: 6, paddingVertical: 4 },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    songImg: { width: 40, height: 40, borderRadius: 8 },
    songInfo: { flex: 1, marginLeft: 10, marginRight: 6 },
    songName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
    songArtist: { fontSize: 12 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginTop: 16 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 21 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    modalContent: { borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, elevation: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
    modalInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 18 },
    modalBtnRow: { flexDirection: 'row', gap: 10 },
    modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
    modalBtnText: { fontSize: 15, fontWeight: '700' },
});
