import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Pressable,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';
import { Song, getArtistNames } from '../types/song';
import { aiService } from '../services/aiService';
import { ActivityIndicator } from 'react-native';

interface SongDetailsModalProps {
    visible: boolean;
    song: Song | null;
    onClose: () => void;
}

export default function SongDetailsModal({ visible, song, onClose }: SongDetailsModalProps) {
    const c = useTheme();
    const [trivia, setTrivia] = React.useState<string | null>(null);
    const [loadingTrivia, setLoadingTrivia] = React.useState(false);

    React.useEffect(() => {
        if (!visible) {
            setTrivia(null);
            setLoadingTrivia(false);
        }
    }, [visible]);

    const fetchTrivia = async () => {
        if (!song) return;
        setLoadingTrivia(true);
        const result = await aiService.getSongTrivia(song.name, getArtistNames(song));
        setTrivia(result);
        setLoadingTrivia(false);
    };

    if (!song) return null;

    const formatSongDuration = () => {
        if (!song.duration) return '--:--';
        const m = String(Math.floor(song.duration / 60)).padStart(2, '0');
        const s = String(Math.floor(song.duration % 60)).padStart(2, '0');
        return `${m}:${s} mins`;
    };

    const DetailRow = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
        <View style={[styles.detailRow, { borderBottomColor: c.border }]}>
            <View style={styles.rowLabel}>
                <Ionicons name={icon} size={18} color={c.accent} style={{ marginRight: 12 }} />
                <Text style={[styles.labelText, { color: c.textSecondary }]}>{label}</Text>
            </View>
            <Text style={[styles.valueText, { color: c.text }]} numberOfLines={2}>{value}</Text>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: c.sheetBg }]} onPress={() => { }}>
                    <View style={[styles.handle, { backgroundColor: c.muted }]} />

                    <View style={styles.header}>
                        <Text style={[styles.title, { color: c.text }]}>Song Details</Text>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color={c.text} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        <DetailRow icon="musical-note" label="Song" value={song.name} />
                        <DetailRow icon="person" label="Artist" value={getArtistNames(song)} />
                        <DetailRow icon="disc" label="Album" value={song.album.name || 'Unknown Album'} />
                        <DetailRow icon="calendar" label="Year" value={String(song.year || 'Unknown')} />
                        <DetailRow icon="time" label="Duration" value={formatSongDuration()} />
                        <DetailRow icon="language" label="Language" value={song.language || 'Unknown'} />
                        <DetailRow icon="pricetag" label="Label" value={song.label || 'Unknown Label'} />
                        <DetailRow icon="document-text" label="Lyrics" value={song.hasLyrics ? 'Available' : 'Not available'} />
                        <DetailRow icon="eye" label="Explicit" value={song.explicitContent ? 'Yes' : 'No'} />
                        <DetailRow icon="play" label="Play Count" value={song.playCount ? song.playCount.toLocaleString() : 'N/A'} />
                        <DetailRow icon="wifi" label="Audio Origin" value={song.downloadUrl ? 'JioSaavn Server' : 'Local File'} />

                        <View style={styles.triviaSection}>
                            <Pressable
                                style={[styles.triviaBtn, { backgroundColor: c.accent + '15', borderColor: c.accent }]}
                                onPress={fetchTrivia}
                                disabled={loadingTrivia}
                            >
                                <Ionicons name={loadingTrivia ? "hourglass" : "sparkles"} size={18} color={c.accent} />
                                <Text style={[styles.triviaBtnText, { color: c.accent }]}>
                                    {loadingTrivia ? 'Asking Gemini...' : '✨ Get AI Trivia'}
                                </Text>
                            </Pressable>

                            {trivia && (
                                <View style={[styles.triviaCard, { backgroundColor: c.card, borderColor: c.border }]}>
                                    <View style={styles.aiCardHeader}>
                                        <Ionicons name="bulb-outline" size={16} color={c.accent} />
                                        <Text style={[styles.aiCardTitle, { color: c.accent }]}>Did You Know?</Text>
                                    </View>
                                    <Text style={[styles.triviaText, { color: c.text }]}>{trivia}</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    sheet: {
        width: '100%',
        maxHeight: '70%',
        borderRadius: 24,
        paddingBottom: 20,
        overflow: 'hidden',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
    },
    closeBtn: {
        padding: 4,
    },
    content: {
        paddingHorizontal: 20,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    rowLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 0.4,
    },
    labelText: {
        fontSize: 14,
        fontWeight: '600',
    },
    valueText: {
        fontSize: 15,
        fontWeight: '700',
        flex: 0.6,
        textAlign: 'right',
    },
    triviaSection: {
        marginTop: 20,
        marginBottom: 10,
    },
    triviaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        gap: 8,
    },
    triviaBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    triviaCard: {
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    aiCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    aiCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    triviaText: {
        fontSize: 14,
        lineHeight: 22,
    }
});
