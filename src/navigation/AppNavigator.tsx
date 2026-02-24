import React, { useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import PlaylistsScreen from '../screens/PlaylistsScreen';
import PlayerScreen from '../screens/PlayerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ArtistDetailScreen from '../screens/ArtistDetailScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import AuthScreen from '../screens/AuthScreen';
import MiniPlayer from '../components/MiniPlayer';
import { usePlayerStore } from '../store/playerStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../store/themeStore';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

function TabNavigator() {
    const c = useTheme();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                sceneStyle: { backgroundColor: c.bg },
                tabBarStyle: {
                    position: 'absolute' as const,
                    backgroundColor: c.tabBar,
                    borderTopColor: c.border,
                    borderTopWidth: 0,
                    height: 68,
                    paddingBottom: 10,
                    paddingTop: 8,
                    elevation: 0,
                },
                tabBarActiveTintColor: c.accent,
                tabBarInactiveTintColor: c.muted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600' as const,
                    marginTop: 2,
                },
                tabBarIcon: ({ color, size }: { color: string; size: number }) => {
                    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
                        Home: 'home',
                        Favorites: 'heart-outline',
                        Playlists: 'list',
                        Settings: 'settings-outline',
                    };
                    return (
                        <Ionicons name={iconMap[route.name] ?? 'ellipse'} size={size} color={color} />
                    );
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Favorites" component={LibraryScreen} />
            <Tab.Screen name="Playlists" component={PlaylistsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}

function TabsWithMiniPlayer({ navigation }: any) {
    const currentSong = usePlayerStore((s) => s.currentSong);

    const openPlayer = useCallback(() => {
        navigation.navigate('Player');
    }, [navigation]);

    return (
        <View style={styles.container}>
            <TabNavigator />
            {currentSong && <MiniPlayer onPress={openPlayer} />}
        </View>
    );
}

export default function AppNavigator() {
    const c = useTheme();
    const token = useAuthStore((s) => s.token);
    const isLoading = useAuthStore((s) => s.isLoading);

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="musical-notes" size={48} color={c.accent} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator
                screenOptions={{
                    headerShown: false,
                    cardStyle: { backgroundColor: c.bg },
                }}
            >
                {!token ? (
                    <RootStack.Screen
                        name="Auth"
                        component={AuthScreen}
                        options={{ animationTypeForReplace: 'pop' }}
                    />
                ) : (
                    <>
                        <RootStack.Screen name="Main" component={TabsWithMiniPlayer} />
                        <RootStack.Screen
                            name="Player"
                            component={PlayerScreen}
                            options={{
                                ...TransitionPresets.ModalSlideFromBottomIOS,
                                cardStyle: { backgroundColor: c.bg },
                            }}
                        />
                        <RootStack.Screen
                            name="ArtistDetail"
                            component={ArtistDetailScreen}
                            options={{
                                ...TransitionPresets.SlideFromRightIOS,
                                cardStyle: { backgroundColor: c.bg },
                            }}
                        />
                        <RootStack.Screen
                            name="AlbumDetail"
                            component={AlbumDetailScreen}
                            options={{
                                ...TransitionPresets.SlideFromRightIOS,
                                cardStyle: { backgroundColor: c.bg },
                            }}
                        />
                    </>
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
