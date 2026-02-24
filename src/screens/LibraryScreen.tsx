import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';
import { Song, getImageUrl, getArtistNames } from '../types/song';
import SongOptionsSheet from '../components/SongOptionsSheet';

type LibraryTab = 'Favorites' | 'Downloads';

export default function LibraryScreen({ navigation }: any) {
    const c = useTheme();
    const insets = useSafeAreaInsets();

    const favorites = useLibraryStore((s) => s.favorites);
    const downloads = useLibraryStore((s) => s.downloads);
    const currentSong = usePlayerStore((s) => s.currentSong);

    const [activeTab, setActiveTab] = useState<LibraryTab>('Favorites');
    const [optionsSong, setOptionsSong] = useState<Song | null>(null);
    const [optionsVisible, setOptionsVisible] = useState(false);

    const items = activeTab === 'Favorites' ? favorites : downloads;
    const bottomSpacing = currentSong ? 176 : 96;

    const handlePlaySong = useCallback(async (list: Song[], index: number) => {
        await audioService.playQueue(list, index);
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

    const formatDur = (seconds: number | null) => {
        if (!seconds || seconds <= 0) return '--:-- mins';
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        return `${m}:${s} mins`;
    };

    const renderSongItem = useCallback(
        ({ item, index }: { item: Song; index: number }) => {
            const isActive = currentSong?.id === item.id;
            const isPlaying = usePlayerStore.getState().isPlaying;

            return (
                <TouchableOpacity
                    style={styles.songRow}
                    onPress={() => handlePlaySong(items, index)}
                    activeOpacity={0.75}
                >
                    <Image source={{ uri: getImageUrl(item.image, '150x150') }} style={[styles.songRowImage, { backgroundColor: c.card }]} />
                    <View style={styles.songRowInfo}>
                        <Text style={[styles.songRowName, { color: isActive ? c.accent : c.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.songRowMeta, { color: c.muted }]} numberOfLines={1}>
                            {getArtistNames(item)}  |  {formatDur(item.duration)}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => handlePlaySong(items, index)} style={[styles.playCircle, { backgroundColor: c.accent }]}>
                        <Ionicons
                            name={isActive && isPlaying ? 'pause' : 'play'}
                            size={16}
                            color={c.playBtnText}
                            style={isActive && isPlaying ? undefined : { marginLeft: 2 }}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.moreBtn} onPress={() => { setOptionsSong(item); setOptionsVisible(true); }}>
                        <Ionicons name="ellipsis-vertical" size={18} color={c.muted} />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        },
        [currentSong, items, handlePlaySong, c],
    );

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />

            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Ionicons name="musical-notes" size={24} color={c.accent} />
                    <Text style={[styles.logoText, { color: c.text }]}>OrangeMusic</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
                {(['Favorites', 'Downloads'] as LibraryTab[]).map((tab) => (
                    <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                        <View style={styles.tabItemInner}>
                            <Ionicons
                                name={tab === 'Favorites' ? 'heart' : 'download'}
                                size={16}
                                color={activeTab === tab ? c.accent : c.muted}
                            />
                            <Text style={[styles.tabText, { color: activeTab === tab ? c.accent : c.muted }, activeTab === tab && { fontWeight: '700' }]}>
                                {tab} ({tab === 'Favorites' ? favorites.length : downloads.length})
                            </Text>
                        </View>
                        {activeTab === tab && <View style={[styles.tabUnderline, { backgroundColor: c.accent }]} />}
                    </TouchableOpacity>
                ))}
            </View>

            {items.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons
                        name={activeTab === 'Favorites' ? 'heart-outline' : 'download-outline'}
                        size={64}
                        color={c.accent}
                    />
                    <Text style={[styles.emptyTitle, { color: c.text }]}>
                        {activeTab === 'Favorites' ? 'No Favorites Yet' : 'No Downloads Yet'}
                    </Text>
                    <Text style={[styles.emptySub, { color: c.muted }]}>
                        {activeTab === 'Favorites'
                            ? 'Tap the heart icon on any song to add it to your favorites.'
                            : 'Use the download option on any song to save it for offline listening.'}
                    </Text>
                </View>
            ) : (
                <>
                    <View style={styles.songCountRow}>
                        <Text style={[styles.songCount, { color: c.text }]}>
                            {items.length} {items.length === 1 ? 'song' : 'songs'}
                        </Text>
                        {items.length > 1 && (
                            <TouchableOpacity
                                style={[styles.shuffleAllBtn, { backgroundColor: c.accent }]}
                                onPress={() => {
                                    const shuffled = [...items].sort(() => Math.random() - 0.5);
                                    audioService.playQueue(shuffled, 0);
                                }}
                            >
                                <Ionicons name="shuffle-outline" size={16} color={c.playBtnText} />
                                <Text style={[styles.shuffleAllText, { color: c.playBtnText }]}>Shuffle All</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <FlatList
                        data={items}
                        renderItem={renderSongItem}
                        keyExtractor={(item, i) => `${activeTab}-${item.id}-${i}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: bottomSpacing }}
                    />
                </>
            )}

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
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
    tabRow: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 20 },
    tabItem: { marginRight: 24, paddingTop: 8, paddingBottom: 12 },
    tabItemInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabText: { fontSize: 16, fontWeight: '500' },
    tabUnderline: { marginTop: 9, height: 3, borderRadius: 2 },
    songCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
    songCount: { fontSize: 18, fontWeight: '700' },
    shuffleAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    shuffleAllText: { fontSize: 14, fontWeight: '700' },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 11 },
    songRowImage: { width: 64, height: 64, borderRadius: 14 },
    songRowInfo: { flex: 1, marginLeft: 14, marginRight: 8 },
    songRowName: { fontSize: 19, fontWeight: '600', marginBottom: 4 },
    songRowMeta: { fontSize: 13 },
    playCircle: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    moreBtn: { padding: 6 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingBottom: 80 },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginTop: 16 },
    emptySub: { fontSize: 14, textAlign: 'center', marginTop: 10, lineHeight: 21 },
});
