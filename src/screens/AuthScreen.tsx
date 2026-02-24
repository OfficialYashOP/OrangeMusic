import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://orangemusic.vercel.app/api';

export default function AuthScreen() {
    const c = useTheme();
    const login = useAuthStore((s) => s.login);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [guestLoading, setGuestLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                await login(data.token, data.user);
            } else {
                Alert.alert('Login Failed', data.error || 'Unknown error occurred.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setGuestLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();
            if (response.ok && data.success) {
                await login(data.token, data.user);
            } else {
                Alert.alert('Guest Login Failed', data.error || 'Unknown error occurred.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not connect to the server.');
        } finally {
            setGuestLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: c.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Ionicons name="musical-notes" size={64} color={c.accent} />
                    <Text style={[styles.title, { color: c.text }]}>OrangeMusic</Text>
                    <Text style={[styles.subtitle, { color: c.muted }]}>Log in to access your library, AI DJ, and more.</Text>
                </View>

                <View style={styles.form}>
                    <View style={[styles.inputContainer, { backgroundColor: c.card, borderColor: c.border }]}>
                        <Ionicons name="mail-outline" size={20} color={c.muted} style={styles.icon} />
                        <TextInput
                            style={[styles.input, { color: c.text }]}
                            placeholder="Email"
                            placeholderTextColor={c.muted}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={[styles.inputContainer, { backgroundColor: c.card, borderColor: c.border }]}>
                        <Ionicons name="lock-closed-outline" size={20} color={c.muted} style={styles.icon} />
                        <TextInput
                            style={[styles.input, { color: c.text }]}
                            placeholder="Password"
                            placeholderTextColor={c.muted}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.loginBtn, { backgroundColor: c.accent }]}
                        onPress={handleLogin}
                        disabled={loading || guestLoading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
                    </TouchableOpacity>

                    <View style={styles.dividerContainer}>
                        <View style={[styles.divider, { backgroundColor: c.border }]} />
                        <Text style={[styles.dividerText, { color: c.muted }]}>OR</Text>
                        <View style={[styles.divider, { backgroundColor: c.border }]} />
                    </View>

                    <TouchableOpacity
                        style={[styles.guestBtn, { borderColor: c.border, backgroundColor: c.card }]}
                        onPress={handleGuestLogin}
                        disabled={loading || guestLoading}
                    >
                        {guestLoading ? <ActivityIndicator color={c.accent} /> : (
                            <>
                                <Ionicons name="person-outline" size={20} color={c.text} style={{ marginRight: 8 }} />
                                <Text style={[styles.guestBtnText, { color: c.text }]}>Continue as Guest</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
    header: { alignItems: 'center', marginBottom: 48 },
    title: { fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 12 },
    subtitle: { fontSize: 16, marginTop: 8, textAlign: 'center' },
    form: { gap: 16 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
    icon: { marginRight: 12 },
    input: { flex: 1, fontSize: 16, height: '100%' },
    loginBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    loginBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
    divider: { flex: 1, height: 1 },
    dividerText: { marginHorizontal: 16, fontSize: 14, fontWeight: '600' },
    guestBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexDirection: 'row' },
    guestBtnText: { fontSize: 16, fontWeight: '600' }
});
