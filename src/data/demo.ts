import type { Track, Album, Artist, Playlist, Genre, MoodPlaylist } from '@/types';

// ─── ARTISTS ──────────────────────────────────────────────────────────────────
export const artists: Artist[] = [
  {
    id: 'a1', name: 'Aurora Nights', imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    followers: 4200000, monthlyListeners: 8900000, genres: ['Electronic', 'Ambient'], verified: true, following: false,
    bio: 'Pioneering electronic music producer from Oslo, Norway.',
  },
  {
    id: 'a2', name: 'Neon Pulse', imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
    followers: 2800000, monthlyListeners: 5400000, genres: ['Synthwave', 'Electronic'], verified: true, following: false,
    bio: 'Synthwave architect creating retro-futuristic soundscapes.',
  },
  {
    id: 'a3', name: 'Luna Vega', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
    followers: 6100000, monthlyListeners: 12300000, genres: ['Pop', 'Indie'], verified: true, following: false,
    bio: 'Grammy-nominated indie pop singer-songwriter.',
  },
  {
    id: 'a4', name: 'The Midnight Code', imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    followers: 3500000, monthlyListeners: 7200000, genres: ['Rock', 'Alternative'], verified: true, following: false,
    bio: 'Alternative rock band redefining the genre for a new generation.',
  },
  {
    id: 'a5', name: 'Celeste Ray', imageUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&q=80',
    followers: 1900000, monthlyListeners: 3700000, genres: ['R&B', 'Soul'], verified: true, following: false,
    bio: 'Soulful vocalist with a voice that transcends time.',
  },
  {
    id: 'a6', name: 'Cosmo Beat', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    followers: 890000, monthlyListeners: 2100000, genres: ['Hip-Hop', 'Trap'], verified: false, following: false,
    bio: 'Rising trap producer from Atlanta.',
  },
  {
    id: 'a7', name: 'Isla Storm', imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80',
    followers: 5300000, monthlyListeners: 9800000, genres: ['Pop', 'Dance'], verified: true, following: false,
    bio: 'Dance-pop queen with chart-topping anthems worldwide.',
  },
  {
    id: 'a8', name: 'Phantom Keys', imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    followers: 720000, monthlyListeners: 1400000, genres: ['Jazz', 'Neo-Soul'], verified: false, following: false,
    bio: 'Jazz pianist blending classical roots with modern soul.',
  },
];

// ─── SAMPLE LYRICS GENERATOR ───────────────────────────────────────────────
const sampleLyrics1 = [
  { time: 0, text: '♪ (Atmospheric Synth Intro) ♪' },
  { time: 12, text: 'Drifting through the starlit sky' },
  { time: 24, text: 'Electric waves that rise and sigh' },
  { time: 38, text: 'Can you hear the signal calling tonight?' },
  { time: 52, text: 'We are boundless in the velvet light' },
  { time: 68, text: 'Feel the bassline start to take control' },
  { time: 82, text: 'A frequency that speaks straight to your soul' },
  { time: 98, text: 'We keep driving with no destination set' },
  { time: 114, text: 'Memories we never will forget' },
  { time: 132, text: '♪ (Dynamic Melodic Break) ♪' },
  { time: 154, text: 'Catch the current, feel the overflow' },
  { time: 172, text: 'Shining brighter than the neon glow' },
  { time: 194, text: '♪ (Fade into infinity) ♪' },
];

const sampleLyrics2 = [
  { time: 0, text: '♪ (Retro Synthwave Beats) ♪' },
  { time: 10, text: 'Chrome reflections on the midnight street' },
  { time: 22, text: 'Heart racing to the analog beat' },
  { time: 35, text: 'Past the horizon, shadows fall behind' },
  { time: 48, text: 'A futuristic realm inside our mind' },
  { time: 65, text: 'Push the throttle, hear the engine roar' },
  { time: 80, text: 'We were built for something so much more' },
  { time: 95, text: 'Speeding through the digital cascade' },
  { time: 110, text: 'Where the midnight memories never fade' },
  { time: 128, text: '♪ (Synth Solo) ♪' },
  { time: 148, text: 'Hold the wheel, let the rhythm guide the flight' },
  { time: 168, text: 'Living forever in the electric night' },
];

