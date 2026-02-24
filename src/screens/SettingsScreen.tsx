import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Switch,
    ScrollView,
    Modal,
    Pressable,
    Alert,
    ToastAndroid,
    Platform,
    TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useIsDark, useThemeStore } from '../store/themeStore';
import { useSettingsStore, AudioQuality } from '../store/settingsStore';
import { useLibraryStore } from '../store/libraryStore';
import { usePlayerStore } from '../store/playerStore';
import { audioService } from '../services/audioService';

const QUALITY_OPTIONS: AudioQuality[] = ['96kbps', '160kbps', '320kbps'];
const SLEEP_TIMER_OPTIONS: { label: string; value: number | null | 'custom' }[] = [
    { label: 'Off', value: null },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '60 minutes', value: 60 },
    { label: '90 minutes', value: 90 },
    { label: 'Custom', value: 'custom' },
];

export default function SettingsScreen({ navigation }: any) {
    const c = useTheme();
    const isDark = useIsDark();
    const toggleTheme = useThemeStore((s) => s.toggleTheme);
    const insets = useSafeAreaInsets();

    const audioQuality = useSettingsStore((s) => s.audioQuality);
    const downloadQuality = useSettingsStore((s) => s.downloadQuality);
    const sleepTimerMinutes = useSettingsStore((s) => s.sleepTimerMinutes);
    const setAudioQuality = useSettingsStore((s) => s.setAudioQuality);
    const setDownloadQuality = useSettingsStore((s) => s.setDownloadQuality);

    const downloads = useLibraryStore((s) => s.downloads);
    const clearDownloads = useLibraryStore((s) => s.clearDownloads);
    const clearRecentSearches = useLibraryStore((s) => s.clearRecentSearches);

    const currentSong = usePlayerStore((s) => s.currentSong);

    const [qualityModal, setQualityModal] = useState<'audio' | 'download' | null>(null);
    const [sleepModal, setSleepModal] = useState(false);
    const [customSleepPromptVisible, setCustomSleepPromptVisible] = useState(false);
    const [customSleepValue, setCustomSleepValue] = useState('');

    const handleSetSleepTimer = (val: number | null | 'custom') => {
        if (val === 'custom') {
            setSleepModal(false);
            setCustomSleepValue('');
            setCustomSleepPromptVisible(true);
            return;
        }
        if (val === null) {
            audioService.clearSleepTimer();
        } else {
            audioService.startSleepTimer(val);
        }
        setSleepModal(false);
    };

    const handleClearDownloads = () => {
        Alert.alert(
            'Clear Downloads',
            'Remove all downloaded song data?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => clearDownloads() },
            ]
        );
    };

    const handleClearSearchHistory = () => {
        Alert.alert(
            'Clear Search History',
            'Remove all recent search history?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: () => clearRecentSearches() },
            ]
        );
    };

    const handleViewDownloads = () => {
        // Navigate to Favorites tab which has Downloads
        try {
            navigation.navigate('Favorites');
        } catch (_) { }
    };

    const settingItems: {
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        value?: string;
        toggle?: boolean;
        onToggle?: () => void;
        onPress?: () => void;
    }[] = [
            { icon: 'moon-outline', label: 'Dark Mode', toggle: true, onToggle: toggleTheme },
            { icon: 'musical-notes-outline', label: 'Audio Quality', value: audioQuality, onPress: () => setQualityModal('audio') },
            { icon: 'download-outline', label: 'Download Quality', value: downloadQuality, onPress: () => setQualityModal('download') },
            { icon: 'timer-outline', label: 'Sleep Timer', value: sleepTimerMinutes ? `${sleepTimerMinutes} min` : 'Off', onPress: () => setSleepModal(true) },
            { icon: 'cloud-download-outline', label: 'Downloads', value: `${downloads.length} songs`, onPress: handleViewDownloads },
            { icon: 'trash-outline', label: 'Clear Downloads', onPress: handleClearDownloads },
            { icon: 'time-outline', label: 'Clear Search History', onPress: handleClearSearchHistory },
            { icon: 'language-outline', label: 'Language', value: 'English', onPress: () => Alert.alert('Language', 'Currently only English is supported.') },
            { icon: 'shield-checkmark-outline', label: 'Privacy', value: '', onPress: () => Alert.alert('Privacy', 'Your data is stored locally on your device only. No data is collected or shared.') },
            { icon: 'information-circle-outline', label: 'About', value: 'v1.0.0', onPress: () => Alert.alert('OrangeMusic', 'Version 1.0.0\nBuilt with React Native & Expo\nPowered by JioSaavn API\n\nDeveloped By Yash Reg Number - xxxxx960') },
        ];

    const bottomSpacing = currentSong ? 176 : 96;

    return (
        <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            <StatusBar barStyle={c.bg === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={c.bg} />

            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <Ionicons name="musical-notes" size={24} color={c.accent} />
                    <Text style={[styles.logoText, { color: c.text }]}>OrangeMusic</Text>
                </View>
            </View>

            <Text style={[styles.pageTitle, { color: c.accent }]}>Settings</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomSpacing }}>
                {settingItems.map((item) => (
                    <TouchableOpacity
                        key={item.label}
                        style={[styles.row, { borderBottomColor: c.border }]}
                        activeOpacity={item.toggle ? 1 : 0.7}
                        onPress={item.onPress}
                        disabled={!item.onPress && !item.toggle}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: c.card }]}>
                            <Ionicons name={item.icon} size={20} color={c.accent} />
                        </View>
                        <Text style={[styles.rowLabel, { color: c.text }]}>{item.label}</Text>
                        {item.toggle ? (
                            <Switch
                                value={isDark}
                                onValueChange={item.onToggle}
                                trackColor={{ false: c.border, true: c.accent }}
                                thumbColor="#FFF"
                            />
                        ) : (
                            <View style={styles.rowRight}>
                                {item.value ? (
                                    <Text style={[styles.rowValue, { color: c.muted }]}>{item.value}</Text>
                                ) : null}
                                <Ionicons name="chevron-forward" size={18} color={c.muted} />
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Quality Picker Modal */}
            <Modal visible={qualityModal !== null} transparent animationType="fade" onRequestClose={() => setQualityModal(null)}>
                <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlay }]} onPress={() => setQualityModal(null)}>
                    <View style={[styles.modalContent, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
                        <Text style={[styles.modalTitle, { color: c.text }]}>
                            {qualityModal === 'audio' ? 'Audio Quality' : 'Download Quality'}
                        </Text>
                        {QUALITY_OPTIONS.map((q) => {
                            const isSelected = qualityModal === 'audio' ? audioQuality === q : downloadQuality === q;
                            return (
                                <TouchableOpacity
                                    key={q}
                                    style={styles.modalItem}
                                    onPress={() => {
                                        if (qualityModal === 'audio') setAudioQuality(q);
                                        else setDownloadQuality(q);
                                        setQualityModal(null);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, { color: c.text }]}>{q}</Text>
                                    <Ionicons
                                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={c.accent}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>

            {/* Sleep Timer Modal */}
            <Modal visible={sleepModal} transparent animationType="fade" onRequestClose={() => setSleepModal(false)}>
                <Pressable style={[styles.modalOverlay, { backgroundColor: c.overlay }]} onPress={() => setSleepModal(false)}>
                    <View style={[styles.modalContent, { backgroundColor: c.sheetBg, borderColor: c.border }]}>
                        <Text style={[styles.modalTitle, { color: c.text }]}>Sleep Timer</Text>
                        {SLEEP_TIMER_OPTIONS.map((opt) => {
                            const isSelected = sleepTimerMinutes === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.label}
                                    style={styles.modalItem}
                                    onPress={() => handleSetSleepTimer(opt.value)}
                                >
                                    <Text style={[styles.modalItemText, { color: c.text }]}>{opt.label}</Text>
                                    <Ionicons
                                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                                        size={20}
                                        color={c.accent}
                                    />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Pressable>
            </Modal>

            {/* Custom Sleep Timer Prompt Modal */}
            <Modal visible={customSleepPromptVisible} transparent animationType="fade" onRequestClose={() => setCustomSleepPromptVisible(false)}>
                <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: c.sheetBg, borderColor: c.border, padding: 20 }]}>
                        <Text style={[styles.modalTitle, { color: c.text, marginBottom: 16, paddingHorizontal: 0 }]}>Custom Sleep Timer</Text>
                        <Text style={{ color: c.textSecondary, marginBottom: 12 }}>Enter minutes (1-999):</Text>
                        <TextInput
                            style={[styles.input, { color: c.text, borderColor: c.border }]}
                            keyboardType="number-pad"
                            maxLength={3}
                            value={customSleepValue}
                            onChangeText={setCustomSleepValue}
                            autoFocus
                        />
                        <View style={styles.promptActions}>
                            <TouchableOpacity style={styles.promptBtn} onPress={() => setCustomSleepPromptVisible(false)}>
                                <Text style={{ color: c.text, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.promptBtn}
                                onPress={() => {
                                    const mins = parseInt(customSleepValue || '0', 10);
                                    if (mins > 0 && mins < 1000) {
                                        audioService.startSleepTimer(mins);
                                        setCustomSleepPromptVisible(false);
                                    } else {
                                        Alert.alert('Invalid Input', 'Please enter a valid number of minutes.');
                                    }
                                }}
                            >
                                <Text style={{ color: c.accent, fontSize: 16, fontWeight: '700' }}>Set</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
    logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logoText: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6 },
    pageTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12, marginTop: 6 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1 },
    iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    rowLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
    rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rowValue: { fontSize: 14, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    modalContent: { borderRadius: 16, paddingVertical: 16, paddingHorizontal: 6, width: '100%', borderWidth: 1, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
    modalTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
    modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16 },
    modalItemText: { fontSize: 16, fontWeight: '500' },
    input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginBottom: 20 },
    promptActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
    promptBtn: { paddingVertical: 8, paddingHorizontal: 12 },
});
