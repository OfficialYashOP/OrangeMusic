export interface ImageQuality {
  quality: string;
  url: string;
}

export interface DownloadUrl {
  quality: string;
  url: string;
}

export interface ArtistMini {
  id: string;
  name: string;
  role: string;
  type: string;
  image: ImageQuality[];
  url: string;
}

export interface SongAlbum {
  id: string | null;
  name: string | null;
  url: string | null;
}

export interface Song {
  id: string;
  name: string;
  type: string;
  year: string | null;
  releaseDate: string | null;
  duration: number | null;
  label: string | null;
  explicitContent: boolean;
  playCount: number | null;
  language: string;
  hasLyrics: boolean;
  lyricsId: string | null;
  url: string;
  copyright: string | null;
  album: SongAlbum;
  artists: {
    primary: ArtistMini[];
    featured: ArtistMini[];
    all: ArtistMini[];
  };
  image: ImageQuality[];
  downloadUrl: DownloadUrl[];
}

export interface SearchSongsResponse {
  success: boolean;
  data: {
    total: number;
    start: number;
    results: Song[];
  };
}

export interface SongDetailsResponse {
  success: boolean;
  data: Song[];
}

export interface SongSuggestionsResponse {
  success: boolean;
  data: Song[];
}

export function getArtistNames(song: Song): string {
  if (song.artists.primary.length > 0) {
    return song.artists.primary.map((a) => a.name).join(', ');
  }
  if (song.artists.all.length > 0) {
    return song.artists.all.map((a) => a.name).join(', ');
  }
  return 'Unknown Artist';
}

export function getImageUrl(images: ImageQuality[], preferredQuality = '500x500'): string {
  const preferred = images.find((img) => img.quality === preferredQuality);
  if (preferred) return preferred.url;
  if (images.length > 0) return images[images.length - 1].url;
  return '';
}

export function getDownloadUrl(urls: DownloadUrl[], preferredQuality = '320kbps'): string {
  const preferred = urls.find((u) => u.quality === preferredQuality);
  if (preferred) return preferred.url;
  // Fallback to highest available
  if (urls.length > 0) return urls[urls.length - 1].url;
  return '';
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
