import React from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Pressable,
    Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';

interface ArtistInfo {
    name: string;
    image: string;
    songCount?: number;
}

interface ArtistOptionsSheetProps {
    visible: boolean;
    artist: ArtistInfo | null;
    onClose: () => void;
    onPlay?: () => void;
    onPlayNext?: () => void;
    onAddToQueue?: () => void;
}

export default function ArtistOptionsSheet({
    visible,
    artist,
    onClose,
    onPlay,
    onPlayNext,
    onAddToQueue,
}: ArtistOptionsSheetProps) {
    const c = useTheme();

    if (!artist) return null;

    const handleShare = async () => {
        try {
            await Share.share({ message: `🎤 Check out ${artist.name}!` });
        } catch (_) { }
        onClose();
    };

    const actions: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }[] = [
        { icon: 'play-circle-outline', label: 'Play', onPress: () => { onPlay?.(); onClose(); } },
        { icon: 'play-skip-forward-outline', label: 'Play Next', onPress: () => { onPlayNext?.(); onClose(); } },
        { icon: 'time-outline', label: 'Add to Playing Queue', onPress: () => { onAddToQueue?.(); onClose(); } },
        { icon: 'add-circle-outline', label: 'Add to Playlist', onPress: () => onClose() },
        { icon: 'paper-plane-outline', label: 'Share', onPress: handleShare },
    ];

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: c.sheetBg }]} onPress={() => { }}>
                    <View style={[styles.handle, { backgroundColor: c.muted }]} />

                    <View style={styles.header}>
                        <Image source={{ uri: artist.image }} style={styles.thumb} />
                        <View style={styles.headerInfo}>
                            <Text style={[styles.artistName, { color: c.text }]} numberOfLines={1}>
                                {artist.name}
                            </Text>
                            {artist.songCount !== undefined && (
                                <Text style={[styles.meta, { color: c.muted }]}>
                                    {artist.songCount} Songs
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={[styles.divider, { backgroundColor: c.border }]} />

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
                </Pressable>
            </Pressable>
        </Modal>
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
        paddingBottom: 34,
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
        borderRadius: 26,
        backgroundColor: '#2A2A3A',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 14,
    },
    artistName: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    meta: {
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
