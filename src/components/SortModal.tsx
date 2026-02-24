import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/themeStore';

export type SortOption =
    | 'ascending'
    | 'descending'
    | 'artist'
    | 'album'
    | 'year'
    | 'dateAdded'
    | 'dateModified'
    | 'composer';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
    { key: 'ascending', label: 'Ascending' },
    { key: 'descending', label: 'Descending' },
    { key: 'artist', label: 'Artist' },
    { key: 'album', label: 'Album' },
    { key: 'year', label: 'Year' },
    { key: 'dateAdded', label: 'Date Added' },
    { key: 'dateModified', label: 'Date Modified' },
    { key: 'composer', label: 'Composer' },
];

interface SortModalProps {
    visible: boolean;
    selected: SortOption;
    onSelect: (option: SortOption) => void;
    onClose: () => void;
}

export default function SortModal({ visible, selected, onSelect, onClose }: SortModalProps) {
    const c = useTheme();

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={[styles.overlay, { backgroundColor: c.overlay }]} onPress={onClose}>
                <View style={[styles.menu, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
                    {SORT_OPTIONS.map((opt) => (
                        <TouchableOpacity
                            key={opt.key}
                            style={styles.menuItem}
                            onPress={() => {
                                onSelect(opt.key);
                                onClose();
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.menuText, { color: c.text }]}>{opt.label}</Text>
                            <Ionicons
                                name={selected === opt.key ? 'radio-button-on' : 'radio-button-off'}
                                size={20}
                                color={c.accent}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 24,
        paddingTop: 140,
    },
    menu: {
        borderRadius: 14,
        paddingVertical: 8,
        paddingHorizontal: 4,
        width: 220,
        borderWidth: 1,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    menuText: {
        fontSize: 15,
        fontWeight: '500',
    },
});
