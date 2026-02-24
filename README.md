# 🎵 OrangeMusic Player — React Native

A production-quality music streaming app built with **React Native (Expo)** and **TypeScript**, powered by the [JioSaavn API](https://saavn.sumit.co).

> Built for the **Lokal React Native Intern Assignment**

---

## 📱 Features

### Core
- **🏠 Home Screen** — Browse songs, artists, albums. Infinite scroll pagination. Tabbed interface (Suggested / Songs / Artists / Albums)
- **🎵 Full Player** — Album art, seek bar, volume control, play/pause/next/previous, skip ±10s
- **📱 Mini Player** — Persistent bar synced with full player across all screens
- **🔍 Search** — Dedicated search for Songs, Artists, and Albums via separate API endpoints. Persistent recent search history
- **❤️ Library** — Favorites and Downloads tabs with shuffle all. Songs persist via AsyncStorage
- **🔊 Background Playback** — Music continues when app is minimized/screen is off

### Bonus Features
- **🔀 Shuffle Mode** — Randomize playback order
- **🔁 Repeat Modes** — Off → Repeat All → Repeat One (with "1" badge indicator)
- **🎯 Song Suggestions** — Auto-fetches related songs when playing
- **🌙 Dark / Light Mode** — Full theme toggle with preference persistence
- **🎤 Lyrics** — Bottom sheet lyrics viewer (fetches from API, HTML cleaned)
- **📋 Queue Viewer** — See and manage the full playback queue
- **💾 Downloads** — Save songs for offline reference (persisted to storage)
- **⚙️ Functional Settings** — Audio quality picker (96/160/320kbps), download quality, sleep timer, clear downloads/search history
- **⏩ Playback Speed** — 0.5× → 0.75× → 1× → 1.25× → 1.5× → 2× cycling control
- **😴 Sleep Timer** — Auto-pause after 15/30/45/60/90 mins, plus a **Custom** minute input option
- **ℹ️ Song Details** — View full metadata (album, year, duration, language, label, lyrics availability)
- **🎨 Song Options** — Play Next, Add to Queue, Download, Go to Album, Go to Artist, Details, Share
- **🚀 Strict Deduplication** — API results are cleaned in real-time to remove duplicate compilation tracks
- **🔔 Interactive Toasts** — Native Android Toast notifications confirm Library & Playlist actions

### 🌟 Advanced AI Features (Vercel + Gemini)
- **🔐 Secure Authentication** — Email and Guest login system powered by Vercel serverless backend
- **🧠 Gemini 3 Flash Preview** — All AI features are routed through a secure Vercel backend using the latest Gemini models
- **🎙️ AI Voice Search** — Tap the floating mic on the Home screen to search for songs using natural language
- **✨ AI DJ (Smart Mix)** — Generates 5 personalized song recommendations based on your Favorites
- **💡 AI Explain Lyrics** — Deep dive into the meaning and story behind any song (even without official lyrics)
- **🤯 AI Song Trivia** — Discover amazing facts about songs right from the new glassmorphic Song Details modal

---

## 🏗️ Architecture

```
src/
├── api/
│   └── saavn.ts             # JioSaavn API (search songs/artists/albums, lyrics, suggestions)
├── components/
│   ├── MiniPlayer.tsx        # Persistent mini player bar
│   ├── LyricsSheet.tsx       # Bottom sheet lyrics viewer
│   ├── QueueSheet.tsx        # Playback queue viewer
│   ├── SongOptionsSheet.tsx  # Song action menu (download, share, etc.)
│   ├── ArtistOptionsSheet.tsx# Artist action menu
│   └── SortModal.tsx         # Song sorting options
├── navigation/
│   └── AppNavigator.tsx      # React Navigation v6+ (tabs + modal stack)
├── screens/
│   ├── AuthScreen.tsx        # Login and Guest access screen
│   ├── HomeScreen.tsx        # Search + AI Voice Search + Smart Mix row + tabs
│   ├── PlayerScreen.tsx      # Full-screen player controls + lyrics + queue
│   ├── LibraryScreen.tsx     # Favorites + downloads tabs
│   ├── SettingsScreen.tsx    # Quality pickers, sleep timer, theme toggle, Logout
│   ├── ArtistDetailScreen.tsx# Artist songs + albums
│   └── AlbumDetailScreen.tsx # Album songs
├── services/
│   ├── aiService.ts          # Integrates with Vercel backend for Gemini API calls
│   └── audioService.ts       # expo-audio engine (quality-aware, speed control, sleep timer)
├── store/
│   ├── authStore.ts          # Zustand: JWT token and user state
│   ├── playerStore.ts        # Zustand: playback state, queue, shuffle/repeat
│   ├── libraryStore.ts       # Zustand: favorites + downloads + recent searches + AsyncStorage  
│   ├── themeStore.ts         # Zustand: dark/light mode + AsyncStorage persistence
│   └── settingsStore.ts      # Zustand: audio/download quality, sleep timer + AsyncStorage
├── theme/
│   └── colors.ts             # Dark and Light color palettes (16 tokens)
└── types/
    └── song.ts               # TypeScript interfaces + utility functions
```

### Design Decisions

| Decision | Choice | Reasoning |
|---|---|---|
| **State Management** | Zustand | Minimal boilerplate, built-in selectors prevent unnecessary re-renders. Perfect for real-time playback state. |
| **Audio Engine** | expo-audio | Works with Expo managed workflow. Supports background audio via `staysActiveInBackground`. |
| **Storage** | AsyncStorage | Reliable key-value storage for favorites, downloads, settings, theme, and search history. |
| **Navigation** | React Navigation v6+ | Bottom tabs for Home/Library/Settings. Stack + modal for Player. **NOT Expo Router** as per requirements. |
| **Styling** | StyleSheet API | Pure React Native styling — no third-party UI libraries as per requirements. |

### State Sync: Mini Player ↔ Full Player

Both views read from the **same Zustand store** (`playerStore`). The audio service updates the store on every playback status change, so the mini player progress bar, play/pause state, and song info are **always perfectly synchronized** with the full player.

```
AudioService → onPlaybackStatusUpdate → PlayerStore (Zustand) → MiniPlayer + PlayerScreen
```

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your phone (from Play Store / App Store)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/jiosavan-music-player.git
cd jiosavan-music-player

# 2. Install dependencies
npm install

# 3. Start the development server
npx expo start

# 4. Scan the QR code with Expo Go app on your phone
```

That's it — **no extra configuration, API keys, or native builds needed.**

---

## 📡 API

Using the [JioSaavn Unofficial API](https://saavn.sumit.co) — no API key required.

| Endpoint | Usage |
|---|---|
| `GET /api/search/songs?query=...&page=0&limit=15` | Home screen search + pagination |
| `GET /api/search/artists?query=...&page=0&limit=10` | Artist search results |
| `GET /api/search/albums?query=...&page=0&limit=10` | Album search results |
| `GET /api/songs/{id}/suggestions?limit=15` | Auto-queue related songs |
| `GET /api/songs/{id}/lyrics` | Fetch song lyrics |

---

## ⚖️ Trade-offs

1. **expo-audio vs react-native-track-player**: I chose `expo-audio` because it works out of the box with Expo managed workflow. `react-native-track-player` provides better background playback and notification controls but requires a development build (`npx expo prebuild`). For this assignment, `expo-audio` covers all requirements including background audio.

2. **AsyncStorage vs MMKV**: AsyncStorage is slightly slower than MMKV for large datasets, but for favorites, downloads metadata, settings, and search history it's more than sufficient. MMKV requires native module linking in some setups.

3. **Emoji icons vs vector icons**: Used Ionicons from `@expo/vector-icons` for consistent, professional icons across platforms.

4. **Download tracking**: Downloads are tracked as metadata in AsyncStorage rather than caching full audio files. For a production app, you'd use `expo-file-system` to cache the actual audio files for true offline playback.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | React Native (Expo) |
| Language | TypeScript (strict mode) |
| Navigation | React Navigation v6+ (Bottom Tabs + Native Stack) |
| State Management | Zustand (5 stores - including Auth) |
| Audio | expo-audio |
| AI / LLM | Google Gemini (`gemini-3-flash-preview`) |
| Backend | Vercel Serverless Functions |
| Storage | AsyncStorage |
| Icons | @expo/vector-icons (Ionicons) |
| Styling | React Native StyleSheet (no 3rd-party UI libs) |

---

## 🤖 AI Assistance Disclosure

### What AI helped with
- Boilerplate generation for TypeScript interfaces from API docs
- Generating initial StyleSheet objects
- Debugging expo-audio configuration

### What I did myself
- Architecture decisions (Zustand store design, audio service pattern)
- State synchronization logic between mini player and full player
- Search debouncing and pagination logic
- Queue management with shuffle/repeat algorithms
- UI/UX design and layout decisions
- Lyrics, download, and settings feature implementation

---

## 📹 Demo Video

[Link to demo video will be added here]

## 📦 APK Download

[https://github.com/OfficialYashOP/OrangeMusic/releases/tag/OrangeMusic]

---

## License

This project is built as an assignment submission and is not intended for commercial use.
