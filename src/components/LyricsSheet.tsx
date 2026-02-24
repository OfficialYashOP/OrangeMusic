import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Pressable,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';
import { usePlayerStore } from '../store/playerStore';
import { getLyrics } from '../api/saavn';
import { aiService } from '../services/aiService';
import { getArtistNames } from '../types/song';

interface LyricsSheetProps {
    visible: boolean;
    onClose: () => void;
}

export default function LyricsSheet({ visible, onClose }: LyricsSheetProps) {
    const c = useTheme();
    const currentSong = usePlayerStore((s) => s.currentSong);
    const [lyrics, setLyrics] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null);
    const [explaining, setExplaining] = useState(false);

    useEffect(() => {
        if (!visible || !currentSong) return;

        setLyrics(null);
        setError(false);
        setExplanation(null);

        if (!currentSong.hasLyrics) {
            setError(true);
            return;
        }

        (async () => {
            setLoading(true);
            try {
                const result = await getLyrics(currentSong.id);
                if (result.success && result.data?.lyrics) {
                    // Clean HTML tags from lyrics
                    const clean = result.data.lyrics
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<[^>]*>/g, '')
                        .trim();
                    setLyrics(clean);
                } else {
                    setError(true);
                }
            } catch (_) {
                setError(true);
            }
            setLoading(false);
        })();
    }, [visible, currentSong]);

    const handleExplain = async () => {
        if (!currentSong) return;
        setExplaining(true);
        const meaning = await aiService.explainLyrics(
            currentSong.name,
            getArtistNames(currentSong),
            lyrics || undefined
        );
        setExplanation(meaning);
        setExplaining(false);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: c.sheetBg }]} onPress={() => { }}>
                    <View style={[styles.handle, { backgroundColor: c.muted }]} />

                    <View style={styles.header}>
                        <Text style={[styles.title, { color: c.text }]}>Lyrics</Text>
                        <TouchableBtn onPress={onClose}>
                            <Ionicons name="close" size={22} color={c.muted} />
                        </TouchableBtn>
                    </View>

                    {currentSong && (
                        <Text style={[styles.songName, { color: c.accent }]} numberOfLines={1}>
                            {currentSong.name}
                        </Text>
                    )}

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.lyricsContent}
                    >
                        {loading && (
                            <ActivityIndicator
                                size="large"
                                color={c.accent}
                                style={{ marginTop: 40 }}
                            />
                        )}
                        <View>
                            <Pressable
                                style={[styles.aiBtn, { backgroundColor: c.accent + '20', borderColor: c.accent }]}
                                onPress={handleExplain}
                                disabled={explaining}
                            >
                                <Ionicons name={explaining ? "hourglass-outline" : "sparkles"} size={18} color={c.accent} />
                                <Text style={[styles.aiBtnText, { color: c.accent }]}>
                                    {explaining ? 'Analyzing...' : '✨ AI Explain Meaning'}
                                </Text>
                            </Pressable>

                            {explanation && (
                                <View style={[styles.aiCard, { backgroundColor: c.card, borderColor: c.border }]}>
                                    <View style={styles.aiCardHeader}>
                                        <Ionicons name="sparkles" size={16} color={c.accent} />
                                        <Text style={[styles.aiCardTitle, { color: c.accent }]}>AI Meaning</Text>
                                    </View>
                                    <Text style={[styles.aiCardText, { color: c.text }]}>{explanation}</Text>
                                </View>
                            )}

                            {error && !loading && (
                                <View style={styles.noLyrics}>
                                    <Ionicons name="musical-note-outline" size={48} color={c.muted} />
                                    <Text style={[styles.noLyricsText, { color: c.text }]}>
                                        Lyrics Missing
                                    </Text>
                                    <Text style={[styles.noLyricsSub, { color: c.muted }]}>
                                        Official lyrics aren't here, but Gemini can still explain the song vibe!
                                    </Text>
                                </View>
                            )}

                            {lyrics && !loading && (
                                <Text style={[styles.lyricsText, { color: c.textSecondary }]}>
                                    {lyrics}
                                </Text>
                            )}
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// Simple touchable wrapper to avoid import
function TouchableBtn({ children, onPress }: { children: React.ReactNode; onPress: () => void }) {
    return (
        <Pressable onPress={onPress} style={{ padding: 4 }}>
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingBottom: 40,
        maxHeight: '80%',
        minHeight: '50%',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 6,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    songName: {
        fontSize: 15,
        fontWeight: '600',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    lyricsContent: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    lyricsText: {
        fontSize: 17,
        lineHeight: 28,
        fontWeight: '400',
    },
    noLyrics: {
        alignItems: 'center',
        paddingTop: 50,
    },
    noLyricsText: {
        fontSize: 18,
        fontWeight: '700',
        marginTop: 14,
    },
    noLyricsSub: {
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
    },
    aiBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
        gap: 8,
    },
    aiBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    aiCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
    },
    aiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 6,
    },
    aiCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    aiCardText: {
        fontSize: 15,
        lineHeight: 24,
    }
});