// ─── SAME-ORIGIN HIGH-FIDELITY AUDIO URLS ──────────────────────────────────────
// Statically served from /public/audio/ (zero CORS restrictions, zero 403 Forbidden)
const AUDIO_URLS = [
  '/audio/track-1.wav',  // Synthwave - 120 BPM
  '/audio/track-2.wav',  // Electronic - 128 BPM
  '/audio/track-3.wav',  // R&B - 85 BPM
  '/audio/track-4.wav',  // Pop - 116 BPM
  '/audio/track-5.wav',  // Ambient - 72 BPM
  '/audio/track-6.wav',  // Lo-Fi - 80 BPM
  '/audio/track-7.wav',  // Dance - 126 BPM
  '/audio/track-8.wav',  // Hip-Hop - 92 BPM
  '/audio/track-9.wav',  // Rock - 130 BPM
  '/audio/track-10.wav', // Indie - 104 BPM
  '/audio/track-11.wav', // Future Bass - 140 BPM
  '/audio/track-12.wav', // Chillhop - 78 BPM
  '/audio/track-13.wav', // Synthpop - 122 BPM
  '/audio/track-14.wav', // Cyberpunk - 132 BPM
  '/audio/track-15.wav', // Acoustic - 96 BPM
  '/audio/track-16.wav', // Funk - 112 BPM
];

