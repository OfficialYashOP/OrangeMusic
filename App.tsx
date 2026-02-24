import React, { useEffect } from 'react';
import { useLibraryStore } from './src/store/libraryStore';
import { useThemeStore } from './src/store/themeStore';
import { useSettingsStore } from './src/store/settingsStore';
import { usePlaylistStore } from './src/store/playlistStore';
import { usePlayerStore } from './src/store/playerStore';
import { useAuthStore } from './src/store/authStore';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const loadFavorites = useLibraryStore((s) => s.loadFavorites);
  const loadDownloads = useLibraryStore((s) => s.loadDownloads);
  const loadRecentSearches = useLibraryStore((s) => s.loadRecentSearches);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadPlaylists = usePlaylistStore((s) => s.loadPlaylists);
  const loadQueue = usePlayerStore((s) => s.loadQueue);
  const loadAuth = useAuthStore((s) => s.loadAuth);

  useEffect(() => {
    loadTheme();
    loadAuth();
    loadFavorites();
    loadDownloads();
    loadRecentSearches();
    loadSettings();
    loadPlaylists();
    loadQueue();
  }, []);

  return <AppNavigator />;
}
