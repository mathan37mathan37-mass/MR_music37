import type { Track, Playlist } from '@/types';
import { tracks as allTracks, playlists as allPlaylists } from '@/data/demo';

export interface RecommendationResults {
  madeForYou: Track[];
  becauseYouListenedTo: {
    seedTrack: Track;
    seedReason: string;
    tracks: Track[];
  } | null;
  youMayAlsoLike: Track[];
  recommendedPlaylists: Playlist[];
  trendingForYou: Track[];
  topGenres: { genre: string; score: number }[];
  topArtists: { artist: string; score: number }[];
}

/**
 * Transparent Rule-Based Music Recommendation Engine
 * 
 * Scores tracks deterministically using:
 * - Genre Affinity (liked songs, play counts, recent history)
 * - Artist Loyalty (followed artists, play frequency)
 * - Recency & Play Frequency Weights
 * - Novelty / Discovery Bonus for unplayed matching songs
 */
export function getRecommendations(
  likedSongIds: string[],
  recentlyPlayed: Track[],
  followedArtistIds: string[],
  playCounts: Record<string, number>,
  genrePlayCounts: Record<string, number>,
  artistPlayCounts: Record<string, number>,
  userPlaylists: Playlist[] = [],
  userFavoriteGenres: string[] = [],
  userFavoriteArtists: string[] = []
): RecommendationResults {
  // 1. Calculate Genre Affinity Scores
  const genreScores: Record<string, number> = {};
  
  // A. Points from genrePlayCounts
  for (const [genre, count] of Object.entries(genrePlayCounts)) {
    genreScores[genre] = (genreScores[genre] || 0) + count * 4;
  }

  // B. Points from liked songs
  for (const trackId of likedSongIds) {
    const t = allTracks.find((track) => track.id === trackId);
    if (t) {
      genreScores[t.genre] = (genreScores[t.genre] || 0) + 6;
    }
  }

  // C. Points from recently played
  recentlyPlayed.slice(0, 10).forEach((t, index) => {
    const recencyWeight = Math.max(1, 10 - index);
    genreScores[t.genre] = (genreScores[t.genre] || 0) + recencyWeight * 2;
  });

  const sortedGenres = Object.entries(genreScores)
    .sort((a, b) => b[1] - a[1])
    .map(([genre, score]) => ({ genre, score }));

  const topGenreNames = sortedGenres.slice(0, 3).map((g) => g.genre);

  // 2. Calculate Artist Affinity Scores
  const artistScores: Record<string, number> = {};

  for (const [artist, count] of Object.entries(artistPlayCounts)) {
    artistScores[artist] = (artistScores[artist] || 0) + count * 5;
  }

  for (const trackId of likedSongIds) {
    const t = allTracks.find((track) => track.id === trackId);
    if (t) {
      artistScores[t.artist] = (artistScores[t.artist] || 0) + 8;
    }
  }

  const sortedArtists = Object.entries(artistScores)
    .sort((a, b) => b[1] - a[1])
    .map(([artist, score]) => ({ artist, score }));

  const topArtistNames = sortedArtists.slice(0, 3).map((a) => a.artist);

  // 3. Score Every Available Track
  const scoredTracks = allTracks.map((track) => {
    let score = 0;

    const lowerGenre = track.genre.toLowerCase();
    const lowerArtist = track.artist.toLowerCase();
    const matchesFavoriteGenre = userFavoriteGenres.some((genre) => genre.toLowerCase() === lowerGenre);
    const matchesFavoriteArtist = userFavoriteArtists.some((artist) => artist.toLowerCase() === lowerArtist);

    // Genre match
    const genreRank = topGenreNames.indexOf(track.genre);
    if (genreRank === 0) score += 35;
    else if (genreRank === 1) score += 25;
    else if (genreRank === 2) score += 15;

    if (matchesFavoriteGenre) score += 22;

    // Artist match
    const artistRank = topArtistNames.indexOf(track.artist);
    if (artistRank === 0) score += 40;
    else if (artistRank === 1) score += 25;
    else if (artistRank === 2) score += 15;

    if (matchesFavoriteArtist) score += 28;

    if (followedArtistIds.includes(track.artistId || track.artist)) score += 18;

    // New-release bonus
    if ((track.year || 0) >= new Date().getFullYear() - 1) score += 12;

    // Liked bonus
    if (likedSongIds.includes(track.id)) {
      score += 15;
    }

    // Play frequency weight
    const plays = playCounts[track.id] || 0;
    score += Math.min(30, plays * 4);

    // Discovery bonus: If matching a top genre or artist but hasn't been played often
    if ((genreRank !== -1 || matchesFavoriteGenre) && plays === 0) {
      score += 20;
    }

    return { track, score };
  });

  // Sort by calculated rule-based score
  scoredTracks.sort((a, b) => b.score - a.score);

  // SECTION 1: Made For You (Top scored tracks)
  const madeForYou = scoredTracks.slice(0, 6).map((item) => item.track);

  // SECTION 2: Because You Listened To [Recent or Top Track]
  let becauseYouListenedTo: RecommendationResults['becauseYouListenedTo'] = null;
  const seedTrack = recentlyPlayed[0] || (scoredTracks[0] ? scoredTracks[0].track : allTracks[0]);

  if (seedTrack) {
    const relatedTracks = allTracks.filter(
      (t) =>
        t.id !== seedTrack.id &&
        (t.genre === seedTrack.genre || t.artist === seedTrack.artist)
    );

    // Fallback if not enough direct genre/artist matches
    const finalRelated =
      relatedTracks.length >= 3
        ? relatedTracks.slice(0, 5)
        : allTracks.filter((t) => t.id !== seedTrack.id).slice(0, 5);

    becauseYouListenedTo = {
      seedTrack,
      seedReason: `Matched by ${seedTrack.genre} and musical tempo`,
      tracks: finalRelated,
    };
  }

  // SECTION 3: You May Also Like (Discovery: tracks in secondary genres or unexplored tracks)
  const youMayAlsoLike = allTracks
    .filter((t) => !madeForYou.some((m) => m.id === t.id))
    .sort((a, b) => (playCounts[a.id] || 0) - (playCounts[b.id] || 0)) // prioritize newer / less played
    .slice(0, 6);

  // SECTION 4: Recommended Playlists (Playlists matching top genres or moods)
  // Deduplicate by playlist ID so there are never duplicate items or React key warnings
  const playlistMap = new Map<string, Playlist>();
  allPlaylists.forEach((p) => playlistMap.set(p.id, p));
  userPlaylists.forEach((p) => playlistMap.set(p.id, p));
  const allAvailablePlaylists = Array.from(playlistMap.values());

  const matchedPlaylists = allAvailablePlaylists
    .filter((p) => {
      // Check if playlist title or description matches user's top genres
      const text = `${p.title} ${p.description || ''}`.toLowerCase();
      return topGenreNames.some((g) => text.includes(g.toLowerCase()));
    })
    .slice(0, 4);

  // Fallback to top playlists if no exact genre keyword match
  const finalPlaylists =
    matchedPlaylists.length > 0
      ? matchedPlaylists
      : allAvailablePlaylists.slice(0, 4);

  // SECTION 5: Trending For You (Tracks with high overall popularity or play momentum)
  const trendingForYou = [...allTracks]
    .sort((a, b) => {
      const aWeight = (playCounts[a.id] || 0) * 2 + (likedSongIds.includes(a.id) ? 10 : 0);
      const bWeight = (playCounts[b.id] || 0) * 2 + (likedSongIds.includes(b.id) ? 10 : 0);
      return bWeight - aWeight;
    })
    .slice(0, 5);

  return {
    madeForYou,
    becauseYouListenedTo,
    youMayAlsoLike,
    recommendedPlaylists: finalPlaylists,
    trendingForYou,
    topGenres: sortedGenres.slice(0, 5),
    topArtists: sortedArtists.slice(0, 5),
  };
}
