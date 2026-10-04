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

// ─── TRACKS — Empty by default. Songs come from the Admin/Supabase catalog. ──
export const tracks: Track[] = [];

// ─── ALBUMS ──────────────────────────────────────────────────────────────────
export const albums: Album[] = [
  { id: 'al1', title: 'Northern Lights', artist: 'Aurora Nights', artistId: 'a1', coverUrl: 'https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=400&q=80', year: 2024, genre: 'Electronic', trackCount: 0, tracks: [] },
  { id: 'al2', title: 'Retrograde', artist: 'Neon Pulse', artistId: 'a2', coverUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=80', year: 2024, genre: 'Synthwave', trackCount: 0, tracks: [] },
  { id: 'al3', title: 'Bloom', artist: 'Luna Vega', artistId: 'a3', coverUrl: 'https://images.unsplash.com/photo-1519112232436-9e8442e69960?w=400&q=80', year: 2024, genre: 'Indie Pop', trackCount: 0, tracks: [] },
  { id: 'al4', title: 'Static', artist: 'The Midnight Code', artistId: 'a4', coverUrl: 'https://images.unsplash.com/photo-1518972734183-c205f3d6f512?w=400&q=80', year: 2023, genre: 'Alternative', trackCount: 0, tracks: [] },
  { id: 'al5', title: 'Velvet', artist: 'Celeste Ray', artistId: 'a5', coverUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80', year: 2024, genre: 'R&B', trackCount: 0, tracks: [] },
  { id: 'al6', title: 'Urban Dreams', artist: 'Cosmo Beat', artistId: 'a6', coverUrl: 'https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=400&q=80', year: 2024, genre: 'Hip-Hop', trackCount: 0, tracks: [] },
  { id: 'al7', title: 'Voltage', artist: 'Isla Storm', artistId: 'a7', coverUrl: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=400&q=80', year: 2024, genre: 'Pop', trackCount: 0, tracks: [] },
  { id: 'al8', title: 'Echoes', artist: 'Phantom Keys', artistId: 'a8', coverUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&q=80', year: 2023, genre: 'Jazz', trackCount: 0, tracks: [] },
];

// ─── PLAYLISTS ────────────────────────────────────────────────────────────────
export const playlists: Playlist[] = [
  { id: 'pl1', title: 'Late Night Drives', description: 'Perfect tracks for driving through the city at night', coverColors: ['#1a1a3e', '#7c3aed'], tracks: [], createdBy: 'MR music', isPublic: true, followers: 234000 },
  { id: 'pl2', title: 'Morning Ritual', description: 'Start your day with positive energy', coverColors: ['#1a3a1a', '#22c55e'], tracks: [], createdBy: 'MR music', isPublic: true, followers: 189000 },
  { id: 'pl3', title: 'Focus Mode', description: 'Deep concentration tracks for work & study', coverColors: ['#1a1a2e', '#3b82f6'], tracks: [], createdBy: 'MR music', isPublic: true, followers: 412000 },
  { id: 'pl4', title: 'Workout Beast', description: 'High energy tracks to crush your workout', coverColors: ['#3a1a1a', '#ef4444'], tracks: [], createdBy: 'MR music', isPublic: true, followers: 567000 },
  { id: 'pl5', title: 'Chill Vibes', description: 'Relax and unwind with smooth sounds', coverColors: ['#1a2a3a', '#06b6d4'], tracks: [], createdBy: 'MR music', isPublic: true, followers: 321000 },
  { id: 'pl6', title: 'Synthwave Dreams', description: 'Retro-futuristic vibes all day long', coverColors: ['#2a1a3e', '#ec4899'], tracks: [], createdBy: 'MR music', isPublic: true, followers: 178000 },
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

// ─── QUICK PLAY (kept for structure, populated dynamically from admin catalog) ─
export const quickPlayItems: { id: string; title: string; coverUrl: string; type: string }[] = [];
