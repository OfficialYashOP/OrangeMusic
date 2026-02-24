import { SearchSongsResponse, SongDetailsResponse, SongSuggestionsResponse } from '../types/song';

const BASE_URL = 'https://saavn.sumit.co';

async function fetchApi<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

export async function searchSongs(
    query: string,
    page: number = 0,
    limit: number = 15
): Promise<SearchSongsResponse> {
    const encoded = encodeURIComponent(query);
    return fetchApi<SearchSongsResponse>(
        `/api/search/songs?query=${encoded}&page=${page}&limit=${limit}`
    );
}

export interface SearchArtistsResponse {
    success: boolean;
    data: {
        total: number;
        start: number;
        results: {
            id: string;
            name: string;
            role: string;
            type: string;
            image: { quality: string; url: string }[];
            url: string;
        }[];
    };
}

export async function searchArtists(
    query: string,
    page: number = 0,
    limit: number = 10
): Promise<SearchArtistsResponse> {
    const encoded = encodeURIComponent(query);
    return fetchApi<SearchArtistsResponse>(
        `/api/search/artists?query=${encoded}&page=${page}&limit=${limit}`
    );
}

export interface SearchAlbumsResponse {
    success: boolean;
    data: {
        total: number;
        start: number;
        results: {
            id: string;
            name: string;
            description: string;
            year: number | null;
            type: string;
            playCount: number | null;
            language: string;
            explicitContent: boolean;
            url: string;
            image: { quality: string; url: string }[];
            artists: {
                primary: { id: string; name: string; image: { quality: string; url: string }[] }[];
                all: { id: string; name: string }[];
            };
        }[];
    };
}

export async function searchAlbums(
    query: string,
    page: number = 0,
    limit: number = 10
): Promise<SearchAlbumsResponse> {
    const encoded = encodeURIComponent(query);
    return fetchApi<SearchAlbumsResponse>(
        `/api/search/albums?query=${encoded}&page=${page}&limit=${limit}`
    );
}

export async function getSongDetails(ids: string[]): Promise<SongDetailsResponse> {
    return fetchApi<SongDetailsResponse>(`/api/songs?ids=${ids.join(',')}`);
}

export async function getSongById(id: string): Promise<SongDetailsResponse> {
    return fetchApi<SongDetailsResponse>(`/api/songs/${id}`);
}

export async function getSongSuggestions(
    id: string,
    limit: number = 10
): Promise<SongSuggestionsResponse> {
    return fetchApi<SongSuggestionsResponse>(
        `/api/songs/${id}/suggestions?limit=${limit}`
    );
}

export interface LyricsResponse {
    success: boolean;
    data: {
        lyrics: string;
        snippet: string;
        copyright: string;
    };
}

export async function getLyrics(songId: string): Promise<LyricsResponse> {
    return fetchApi<LyricsResponse>(`/api/songs/${songId}/lyrics`);
}

export async function getTrendingSongs(): Promise<SearchSongsResponse> {
    return searchSongs('trending', 0, 20);
}

export async function getHindiHits(): Promise<SearchSongsResponse> {
    return searchSongs('hindi hits', 0, 20);
}

export async function getPopularSongs(): Promise<SearchSongsResponse> {
    return searchSongs('popular songs', 0, 20);
}
