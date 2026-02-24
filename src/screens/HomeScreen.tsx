import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Image,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    Keyboard,
    ScrollView,
    Dimensions,
    Modal,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { searchSongs, getSongSuggestions, searchArtists, searchAlbums } from '../api/saavn';
import { Song, getImageUrl, getArtistNames } from '../types/song';
import { audioService } from '../services/audioService';
import { usePlayerStore } from '../store/playerStore';
import { useLibraryStore } from '../store/libraryStore';
import { useTheme } from '../store/themeStore';
import SortModal, { SortOption } from '../components/SortModal';
import SongOptionsSheet from '../components/SongOptionsSheet';
import ArtistOptionsSheet from '../components/ArtistOptionsSheet';
import { aiService } from '../services/aiService';
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;
const SUGGESTED_CARD_WIDTH = (SCREEN_WIDTH - 56) / 2.45;

type HomeTab = 'Suggested' | 'Songs' | 'Artists' | 'Albums';
const SEARCH_FILTERS = ['Songs', 'Artists', 'Albums'];

type ArtistResult = { id: string; name: string; image: string; url: string };
type AlbumResult = { id: string; name: string; image: string; artist: string; year: number | null };

// Dedup helpers
const dedup = (songs: Song[]): Song[] => {
    const seen = new Set<string>();
    return songs.filter((s) => {
        const key = s.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const dedupAlbums = (songs: Song[]): Song[] => {
    const seen = new Set<string>();
    return songs.filter((s) => {
        const key = (s.album.name || s.name).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export default function HomeScreen() {
    const c = useTheme();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState<HomeTab>('Suggested');
    const [songs, setSongs] = useState<Song[]>([]);
    const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);
    const [mostPlayedSongs, setMostPlayedSongs] = useState<Song[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    // Search
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Song[]>([]);
    const [artistSearchResults, setArtistSearchResults] = useState<ArtistResult[]>([]);
    const [albumSearchResults, setAlbumSearchResults] = useState<AlbumResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState(0);

    // Persistent recent searches
    const recentSearches = useLibraryStore((s) => s.recentSearches);
    const addRecentSearch = useLibraryStore((s) => s.addRecentSearch);
    const removeRecentSearch = useLibraryStore((s) => s.removeRecentSearch);
    const clearRecentSearches = useLibraryStore((s) => s.clearRecentSearches);

    // Sort
    const [sortOption, setSortOption] = useState<SortOption>('ascending');
    const [sortVisible, setSortVisible] = useState(false);

    // Song options
    const [optionsSong, setOptionsSong] = useState<Song | null>(null);
    const [optionsVisible, setOptionsVisible] = useState(false);

    // Artist options
    const [artistOptionsVisible, setArtistOptionsVisible] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState<{ name: string; image: string; songCount?: number } | null>(null);

    const currentSong = usePlayerStore((s) => s.currentSong);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // See All modal
    const [seeAllTitle, setSeeAllTitle] = useState('');
    const [seeAllList, setSeeAllList] = useState<Song[]>([]);
    const [seeAllVisible, setSeeAllVisible] = useState(false);

    const tabs: HomeTab[] = ['Suggested', 'Songs', 'Artists', 'Albums'];
    const bottomSpacing = currentSong ? 176 : 96;

    // AI State
    const smartMix = useLibraryStore((s) => s.smartMix);
    const setSmartMix = useLibraryStore((s) => s.setSmartMix);
    const favorites = useLibraryStore((s) => s.favorites);
    const [isGeneratingMix, setIsGeneratingMix] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');

    // Audio Recorder
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

    // Build artist data from songs
    const artistData = useMemo(() => {
        const artistMap = new Map<string, string>();
        [...suggestedSongs, ...mostPlayedSongs, ...songs].forEach((song) => {
            const name = song.artists.primary[0]?.name ?? song.artists.all[0]?.name;
            if (!name || artistMap.has(name)) return;
            artistMap.set(name, getImageUrl(song.image, '500x500'));
        });
        return Array.from(artistMap.entries())
            .map(([name, image]) => ({ name, image }))
            .slice(0, 12);
    }, [suggestedSongs, mostPlayedSongs, songs]);

    // Sort songs — also deduplicate by id
    const sortedSongs = useMemo(() => {
        const copy = dedup([...songs]);
        switch (sortOption) {
            case 'ascending': return copy.sort((a, b) => a.name.localeCompare(b.name));
            case 'descending': return copy.sort((a, b) => b.name.localeCompare(a.name));
            case 'artist': return copy.sort((a, b) => getArtistNames(a).localeCompare(getArtistNames(b)));
            case 'album': return copy.sort((a, b) => (a.album.name || '').localeCompare(b.album.name || ''));
            case 'year': return copy.sort((a, b) => (b.year || '').localeCompare(a.year || ''));
            default: return copy;
        }
    }, [songs, sortOption]);

    const sortLabel = useMemo(() => {
        const labels: Record<SortOption, string> = {
            ascending: 'Ascending', descending: 'Descending', artist: 'Artist',
            album: 'Album', year: 'Year', dateAdded: 'Date Added',
            dateModified: 'Date Modified', composer: 'Composer',
        };
        return labels[sortOption];
    }, [sortOption]);

    const fetchSongs = useCallback(async (pageNum: number, append = false) => {
        if (!append) setLoading(true);
        else setLoadingMore(true);
        try {
            const result = await searchSongs('bollywood hits', pageNum, 30);
            if (result.success && result.data.results) {
                const fresh = dedup(result.data.results);
                if (append) setSongs((prev) => dedup([...prev, ...fresh]));
                else setSongs(fresh);
                setHasMore(result.data.results.length >= 15);
            }
        } catch (_) { }
        setLoading(false);
        setLoadingMore(false);
    }, []);

    useEffect(() => {
        fetchSongs(0);
        (async () => {
            try {
                const [trending, popular] = await Promise.all([
                    searchSongs('trending hindi', 0, 10),
                    searchSongs('latest bollywood', 0, 10),
                ]);
                if (trending.success) setSuggestedSongs(dedup(trending.data.results || []));
                if (popular.success) setMostPlayedSongs(dedup(popular.data.results || []));
            } catch (_) { }
        })();

        // Generate AI Mix if empty
        if (favorites.length > 0 && smartMix.length === 0) {
            generateMix();
        }
    }, [fetchSongs]);

    const generateMix = async () => {
        setIsGeneratingMix(true);
        const mix = await aiService.generateSmartMix(favorites);
        if (mix && mix.length > 0) {
            setSmartMix(mix);
        }
        setIsGeneratingMix(false);
    };

    const startListening = async () => {
        try {
            Keyboard.dismiss();

            // Native Permission Request (Android Critical)
            const { granted } = await requestRecordingPermissionsAsync();
            if (!granted) {
                setVoiceStatus('Mic permission denied');
                return;
            }

            setVoiceStatus('Listening...');
            setIsListening(true);
            await recorder.prepareToRecordAsync();
            recorder.record();
        } catch (err: any) {
            console.error('Failed to start recording', err);
            setVoiceStatus('Error starting recorder');
            setIsListening(false);
        }
    };

    const stopListening = async () => {
        try {
            setVoiceStatus('Thinking...');
            recorder.stop();
            const uri = recorder.uri;
            if (uri) {
                const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                const songs = await aiService.processVoiceCommand(base64, 'audio/m4a');
                if (songs && songs.length > 0) {
                    setVoiceStatus('Playing your request!');
                    await audioService.playQueue(songs, 0);
                    setTimeout(() => setIsListening(false), 1500);
                } else {
                    setVoiceStatus("Couldn't find that.");
                    setTimeout(() => setIsListening(false), 2000);
                }
            } else {
                setIsListening(false);
            }
        } catch (err) {
            console.error('Failed to process voice', err);
            setIsListening(false);
        }
    };

    const handleSearch = useCallback((text: string) => {
        setSearchQuery(text);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!text.trim()) {
            setSearchResults([]);
            setArtistSearchResults([]);
            setAlbumSearchResults([]);
            setSearchLoading(false);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const filterName = SEARCH_FILTERS[activeFilter];
                if (filterName === 'Songs') {
                    const result = await searchSongs(text.trim(), 0, 20);
                    if (result.success) setSearchResults(result.data.results || []);
                    setArtistSearchResults([]);
                    setAlbumSearchResults([]);
                } else if (filterName === 'Artists') {
                    const result = await searchArtists(text.trim(), 0, 20);
                    if (result.success) {
                        setArtistSearchResults(
                            result.data.results.map((a: any) => ({
                                id: a.id,
                                name: a.name,
                                image: a.image?.length > 0 ? a.image[a.image.length - 1].url : '',
                                url: a.url,
                            }))
                        );
                    }
                    setSearchResults([]);
                    setAlbumSearchResults([]);
                } else if (filterName === 'Albums') {
                    const result = await searchAlbums(text.trim(), 0, 20);
                    if (result.success) {
                        setAlbumSearchResults(
                            result.data.results.map((a: any) => ({
                                id: a.id,
                                name: a.name,
                                image: a.image?.length > 0 ? a.image[a.image.length - 1].url : '',
                                artist: a.artists?.primary?.[0]?.name || '',
                                year: a.year,
                            }))
                        );
                    }
                    setSearchResults([]);
                    setArtistSearchResults([]);
                }
            } catch (_) {
                setSearchResults([]);
                setArtistSearchResults([]);
                setAlbumSearchResults([]);
            }
            setSearchLoading(false);
        }, 350);
    }, [activeFilter]);

    // Re-search when filter changes
    useEffect(() => {
        if (isSearching && searchQuery.trim()) {
            handleSearch(searchQuery);
        }
    }, [activeFilter]);

    const handleLoadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchSongs(nextPage, true);
    }, [page, loadingMore, hasMore, fetchSongs]);

    const handlePlaySong = useCallback(async (songList: Song[], index: number) => {
        Keyboard.dismiss();
        await audioService.playQueue(songList, index);
        try {
            const song = songList[index];
            const suggestions = await getSongSuggestions(song.id, 15);
            if (suggestions.success && suggestions.data) {
                const store = usePlayerStore.getState();
                suggestions.data.forEach((s) => store.addToQueue(s));
            }
        } catch (_) { }
    }, []);

    const formatSongDuration = (seconds: number | null) => {
        if (!seconds || seconds <= 0) return '--:-- mins';
        const m = String(Math.floor(seconds / 60)).padStart(2, '0');
        const s = String(Math.floor(seconds % 60)).padStart(2, '0');
        return `${m}:${s} mins`;
    };

    const openSongOptions = useCallback((song: Song) => {
        setOptionsSong(song);
        setOptionsVisible(true);
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

    const renderSongRow = useCallback(
        ({ item, index }: { item: Song; index: number }, songList: Song[]) => {
            const isActive = currentSong?.id === item.id;
            const isPlaying = usePlayerStore.getState().isPlaying;
            return (
                <TouchableOpacity
                    style={styles.songRow}
                    onPress={() => handlePlaySong(songList, index)}
                    activeOpacity={0.75}
                >
                    <Image source={{ uri: getImageUrl(item.image, '150x150') }} style={[styles.songRowImage, { backgroundColor: c.card }]} />
                    <View style={styles.songRowInfo}>
                        <Text style={[styles.songRowName, { color: isActive ? c.accent : c.text }]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.songRowMeta, { color: c.muted }]} numberOfLines={1}>
                            {getArtistNames(item)}  |  {formatSongDuration(item.duration)}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => handlePlaySong(songList, index)} style={[styles.playCircle, { backgroundColor: c.accent }]}>
                        <Ionicons
                            name={isActive && isPlaying ? 'pause' : 'play'}
                            size={16}
                            color={c.playBtnText}
                            style={isActive && isPlaying ? undefined : { marginLeft: 2 }}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.moreBtn} onPress={() => openSongOptions(item)}>
                        <Ionicons name="ellipsis-vertical" size={18} color={c.muted} />
                    </TouchableOpacity>
                </TouchableOpacity>
            );
        }, [currentSong, handlePlaySong, openSongOptions, c],
    );

    const renderSuggestedCard = useCallback(
        (item: Song, index: number, songList: Song[]) => (
            <TouchableOpacity
                key={`${item.id}-${index}`}
                style={styles.suggestedCard}
                activeOpacity={0.8}
                onPress={() => handlePlaySong(songList, index)}
            >
                <Image source={{ uri: getImageUrl(item.image, '500x500') }} style={[styles.suggestedImage, { backgroundColor: c.card }]} />
                <Text style={[styles.suggestedTitle, { color: c.text }]} numberOfLines={2}>{item.name}</Text>
            </TouchableOpacity>
        ), [handlePlaySong, c],
    );

    const renderArtistCircle = useCallback(
        (artist: { name: string; image: string }, index: number) => (
            <TouchableOpacity
                key={`${artist.name}-${index}`}
                style={styles.artistCard}
                onPress={() => navigateToArtist(artist.name, artist.image)}
                onLongPress={() => { setSelectedArtist(artist); setArtistOptionsVisible(true); }}
                activeOpacity={0.8}
            >
                <Image source={{ uri: artist.image }} style={[styles.artistImage, { backgroundColor: c.card }]} />
                <Text style={[styles.artistName, { color: c.text }]} numberOfLines={1}>{artist.name}</Text>
            </TouchableOpacity>
        ), [navigateToArtist, c],
    );

    const renderSection = (title: string, list: Song[], row: 'cards' | 'artists') => {
        if (list.length === 0 && row !== 'artists') return null;
        if (row === 'artists' && artistData.length === 0) return null;
        const openSeeAll = () => {
            if (row !== 'artists') {
                setSeeAllTitle(title);
                setSeeAllList(list);
                setSeeAllVisible(true);
            } else {
                setActiveTab('Artists');
            }
        };
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
                    <TouchableOpacity onPress={openSeeAll}>
                        <Text style={[styles.seeAll, { color: c.accent }]}>See All</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {row === 'artists'
                        ? artistData.map(renderArtistCircle)
                        : list.slice(0, 6).map((song, idx) => renderSuggestedCard(song, idx, list))}
                </ScrollView>
            </View>
        );
    };

    const closeSearch = () => {
        setIsSearching(false);
        setSearchQuery('');
        setSearchResults([]);
        setArtistSearchResults([]);
        setAlbumSearchResults([]);
        setSearchLoading(false);
    };

    const hasAnyResults = searchResults.length > 0 || artistSearchResults.length > 0 || albumSearchResults.length > 0;

    // ── SEARCH VIEW ──────────────────────────────────────────────
    if (isSearching) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
                <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />
                <View style={styles.searchTopRow}>
                    <TouchableOpacity onPress={closeSearch} style={styles.navIconBtn}>
                        <Ionicons name="arrow-back" size={23} color={c.text} />
                    </TouchableOpacity>
                    <View style={[styles.searchInputWrap, { borderColor: c.accent, backgroundColor: c.searchBg }]}>
                        <Ionicons name="search-outline" size={17} color={c.accent} />
                        <TextInput
                            style={[styles.searchInput, { color: c.text }]}
                            placeholder="Search songs, artists..."
                            placeholderTextColor={c.muted}
                            value={searchQuery}
                            onChangeText={handleSearch}
                            autoFocus
                            returnKeyType="search"
                            onSubmitEditing={() => addRecentSearch(searchQuery)}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setArtistSearchResults([]); setAlbumSearchResults([]); }}>
                                <Ionicons name="close" size={19} color={c.accent} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {searchQuery.length === 0 ? (
                    <View style={[styles.recentSearches, { borderTopColor: c.border }]}>
                        <View style={styles.recentHeader}>
                            <Text style={[styles.recentTitle, { color: c.text }]}>Recent Searches</Text>
                            <TouchableOpacity onPress={() => clearRecentSearches()}>
                                <Text style={[styles.clearAll, { color: c.accent }]}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                            {recentSearches.map((item) => (
                                <View key={item} style={[styles.recentItem, { borderBottomColor: c.border }]}>
                                    <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSearchQuery(item); handleSearch(item); }}>
                                        <Text style={[styles.recentItemText, { color: c.textSecondary }]}>{item}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => removeRecentSearch(item)}>
                                        <Ionicons name="close" size={20} color={c.muted} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {recentSearches.length === 0 && (
                                <Text style={[styles.emptySubtext, { color: c.muted, marginTop: 30, textAlign: 'center' }]}>
                                    No recent searches
                                </Text>
                            )}
                        </ScrollView>
                    </View>
                ) : (
                    <>
                        <View style={styles.filterRow}>
                            {SEARCH_FILTERS.map((chip, i) => (
                                <TouchableOpacity
                                    key={chip}
                                    style={[styles.filterChip, { borderColor: c.accent }, i === activeFilter && { backgroundColor: c.accent }]}
                                    onPress={() => setActiveFilter(i)}
                                >
                                    <Text style={[styles.filterChipText, { color: c.accent }, i === activeFilter && { color: c.playBtnText }]}>
                                        {chip}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {searchLoading ? (
                            <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 48 }} />
                        ) : !hasAnyResults ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="sad-outline" size={56} color={c.accent} />
                                <Text style={[styles.emptyText, { color: c.text }]}>Not Found</Text>
                                <Text style={[styles.emptySubtext, { color: c.muted }]}>
                                    Sorry, the keyword you entered cannot be found, please check again or search with another keyword.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {searchResults.length > 0 && (
                                    <FlatList
                                        data={searchResults}
                                        renderItem={({ item, index }) => renderSongRow({ item, index }, searchResults)}
                                        keyExtractor={(item, i) => `search-${item.id}-${i}`}
                                        contentContainerStyle={{ paddingBottom: bottomSpacing }}
                                        showsVerticalScrollIndicator={false}
                                    />
                                )}
                                {artistSearchResults.length > 0 && (
                                    <FlatList
                                        data={artistSearchResults}
                                        keyExtractor={(item, i) => `artist-search-${item.id}-${i}`}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingBottom: bottomSpacing }}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.artistRow}
                                                onPress={() => { addRecentSearch(searchQuery); navigateToArtist(item.name, item.image); }}
                                                activeOpacity={0.75}
                                            >
                                                <Image source={{ uri: item.image }} style={[styles.artistRowImage, { backgroundColor: c.card }]} />
                                                <View style={styles.artistRowInfo}>
                                                    <Text style={[styles.artistRowName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                                                    <Text style={[styles.artistRowMeta, { color: c.muted }]}>Artist</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    />
                                )}
                                {albumSearchResults.length > 0 && (
                                    <FlatList
                                        data={albumSearchResults}
                                        numColumns={2}
                                        keyExtractor={(item, i) => `album-search-${item.id}-${i}`}
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={{ paddingBottom: bottomSpacing, paddingTop: 10 }}
                                        columnWrapperStyle={styles.albumGridRow}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.albumCard}
                                                activeOpacity={0.85}
                                                onPress={() => {
                                                    addRecentSearch(searchQuery);
                                                    navigation.navigate('AlbumDetail', {
                                                        albumName: item.name,
                                                        albumImage: item.image,
                                                        albumArtist: item.artist,
                                                        albumYear: item.year ? String(item.year) : null,
                                                    });
                                                }}
                                            >
                                                <Image source={{ uri: item.image }} style={[styles.albumCardImage, { backgroundColor: c.card }]} />
                                                <Text style={[styles.albumCardTitle, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                                                <Text style={[styles.albumCardSub, { color: c.muted }]} numberOfLines={1}>
                                                    {item.artist}  |  {item.year || ''}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                )}
                            </>
                        )}
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

    // ── MAIN VIEW ────────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />

            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Ionicons name="musical-notes" size={24} color={c.accent} />
                    <Text style={[styles.logoText, { color: c.text }]}>OrangeMusic</Text>
                </View>
                <TouchableOpacity onPress={() => setIsSearching(true)} style={styles.searchBtn}>
                    <Ionicons name="search-outline" size={24} color={c.text} />
                </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRowContainer, { borderBottomColor: c.border }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.tabRow, { paddingRight: 40 }]}
                >
                    {tabs.map((tab) => (
                        <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={styles.tabItem}>
                            <Text style={[styles.tabText, { color: c.muted }, activeTab === tab && { color: c.accent, fontWeight: '700' }]}>{tab}</Text>
                            {activeTab === tab && <View style={[styles.tabUnderline, { backgroundColor: c.accent }]} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* TAB CONTENT - each tab occupies the full remaining space */}
            <View style={styles.tabContent}>
                {/* Suggested Tab */}
                {activeTab === 'Suggested' && (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomSpacing }}>
                        {loading ? (
                            <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 48 }} />
                        ) : (
                            <>
                                {renderSection('Recently Played', suggestedSongs, 'cards')}
                                {isGeneratingMix ? (
                                    <View style={[styles.section, { alignItems: 'center', paddingVertical: 20 }]}>
                                        <ActivityIndicator size="small" color={c.accent} />
                                        <Text style={{ color: c.muted, marginTop: 8 }}>AI DJ is mixing...</Text>
                                    </View>
                                ) : smartMix.length > 0 ? (
                                    renderSection('Made for You (AI Smart Mix)', smartMix, 'cards')
                                ) : favorites.length > 0 ? (
                                    <View style={[styles.section, { alignItems: 'center', paddingVertical: 10 }]}>
                                        <TouchableOpacity onPress={generateMix} style={[styles.aiBtn, { backgroundColor: c.card, borderColor: c.accent + '40' }]}>
                                            <Ionicons name="sparkles" size={18} color={c.accent} />
                                            <Text style={{ color: c.text, marginLeft: 8, fontWeight: '600' }}>Refresh Smart Mix</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={[styles.section, { paddingHorizontal: 20 }]}>
                                        <View style={[styles.aiEmptyCard, { backgroundColor: c.card }]}>
                                            <Ionicons name="sparkles-outline" size={24} color={c.accent} />
                                            <Text style={[styles.aiEmptyText, { color: c.text }]}>Start loving songs to get AI recommendations!</Text>
                                        </View>
                                    </View>
                                )}
                                {renderSection('Artists', songs, 'artists')}
                                {renderSection('Most Played', mostPlayedSongs, 'cards')}
                            </>
                        )}
                    </ScrollView>
                )}

                {/* Songs Tab */}
                {activeTab === 'Songs' && (
                    <>
                        <View style={[styles.songCountRow, { borderBottomColor: c.border }]}>
                            <Text style={[styles.songCount, { color: c.text }]}>{sortedSongs.length} songs</Text>
                            <TouchableOpacity style={styles.sortBtn} onPress={() => setSortVisible(true)}>
                                <Text style={[styles.sortText, { color: c.accent }]}>{sortLabel}</Text>
                                <Ionicons name="swap-vertical" size={14} color={c.accent} />
                            </TouchableOpacity>
                        </View>

                        {loading ? (
                            <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 48 }} />
                        ) : (
                            <FlatList
                                data={sortedSongs}
                                renderItem={({ item, index }) => renderSongRow({ item, index }, sortedSongs)}
                                keyExtractor={(item, i) => `${item.id}-${i}`}
                                contentContainerStyle={{ paddingBottom: bottomSpacing }}
                                onEndReached={handleLoadMore}
                                onEndReachedThreshold={0.45}
                                showsVerticalScrollIndicator={false}
                                ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={c.accent} style={{ paddingVertical: 20 }} /> : null}
                            />
                        )}
                    </>
                )}

                {/* Artists Tab */}
                {activeTab === 'Artists' && (
                    <>
                        <View style={[styles.songCountRow, { borderBottomColor: c.border }]}>
                            <Text style={[styles.songCount, { color: c.text }]}>{artistData.length} artists</Text>
                            <TouchableOpacity style={styles.sortBtn}>
                                <Text style={[styles.sortText, { color: c.accent }]}>Date Added</Text>
                                <Ionicons name="swap-vertical" size={14} color={c.accent} />
                            </TouchableOpacity>
                        </View>
                        {loading ? (
                            <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 48 }} />
                        ) : (
                            <FlatList
                                data={artistData}
                                keyExtractor={(item, i) => `artist-${item.name}-${i}`}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: bottomSpacing }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.artistRow}
                                        onPress={() => navigateToArtist(item.name, item.image)}
                                        onLongPress={() => { setSelectedArtist(item); setArtistOptionsVisible(true); }}
                                        activeOpacity={0.75}
                                    >
                                        <Image source={{ uri: item.image }} style={[styles.artistRowImage, { backgroundColor: c.card }]} />
                                        <View style={styles.artistRowInfo}>
                                            <Text style={[styles.artistRowName, { color: c.text }]} numberOfLines={1}>{item.name}</Text>
                                            <Text style={[styles.artistRowMeta, { color: c.muted }]}>Artist</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </>
                )}

                {/* Albums Tab */}
                {activeTab === 'Albums' && (
                    <>
                        <View style={[styles.songCountRow, { borderBottomColor: c.border }]}>
                            <Text style={[styles.songCount, { color: c.text }]}>{dedupAlbums(songs).length} albums</Text>
                            <TouchableOpacity style={styles.sortBtn}>
                                <Text style={[styles.sortText, { color: c.accent }]}>Date Modified</Text>
                                <Ionicons name="swap-vertical" size={14} color={c.accent} />
                            </TouchableOpacity>
                        </View>
                        {loading ? (
                            <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 48 }} />
                        ) : (
                            <FlatList
                                data={dedupAlbums(songs)}
                                numColumns={2}
                                keyExtractor={(item, i) => `album-${item.id}-${i}`}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: bottomSpacing, paddingTop: 10 }}
                                columnWrapperStyle={styles.albumGridRow}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.albumCard}
                                        activeOpacity={0.85}
                                        onPress={() => navigateToAlbum(item)}
                                    >
                                        <Image source={{ uri: getImageUrl(item.image, '500x500') }} style={[styles.albumCardImage, { backgroundColor: c.card }]} />
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={[styles.albumCardTitle, { color: c.text }]} numberOfLines={1}>{item.album.name || item.name}</Text>
                                            <TouchableOpacity onPress={() => openSongOptions(item)}>
                                                <Ionicons name="ellipsis-vertical" size={16} color={c.muted} />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={[styles.albumCardSub, { color: c.muted }]} numberOfLines={1}>
                                            {getArtistNames(item)}  |  {item.year || ''}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </>
                )}
            </View>

            <SortModal visible={sortVisible} selected={sortOption} onSelect={setSortOption} onClose={() => setSortVisible(false)} />
            <SongOptionsSheet
                visible={optionsVisible}
                song={optionsSong}
                onClose={() => setOptionsVisible(false)}
                onNavigateArtist={navigateToArtist}
                onNavigateAlbum={navigateToAlbum}
            />
            <ArtistOptionsSheet
                visible={artistOptionsVisible}
                artist={selectedArtist}
                onClose={() => setArtistOptionsVisible(false)}
            />

            <Modal visible={seeAllVisible} transparent animationType="slide" onRequestClose={() => setSeeAllVisible(false)}>
                <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setSeeAllVisible(false)} style={styles.headerBtn}>
                            <Ionicons name="arrow-back" size={24} color={c.text} />
                        </TouchableOpacity>
                        <Text style={[styles.sectionTitle, { color: c.text, flex: 1, marginLeft: 10 }]}>{seeAllTitle}</Text>
                    </View>
                    <FlatList
                        data={seeAllList}
                        keyExtractor={(item, i) => `seeall-${item.id}-${i}`}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: bottomSpacing }}
                        renderItem={({ item, index }) => renderSongRow({ item, index }, seeAllList)}
                    />
                </View>
            </Modal>

            {/* AI Voice FAB */}
            <Pressable
                style={[
                    styles.fab,
                    { bottom: bottomSpacing - 50, backgroundColor: isListening ? c.text : c.accent }
                ]}
                onPressIn={startListening}
                onPressOut={stopListening}
            >
                <Ionicons name="mic-outline" size={28} color={isListening ? c.bg : '#fff'} />
            </Pressable>

            {voiceStatus !== '' && (
                <View style={[styles.voiceToast, { bottom: bottomSpacing + 20, backgroundColor: c.card }]}>
                    <Text style={{ color: c.text, fontWeight: 'bold' }}>{voiceStatus}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
    headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
    searchBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    tabRowContainer: { borderBottomWidth: 1 },
    tabRow: { paddingHorizontal: 20, gap: 24 },
    tabItem: { paddingTop: 8, paddingBottom: 12 },
    tabText: { fontSize: 16, fontWeight: '500' },
    tabUnderline: { marginTop: 9, height: 3, borderRadius: 2 },
    tabContent: { flex: 1 },
    section: { marginTop: 22 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
    sectionTitle: { fontSize: 18, fontWeight: '700' },
    seeAll: { fontSize: 16, fontWeight: '700' },
    horizontalScroll: { paddingHorizontal: 20, gap: 14 },
    suggestedCard: { width: SUGGESTED_CARD_WIDTH },
    suggestedImage: { width: SUGGESTED_CARD_WIDTH, height: SUGGESTED_CARD_WIDTH, borderRadius: 22, marginBottom: 10 },
    suggestedTitle: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
    artistCard: { width: 150, alignItems: 'center' },
    artistImage: { width: 134, height: 134, borderRadius: 67, marginBottom: 8 },
    artistName: { fontSize: 16, fontWeight: '500' },
    songCountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
    songCount: { fontSize: 18, fontWeight: '700' },
    sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sortText: { fontSize: 16, fontWeight: '700' },
    songRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 11 },
    songRowImage: { width: 64, height: 64, borderRadius: 14 },
    songRowInfo: { flex: 1, marginLeft: 14, marginRight: 8 },
    songRowName: { fontSize: 19, fontWeight: '600', marginBottom: 4 },
    songRowMeta: { fontSize: 13 },
    playCircle: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    moreBtn: { padding: 6 },
    artistRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    artistRowImage: { width: 60, height: 60, borderRadius: 30 },
    artistRowInfo: { flex: 1, marginLeft: 14 },
    artistRowName: { fontSize: 17, fontWeight: '600', marginBottom: 3 },
    artistRowMeta: { fontSize: 13 },
    albumGridRow: { justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
    albumCard: { width: ALBUM_CARD_WIDTH },
    albumCardImage: { width: ALBUM_CARD_WIDTH, height: ALBUM_CARD_WIDTH, borderRadius: 18, marginBottom: 8 },
    albumCardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
    albumCardSub: { fontSize: 13, marginTop: 2 },
    searchTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, gap: 10 },
    navIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
    searchInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, height: 48, gap: 8 },
    searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
    filterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 8 },
    filterChip: { borderWidth: 1.4, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 7 },
    filterChipText: { fontSize: 14, fontWeight: '600' },
    recentSearches: { flex: 1, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
    recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    recentTitle: { fontSize: 18, fontWeight: '700' },
    clearAll: { fontSize: 16, fontWeight: '700' },
    recentItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
    recentItemText: { fontSize: 17, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', paddingTop: 90, paddingHorizontal: 40 },
    emptyText: { marginTop: 14, fontSize: 22, fontWeight: '700' },
    emptySubtext: { marginTop: 8, fontSize: 14, textAlign: 'center', lineHeight: 21 },
    fab: { position: 'absolute', right: 20, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
    voiceToast: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
    aiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    aiEmptyCard: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#ccc4',
    },
    aiEmptyText: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 22,
    }
});
