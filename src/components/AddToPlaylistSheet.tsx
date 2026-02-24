import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Pressable,
    FlatList,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';
import { usePlaylistStore, Playlist } from '../store/playlistStore';
import { Song } from '../types/song';

interface AddToPlaylistSheetProps {
    visible: boolean;
    song: Song | null;
    onClose: () => void;
}

export default function AddToPlaylistSheet({ visible, song, onClose }: AddToPlaylistSheetProps) {
    const c = useTheme();
    const playlists = usePlaylistStore((s) => s.playlists);
    const addSongToPlaylist = usePlaylistStore((s) => s.addSongToPlaylist);
    const createPlaylist = usePlaylistStore((s) => s.createPlaylist);
    const isSongInPlaylist = usePlaylistStore((s) => s.isSongInPlaylist);

    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');

    if (!song) return null;

    const handleAdd = async (playlist: Playlist) => {
        if (isSongInPlaylist(playlist.id, song.id)) {
            Alert.alert('Already Added', `"${song.name}" is already in "${playlist.name}".`);
            return;
        }
        await addSongToPlaylist(playlist.id, song);
        Alert.alert('Added', `"${song.name}" added to "${playlist.name}".`);
        onClose();
    };

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        const pl = await createPlaylist(name);
        await addSongToPlaylist(pl.id, song);
        setNewName('');
        setShowCreate(false);
        Alert.alert('Created & Added', `"${song.name}" added to "${pl.name}".`);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: c.sheetBg }]} onPress={() => { }}>
                    <View style={[styles.handle, { backgroundColor: c.muted }]} />
                    <Text style={[styles.title, { color: c.text }]}>Add to Playlist</Text>

                    <TouchableOpacity style={[styles.createRow, { borderColor: c.border }]} onPress={() => setShowCreate(!showCreate)}>
                        <Ionicons name="add-circle-outline" size={22} color={c.accent} />
                        <Text style={[styles.createText, { color: c.accent }]}>Create New Playlist</Text>
                    </TouchableOpacity>

                    {showCreate && (
                        <View style={styles.createInputRow}>
                            <TextInput
                                style={[styles.createInput, { color: c.text, borderColor: c.border, backgroundColor: c.card }]}
                                placeholder="Playlist name"
                                placeholderTextColor={c.muted}
                                value={newName}
                                onChangeText={setNewName}
                                autoFocus
                            />
                            <TouchableOpacity style={[styles.createBtn, { backgroundColor: c.accent }]} onPress={handleCreate}>
                                <Ionicons name="checkmark" size={20} color={c.playBtnText} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <FlatList
                        data={playlists}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => {
                            const already = isSongInPlaylist(item.id, song.id);
                            return (
                                <TouchableOpacity
                                    style={styles.playlistRow}
                                    onPress={() => handleAdd(item)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[styles.playlistIcon, { backgroundColor: c.card }]}>
                                        <Ionicons name="musical-notes" size={18} color={c.accent} />
                                    </View>
                                    <View style={styles.playlistInfo}>
                                        <Text style={[styles.playlistName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                                        <Text style={[styles.playlistMeta, { color: c.muted }]}>{item.songs.length} songs</Text>
                                    </View>
                                    {already && <Ionicons name="checkmark-circle" size={20} color={c.accent} />}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: c.muted }]}>No playlists yet. Create one above!</Text>
                        }
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 30, maxHeight: '70%', minHeight: '40%' },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
    title: { fontSize: 20, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12 },
    createRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, gap: 10 },
    createText: { fontSize: 16, fontWeight: '600' },
    createInputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, gap: 10 },
    createInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
    createBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    playlistRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    playlistIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    playlistInfo: { flex: 1, marginLeft: 14 },
    playlistName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    playlistMeta: { fontSize: 12 },
    emptyText: { textAlign: 'center', marginTop: 30, fontSize: 14 },
});