// ─── TRACKS ──────────────────────────────────────────────────────────────────
export const tracks: Track[] = [
  { id: 't1', title: 'Celestial Drift', artist: 'Aurora Nights', artistId: 'a1', album: 'Northern Lights', albumId: 'al1', duration: 214, coverUrl: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=400&q=80', audioUrl: AUDIO_URLS[0], lyrics: sampleLyrics1, playCount: 8200000, liked: true, genre: 'Electronic', year: 2024 },
  { id: 't2', title: 'Neon Horizon', artist: 'Neon Pulse', artistId: 'a2', album: 'Retrograde', albumId: 'al2', duration: 187, coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', audioUrl: AUDIO_URLS[1], lyrics: sampleLyrics2, playCount: 5100000, liked: false, genre: 'Synthwave', year: 2024 },
  { id: 't3', title: 'Midnight Bloom', artist: 'Luna Vega', artistId: 'a3', album: 'Bloom', albumId: 'al3', duration: 198, coverUrl: 'https://images.unsplash.com/photo-1519112232436-9e8442e69960?w=400&q=80', audioUrl: AUDIO_URLS[2], lyrics: sampleLyrics1, playCount: 12400000, liked: true, genre: 'Indie Pop', year: 2024 },
  { id: 't4', title: 'Signal Lost', artist: 'The Midnight Code', artistId: 'a4', album: 'Static', albumId: 'al4', duration: 234, coverUrl: 'https://images.unsplash.com/photo-1518972734183-c205f3d6f512?w=400&q=80', audioUrl: AUDIO_URLS[3], lyrics: sampleLyrics2, playCount: 7800000, liked: false, genre: 'Alternative', year: 2023 },
  { id: 't5', title: 'Velvet Soul', artist: 'Celeste Ray', artistId: 'a5', album: 'Velvet', albumId: 'al5', duration: 222, coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80', audioUrl: AUDIO_URLS[4], lyrics: sampleLyrics1, playCount: 3600000, liked: true, genre: 'R&B', year: 2024 },
  { id: 't6', title: 'City Rain', artist: 'Cosmo Beat', artistId: 'a6', album: 'Urban Dreams', albumId: 'al6', duration: 195, coverUrl: 'https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=400&q=80', audioUrl: AUDIO_URLS[5], lyrics: sampleLyrics2, playCount: 2100000, liked: false, genre: 'Hip-Hop', year: 2024 },
  { id: 't7', title: 'Electric Storm', artist: 'Isla Storm', artistId: 'a7', album: 'Voltage', albumId: 'al7', duration: 178, coverUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=400&q=80', audioUrl: AUDIO_URLS[6], lyrics: sampleLyrics1, playCount: 9700000, liked: true, genre: 'Pop', year: 2024 },
  { id: 't8', title: 'Ivory Keys', artist: 'Phantom Keys', artistId: 'a8', album: 'Echoes', albumId: 'al8', duration: 256, coverUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80', audioUrl: AUDIO_URLS[7], lyrics: sampleLyrics2, playCount: 1400000, liked: false, genre: 'Jazz', year: 2023 },
  { id: 't9', title: 'Stardust Highway', artist: 'Aurora Nights', artistId: 'a1', album: 'Northern Lights', albumId: 'al1', duration: 208, coverUrl: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=400&q=80', audioUrl: AUDIO_URLS[8], lyrics: sampleLyrics1, playCount: 6300000, liked: false, genre: 'Electronic', year: 2024 },
  { id: 't10', title: 'Chasing Neon', artist: 'Neon Pulse', artistId: 'a2', album: 'Retrograde', albumId: 'al2', duration: 201, coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', audioUrl: AUDIO_URLS[9], lyrics: sampleLyrics2, playCount: 4500000, liked: true, genre: 'Synthwave', year: 2024 },
  { id: 't11', title: 'Petals of Light', artist: 'Luna Vega', artistId: 'a3', album: 'Bloom', albumId: 'al3', duration: 193, coverUrl: 'https://images.unsplash.com/photo-1519112232436-9e8442e69960?w=400&q=80', audioUrl: AUDIO_URLS[10], lyrics: sampleLyrics1, playCount: 8900000, liked: false, genre: 'Indie Pop', year: 2024 },
  { id: 't12', title: 'Fractured Light', artist: 'The Midnight Code', artistId: 'a4', album: 'Static', albumId: 'al4', duration: 219, coverUrl: 'https://images.unsplash.com/photo-1518972734183-c205f3d6f512?w=400&q=80', audioUrl: AUDIO_URLS[11], lyrics: sampleLyrics2, playCount: 5600000, liked: true, genre: 'Alternative', year: 2023 },
  { id: 't13', title: 'Golden Hour', artist: 'Celeste Ray', artistId: 'a5', album: 'Velvet', albumId: 'al5', duration: 231, coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80', audioUrl: AUDIO_URLS[12], lyrics: sampleLyrics1, playCount: 2800000, liked: false, genre: 'R&B', year: 2024 },
  { id: 't14', title: 'Midnight Sun', artist: 'Isla Storm', artistId: 'a7', album: 'Voltage', albumId: 'al7', duration: 184, coverUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=400&q=80', audioUrl: AUDIO_URLS[13], lyrics: sampleLyrics2, playCount: 7200000, liked: true, genre: 'Pop', year: 2024 },
  { id: 't15', title: 'Hyperspace', artist: 'Aurora Nights', artistId: 'a1', album: 'Northern Lights', albumId: 'al1', duration: 242, coverUrl: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=400&q=80', audioUrl: AUDIO_URLS[14], lyrics: sampleLyrics1, playCount: 4100000, liked: false, genre: 'Electronic', year: 2024 },
  { id: 't16', title: 'Downtown Glow', artist: 'Cosmo Beat', artistId: 'a6', album: 'Urban Dreams', albumId: 'al6', duration: 188, coverUrl: 'https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=400&q=80', audioUrl: AUDIO_URLS[15], lyrics: sampleLyrics2, playCount: 1700000, liked: false, genre: 'Hip-Hop', year: 2024 },
];

// ─── ALBUMS ──────────────────────────────────────────────────────────────────
export const albums: Album[] = [
  { id: 'al1', title: 'Northern Lights', artist: 'Aurora Nights', artistId: 'a1', coverUrl: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=400&q=80', year: 2024, genre: 'Electronic', trackCount: 12, tracks: tracks.filter(t => t.albumId === 'al1') },
  { id: 'al2', title: 'Retrograde', artist: 'Neon Pulse', artistId: 'a2', coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', year: 2024, genre: 'Synthwave', trackCount: 10, tracks: tracks.filter(t => t.albumId === 'al2') },
  { id: 'al3', title: 'Bloom', artist: 'Luna Vega', artistId: 'a3', coverUrl: 'https://images.unsplash.com/photo-1519112232436-9e8442e69960?w=400&q=80', year: 2024, genre: 'Indie Pop', trackCount: 14, tracks: tracks.filter(t => t.albumId === 'al3') },
  { id: 'al4', title: 'Static', artist: 'The Midnight Code', artistId: 'a4', coverUrl: 'https://images.unsplash.com/photo-1518972734183-c205f3d6f512?w=400&q=80', year: 2023, genre: 'Alternative', trackCount: 11, tracks: tracks.filter(t => t.albumId === 'al4') },
  { id: 'al5', title: 'Velvet', artist: 'Celeste Ray', artistId: 'a5', coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80', year: 2024, genre: 'R&B', trackCount: 9, tracks: tracks.filter(t => t.albumId === 'al5') },
  { id: 'al6', title: 'Urban Dreams', artist: 'Cosmo Beat', artistId: 'a6', coverUrl: 'https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=400&q=80', year: 2024, genre: 'Hip-Hop', trackCount: 13, tracks: tracks.filter(t => t.albumId === 'al6') },
  { id: 'al7', title: 'Voltage', artist: 'Isla Storm', artistId: 'a7', coverUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=400&q=80', year: 2024, genre: 'Pop', trackCount: 11, tracks: tracks.filter(t => t.albumId === 'al7') },
  { id: 'al8', title: 'Echoes', artist: 'Phantom Keys', artistId: 'a8', coverUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80', year: 2023, genre: 'Jazz', trackCount: 8, tracks: tracks.filter(t => t.albumId === 'al8') },
];

// ─── PLAYLISTS ────────────────────────────────────────────────────────────────
export const playlists: Playlist[] = [
  { id: 'pl1', title: 'Late Night Drives', description: 'Perfect tracks for driving through the city at night', coverColors: ['#1a1a3e', '#7c3aed'], tracks: [tracks[0], tracks[1], tracks[6], tracks[9], tracks[13]], createdBy: 'MR music', isPublic: true, followers: 234000 },
  { id: 'pl2', title: 'Morning Ritual', description: 'Start your day with positive energy', coverColors: ['#1a3a1a', '#22c55e'], tracks: [tracks[2], tracks[4], tracks[10]], createdBy: 'MR music', isPublic: true, followers: 189000 },
  { id: 'pl3', title: 'Focus Mode', description: 'Deep concentration tracks for work & study', coverColors: ['#1a1a2e', '#3b82f6'], tracks: [tracks[7], tracks[0], tracks[14]], createdBy: 'MR music', isPublic: true, followers: 412000 },
  { id: 'pl4', title: 'Workout Beast', description: 'High energy tracks to crush your workout', coverColors: ['#3a1a1a', '#ef4444'], tracks: [tracks[6], tracks[3], tracks[11], tracks[5]], createdBy: 'MR music', isPublic: true, followers: 567000 },
  { id: 'pl5', title: 'Chill Vibes', description: 'Relax and unwind with smooth sounds', coverColors: ['#1a2a3a', '#06b6d4'], tracks: [tracks[4], tracks[7], tracks[12]], createdBy: 'MR music', isPublic: true, followers: 321000 },
  { id: 'pl6', title: 'Synthwave Dreams', description: 'Retro-futuristic vibes all day long', coverColors: ['#2a1a3e', '#ec4899'], tracks: [tracks[1], tracks[9], tracks[14]], createdBy: 'MR music', isPublic: true, followers: 178000 },
  { id: 'pl7', title: 'Indie Discovery', description: 'The best new indie artists right now', coverColors: ['#2a2a1a', '#f59e0b'], tracks: [tracks[2], tracks[10], tracks[4]], createdBy: 'You', isPublic: false, followers: 0 },
  { id: 'pl8', title: 'R&B Sunday', description: 'Soulful R&B for a relaxed Sunday', coverColors: ['#3a1a2a', '#a855f7'], tracks: [tracks[4], tracks[12]], createdBy: 'You', isPublic: false, followers: 0 },
];

// ─── GENRES ──────────────────────────────────────────────────────────────────
export const genres: Genre[] = [
  { id: 'g1', name: 'Electronic', color: '#7c3aed', imageUrl: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=80' },
  { id: 'g2', name: 'Hip-Hop', color: '#ef4444', imageUrl: 'https://images.unsplash.com/photo-1547355253-ff0740f859b4?w=400&q=80' },
  { id: 'g3', name: 'Indie Pop', color: '#22c55e', imageUrl: 'https://images.unsplash.com/photo-1494232410401-ad00d5433cfa?w=400&q=80' },
  { id: 'g4', name: 'Synthwave', color: '#ec4899', imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80' },
  { id: 'g5', name: 'R&B', color: '#f59e0b', imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80' },
  { id: 'g6', name: 'Rock', color: '#06b6d4', imageUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&q=80' },
  { id: 'g7', name: 'Jazz', color: '#8b5cf6', imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80' },
  { id: 'g8', name: 'Pop', color: '#f97316', imageUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=400&q=80' },
];

// ─── MOOD PLAYLISTS ───────────────────────────────────────────────────────────
export const moodPlaylists: MoodPlaylist[] = [
  { id: 'm1', mood: 'Happy', title: 'Pure Joy', gradient: ['#f59e0b', '#ef4444'], emoji: '😊', trackCount: 42 },
  { id: 'm2', mood: 'Melancholic', title: 'Feel It All', gradient: ['#3b82f6', '#8b5cf6'], emoji: '🌧️', trackCount: 38 },
  { id: 'm3', mood: 'Energetic', title: 'Power Up', gradient: ['#ef4444', '#f97316'], emoji: '⚡', trackCount: 56 },
  { id: 'm4', mood: 'Romantic', title: 'Love Language', gradient: ['#ec4899', '#f97316'], emoji: '❤️', trackCount: 33 },
  { id: 'm5', mood: 'Peaceful', title: 'Inner Calm', gradient: ['#22c55e', '#06b6d4'], emoji: '🍃', trackCount: 29 },
  { id: 'm6', mood: 'Focused', title: 'Deep Work', gradient: ['#7c3aed', '#3b82f6'], emoji: '🧠', trackCount: 47 },
];

// ─── QUICK PLAY ───────────────────────────────────────────────────────────────
export const quickPlayItems = [
  { id: 'qp1', title: 'Late Night Drives', coverUrl: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=300&q=80', type: 'playlist' },
  { id: 'qp2', title: 'Northern Lights', coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=300&q=80', type: 'album' },
  { id: 'qp3', title: 'Morning Ritual', coverUrl: 'https://images.unsplash.com/photo-1519112232436-9e8442e69960?w=300&q=80', type: 'playlist' },
  { id: 'qp4', title: 'Focus Mode', coverUrl: 'https://images.unsplash.com/photo-1518972734183-c205f3d6f512?w=300&q=80', type: 'playlist' },
  { id: 'qp5', title: 'Bloom', coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=300&q=80', type: 'album' },
  { id: 'qp6', title: 'Workout Beast', coverUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=300&q=80', type: 'playlist' },
];
