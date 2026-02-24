import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    Image,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../store/themeStore';
import { usePlayerStore } from '../store/playerStore';
import { searchSongs } from '../api/saavn';
import { audioService } from '../services/audioService';
import { Song, getImageUrl, getArtistNames } from '../types/song';
import SongOptionsSheet from '../components/SongOptionsSheet';
import SortModal, { SortOption } from '../components/SortModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ART_SIZE = SCREEN_WIDTH * 0.55;

export default function ArtistDetailScreen({ route, navigation }: any) {
    const c = useTheme();
    const insets = useSafeAreaInsets();
    const { artistName, artistImage } = route.params;
    const [songs, setSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const currentSong = usePlayerStore((s) => s.currentSong);

    const isPlaying = usePlayerStore((s) => s.isPlaying);

    const [optionsSong, setOptionsSong] = useState<Song | null>(null);
    const [optionsVisible, setOptionsVisible] = useState(false);

    const [sortOption, setSortOption] = useState<SortOption>('dateAdded');
    const [sortVisible, setSortVisible] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const result = await searchSongs(artistName, 0, 20);
                if (result.success) setSongs(result.data.results || []);
            } catch (_) { }
            setLoading(false);
        })();
    }, [artistName]);

    const sortedSongs = useMemo(() => {
        const copy = [...songs];
        switch (sortOption) {
            case 'ascending': return copy.sort((a, b) => a.name.localeCompare(b.name));
            case 'descending': return copy.sort((a, b) => b.name.localeCompare(a.name));
            case 'album': return copy.sort((a, b) => (a.album.name || '').localeCompare(b.album.name || ''));
            case 'year': return copy.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
            default: return copy;
        }
    }, [songs, sortOption]);

    const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
    const durHrs = Math.floor(totalDuration / 3600);
    const durMins = Math.floor((totalDuration % 3600) / 60);
    const durSecs = Math.floor(totalDuration % 60);
    const durStr = durHrs > 0
        ? `${String(durHrs).padStart(2, '0')}:${String(durMins).padStart(2, '0')}:${String(durSecs).padStart(2, '0')} mins`
        : `${String(durMins).padStart(2, '0')}:${String(durSecs).padStart(2, '0')} mins`;

    const handlePlayAll = useCallback(() => {
        if (songs.length > 0) audioService.playQueue(songs, 0);
    }, [songs]);

    const handleShuffle = useCallback(() => {
        if (songs.length === 0) return;
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        audioService.playQueue(shuffled, 0);
        usePlayerStore.getState().toggleShuffle();
    }, [songs]);

    const handlePlaySong = useCallback(
        async (index: number) => {
            await audioService.playQueue(songs, index);
        },
        [songs],
    );

    const navigateToArtist = useCallback((name: string, image: string) => {
        navigation.push('ArtistDetail', { artistName: name, artistImage: image });
    }, [navigation]);

    const navigateToAlbum = useCallback((song: Song) => {
        navigation.navigate('AlbumDetail', {
            albumName: song.album.name || song.name,
            albumImage: getImageUrl(song.image, '500x500'),
            albumArtist: getArtistNames(song),
            albumYear: song.year,
        });
    }, [navigation]);

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color={c.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.headerBtn}>
                    <Ionicons name="search-outline" size={22} color={c.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.artWrap}>
                <Image source={{ uri: artistImage }} style={[styles.art, { backgroundColor: c.card }]} />
            </View>

            <Text style={[styles.name, { color: c.text }]}>{artistName}</Text>
            <Text style={[styles.meta, { color: c.muted }]}>
                {songs.length} Songs  |  {durStr}
            </Text>

            <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.accent }]} onPress={handleShuffle}>
                    <Ionicons name="shuffle" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Shuffle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: c.card, borderWidth: 1, borderColor: c.accent }]}
                    onPress={handlePlayAll}
                >
                    <Ionicons name="play" size={18} color={c.accent} />
                    <Text style={[styles.actionBtnText, { color: c.accent }]}>Play</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.songsHeader}>
                <Text style={[styles.songsTitle, { color: c.text }]}>Songs</Text>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setSortVisible(true)}>
                    <Text style={[styles.sortText, { color: c.accent }]}>Sort</Text>
                    <Ionicons name="swap-vertical" size={14} color={c.accent} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={sortedSongs}
                    keyExtractor={(item, i) => `${item.id}-${i}`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: currentSong ? 140 : 80 }}
                    extraData={`${currentSong?.id}-${isPlaying}`}
                    renderItem={({ item, index }) => {
                        const isActive = currentSong?.id === item.id;
                        return (
                            <TouchableOpacity
                                style={styles.songRow}
                                onPress={() => handlePlaySong(index)}
                                activeOpacity={0.75}
                            >
                                <Image source={{ uri: getImageUrl(item.image, '150x150') }} style={[styles.songImg, { backgroundColor: c.card }]} />
                                <View style={styles.songInfo}>
                                    <Text style={[styles.songName, { color: isActive ? c.accent : c.text }]} numberOfLines={1}>
                                        {item.name}
                                    </Text>
                                    <Text style={[styles.songArtist, { color: c.muted }]} numberOfLines={1}>
                                        {getArtistNames(item)}
                                    </Text>
                                </View>
                                <TouchableOpacity onPress={() => handlePlaySong(index)} style={[styles.playCircle, { backgroundColor: c.accent }]}>
                                    <Ionicons name={isActive ? 'pause' : 'play'} size={15} color={c.playBtnText} style={!isActive ? { marginLeft: 2 } : undefined} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.moreBtn} onPress={() => { setOptionsSong(item); setOptionsVisible(true); }}>
                                    <Ionicons name="ellipsis-vertical" size={18} color={c.muted} />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            <SortModal visible={sortVisible} selected={sortOption} onSelect={setSortOption} onClose={() => setSortVisible(false)} />
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
    headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    artWrap: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
    art: { width: ART_SIZE, height: ART_SIZE, borderRadius: 22 },
    name: { fontSize: 26, fontWeight: '800', textAlign: 'center' },
    meta: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 18 },
    btnRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 30, marginBottom: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 28, paddingVertical: 13, paddingHorizontal: 26, marginHorizontal: 6, flex: 1 },
    actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF', marginLeft: 8 },
    songsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    songsTitle: { fontSize: 20, fontWeight: '700' },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortText: { fontSize: 16, fontWeight: '700' },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
    songImg: { width: 54, height: 54, borderRadius: 12 },
    songInfo: { flex: 1, marginLeft: 14, marginRight: 8 },
    songName: { fontSize: 17, fontWeight: '600', marginBottom: 3 },
    songArtist: { fontSize: 13 },
    playCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    moreBtn: { padding: 6 },
});
