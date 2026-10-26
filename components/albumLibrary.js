export function buildAlbums(tracks) {
  const grouped = new Map();

  for (const track of tracks) {
    const title = track.album?.trim() || 'Singles';
    const artist = track.albumArtist?.trim() || track.artist || 'Unknown Artist';
    const key = `${title.toLocaleLowerCase()}\u0000${artist.toLocaleLowerCase()}`;
    const album = grouped.get(key) ?? {
      id: key,
      title,
      artist,
      artwork: track.artwork ?? null,
      tracks: [],
    };
    album.tracks.push(track);
    grouped.set(key, album);
  }

  return [...grouped.values()].map((album) => {
    const durations = album.tracks.map((track) => track.durationSeconds);
    const hasAllDurations = durations.every((seconds) => Number.isFinite(seconds) && seconds > 0);
    const totalDuration = hasAllDurations ? durations.reduce((total, seconds) => total + seconds, 0) : null;
    const songCount = `${album.tracks.length} song${album.tracks.length === 1 ? '' : 's'}`;
    return {
      ...album,
      totalDuration,
      detail: totalDuration === null ? songCount : `${songCount}, ${formatDuration(totalDuration)}`,
    };
  });
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours} hr ${minutes} min`;
  return `${minutes} min ${seconds} sec`;
}
