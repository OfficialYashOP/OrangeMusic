import { Song } from '../types/song';
import { searchSongs } from '../api/saavn';

// Use the production Vercel URL
const API_BASE_URL = 'https://orangemusic.vercel.app/api';

export const aiService = {
    /**
     * Sends the user's favorite songs to the Vercel backend to get 5 song queries,
     * then fetches those songs from JioSaavn locally.
     */
    async generateSmartMix(favorites: Song[]): Promise<Song[]> {
        if (!favorites || favorites.length === 0) return [];

        try {
            const response = await fetch(`${API_BASE_URL}/smart-mix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ favorites })
            });

            if (!response.ok) throw new Error('Failed to fetch from Smart Mix backend');

            const data = await response.json();
            const queries: string[] = data.queries || [];

            const mixPromises = queries.map(query => searchSongs(query, 0, 1));
            const mixResults = await Promise.all(mixPromises);

            const finalMix: Song[] = [];
            mixResults.forEach(res => {
                if (res.success && res.data.results && res.data.results.length > 0) {
                    finalMix.push(res.data.results[0]);
                }
            });

            return finalMix;

        } catch (error) {
            console.error("AI Mix Backend Error:", error);
            return [];
        }
    },

    /**
     * Sends raw audio data to the Vercel backend to extract the intent,
     * then searches for those songs and returns them.
     */
    async processVoiceCommand(base64Audio: string, mimeType: string): Promise<Song[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/voice-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Audio, mimeType })
            });

            if (!response.ok) throw new Error('Failed to fetch from Voice Search backend');

            const data = await response.json();
            const queries: string[] = data.queries || [];

            const mixPromises = queries.map(query => searchSongs(query, 0, 3));
            const mixResults = await Promise.all(mixPromises);

            const finalMix: Song[] = [];
            mixResults.forEach(res => {
                if (res.success && res.data.results && res.data.results.length > 0) {
                    finalMix.push(res.data.results[0]);
                }
            });

            return finalMix;

        } catch (error) {
            console.error("Voice AI Backend Error:", error);
            return [];
        }
    },

    /**
     * Reaches out to the Vercel Backend to get the deep meaning/backstory 
     * of a song based on its lyrics and title.
     */
    async explainLyrics(songName: string, artist: string, lyrics?: string): Promise<string> {
        try {
            const response = await fetch(`${API_BASE_URL}/explain-lyrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songName, artist, lyrics })
            });

            if (!response.ok) throw new Error('Failed to fetch from Explain Lyrics backend');

            const data = await response.json();
            return data.explanation || 'Could not generate an explanation at this time.';
        } catch (error) {
            console.error("Explain Lyrics Backend Error:", error);
            return 'Failed to reach the AI service. Please ensure your Vercel backend is running.';
        }
    },

    /**
     * Fetches interesting trivia about a song from the Vercel backend.
     */
    async getSongTrivia(songName: string, artist: string): Promise<string> {
        try {
            const response = await fetch(`${API_BASE_URL}/song-trivia`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songName, artist })
            });

            if (!response.ok) throw new Error('Failed to fetch from Song Trivia backend');

            const data = await response.json();
            return data.trivia || 'No trivia found for this song.';
        } catch (error) {
            console.error("Song Trivia Backend Error:", error);
            return 'Failed to load trivia.';
        }
    }
};
