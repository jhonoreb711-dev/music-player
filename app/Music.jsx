import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ImageBackground } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import christmasBackground from '../assets/christmas_bg4.png';
import homeVideo from '../assets/youtube-video.mp4';
import { usePlayback } from '../components/PlaybackContext';
import SongArtwork from '../components/SongArtwork';

const categories = ['All', 'Music'];
const ALPHABET_LETTERS = ['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), '#'];

function HomeVideo({ playing }) {
  const player = useVideoPlayer(homeVideo, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  useFocusEffect(useCallback(() => {
    if (playing) {
      player.pause();
      return undefined;
    }
    player.play();
    return () => player.pause();
  }, [playing, player]));

  return (
    <VideoView
      player={player}
      style={styles.homeVideo}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function Music() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLetter, setSelectedLetter] = useState('All');
  const { currentTrack, playTrack, playQueue, recentlyPlayed, tracks, playing } = usePlayback();
  const recentItems = useMemo(() => recentlyPlayed.map((entry) => {
    if (entry.type === 'track') {
      const track = tracks.find((item) => item.id === entry.id);
      return track ? { key: `track:${track.id}`, title: track.title, subtitle: track.artist, image: track.artwork, track } : null;
    }
    const songCount = entry.trackIds.length;
    return { key: `album:${entry.id}`, title: entry.title, subtitle: `Playlist · ${songCount} song${songCount === 1 ? '' : 's'}`, image: entry.artworkUri ? { uri: entry.artworkUri } : null, album: entry };
  }).filter(Boolean), [recentlyPlayed, tracks]);

  const sortedSongs = useMemo(() => {
    return [...tracks]
      .sort((first, second) => (first.title || '').localeCompare(second.title || '', undefined, { sensitivity: 'base', numeric: true }))
      .map((track) => ({ ...track, image: track.artwork }));
  }, [tracks]);

  const availableLetters = useMemo(() => {
    const set = new Set();
    sortedSongs.forEach((song) => {
      const firstChar = (song.title || '').trim().charAt(0).toUpperCase();
      set.add(/[A-Z]/.test(firstChar) ? firstChar : '#');
    });
    return set;
  }, [sortedSongs]);

  const groupedSections = useMemo(() => {
    const groups = {};
    sortedSongs.forEach((song) => {
      const firstChar = (song.title || '').trim().charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(song);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
    return sortedKeys.map((letter) => ({
      letter,
      songs: groups[letter],
    }));
  }, [sortedSongs]);

  const displayedSections = useMemo(() => {
    if (selectedLetter === 'All') return groupedSections;
    return groupedSections.filter((sec) => sec.letter === selectedLetter);
  }, [groupedSections, selectedLetter]);

  return (
    <ImageBackground
      source={christmasBackground}
      contentFit="cover"
      style={styles.background}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        <View style={[styles.content, { paddingTop: insets.top + 42 }]}>
          {Platform.OS !== 'web' ? <HomeVideo playing={playing} /> : null}
          <View style={styles.header}>
            <View>
              <Text numberOfLines={1} style={styles.name}>What sounds good today?</Text>
              <Text style={styles.greeting}>Pick a song for the moment.</Text>
            </View>
          </View>

          <View style={styles.categories}>
            {categories.map((category) => {
              const isSelected = category === selectedCategory;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    setSelectedCategory(category);
                    if (category === 'Music') router.push('/Albums');
                  }}
                  style={[styles.categoryPill, isSelected && styles.categoryPillSelected]}
                >
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.sectionHeading, styles.recentHeading]}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/RecentlyPlayed')} hitSlop={8}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>

          {recentItems.length ? (
            <ScrollView horizontal style={styles.recentScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
              {recentItems.map((item) => (
                <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={`Play recently played ${item.title}`} onPress={() => {
                  if (item.track) {
                    playTrack(item.track);
                    router.push('/Player');
                    return;
                  }
                  const trackIds = item.album.trackIds ?? item.album.tracks?.map((t) => t.id) ?? [];
                  const albumTracks = trackIds.map((id) => tracks.find((track) => track.id === id)).filter((track) => track?.source);
                  if (albumTracks.length) {
                    playQueue(albumTracks, albumTracks[0], { type: 'album', id: item.album.id, title: item.album.title, artworkUri: item.album.artworkUri, trackIds });
                    router.push('/Player');
                  } else {
                    router.push({ pathname: '/Albums', params: { albumId: item.album.id } });
                  }
                }} style={styles.albumCard}>
                  <SongArtwork source={item.image} style={styles.albumArt} />
                  <Text numberOfLines={1} style={styles.albumTitle}>{item.title}</Text>
                  <Text numberOfLines={1} style={styles.albumSubtitle}>{item.subtitle}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.recentEmpty}>
              <Ionicons name="time-outline" size={22} color={COLORS.green} />
              <Text style={styles.recentEmptyText}>Songs and albums you play will show up here.</Text>
            </View>
          )}

          <View style={[styles.sectionHeading, styles.songsHeading]}>
            <View style={styles.headingTitleRow}>
              <Text style={styles.sectionTitle}>Local Songs</Text>
              {sortedSongs.length ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{sortedSongs.length}</Text>
                </View>
              ) : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Search your music" onPress={() => router.push('/Search')} hitSlop={8} style={styles.searchLink}>
              <Ionicons name="search" size={14} color={COLORS.green} />
              <Text style={styles.seeAll}>Search</Text>
            </Pressable>
          </View>

          {sortedSongs.length > 0 ? (
            <View style={styles.alphabetBarWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.alphabetBar}
              >
                {ALPHABET_LETTERS.map((letter) => {
                  const isSelected = letter === selectedLetter;
                  const isAvailable = letter === 'All' || availableLetters.has(letter);
                  return (
                    <Pressable
                      key={letter}
                      accessibilityRole="button"
                      accessibilityLabel={letter === 'All' ? 'Show all songs' : `Filter songs starting with ${letter}`}
                      accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
                      disabled={!isAvailable}
                      onPress={() => setSelectedLetter(letter)}
                      style={[
                        styles.letterPill,
                        isSelected && styles.letterPillSelected,
                        !isAvailable && styles.letterPillDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.letterText,
                          isSelected && styles.letterTextSelected,
                          !isAvailable && styles.letterTextDisabled,
                        ]}
                      >
                        {letter}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <ScrollView
            style={styles.songScroll}
            contentContainerStyle={[styles.songList, { paddingBottom: currentTrack ? 64 : 12 }]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {displayedSections.map((section) => (
              <View key={section.letter} style={styles.sectionBlock}>
                <View style={styles.letterHeader}>
                  <View style={styles.letterBadge}>
                    <Text style={styles.letterBadgeText}>{section.letter}</Text>
                  </View>
                  <View style={styles.letterLine} />
                  <Text style={styles.letterCount}>
                    {section.songs.length} {section.songs.length === 1 ? 'song' : 'songs'}
                  </Text>
                </View>
                <View style={styles.sectionSongs}>
                  {section.songs.map((song) => (
                    <Pressable
                      key={song.id || `${section.letter}-${song.title}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${song.title} by ${song.artist || 'Unknown artist'}`}
                      onPress={() => {
                        playTrack(song);
                        router.push('/Player');
                      }}
                      style={styles.songRow}
                    >
                      <SongArtwork source={song.image} style={styles.songArt} iconSize={20} />
                      <View style={styles.songDetails}>
                        <Text numberOfLines={1} style={styles.songTitle}>{song.title}</Text>
                        <Text numberOfLines={1} style={styles.songArtist}>{song.artist || 'Unknown artist'}</Text>
                      </View>
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={14} color={COLORS.green} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            {!sortedSongs.length ? (
              <View style={styles.emptySongs}>
                <Ionicons name="musical-notes-outline" size={26} color={COLORS.green} />
                <Text style={styles.emptySongsTitle}>No songs yet</Text>
                <Text style={styles.emptySongsMessage}>Choose your music folder in Settings, then rescan it.</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/Settings')} style={styles.emptySongsButton}>
                  <Text style={styles.emptySongsButtonText}>Open Settings</Text>
                </Pressable>
              </View>
            ) : selectedLetter !== 'All' && !displayedSections.length ? (
              <View style={styles.emptyFilter}>
                <Ionicons name="filter-outline" size={22} color={COLORS.green} />
                <Text style={styles.emptyFilterText}>{`No songs starting with "${selectedLetter}"`}</Text>
                <Pressable accessibilityRole="button" onPress={() => setSelectedLetter('All')} style={styles.clearFilterButton}>
                  <Text style={styles.clearFilterText}>Show all songs</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {[
            { label: 'Home', icon: 'home' },
            { label: 'Search', icon: 'search' },
            { label: 'Your Library', icon: 'library' },
            { label: 'Settings', icon: 'settings' },
          ].map((tab) => {
            const isSelected = tab.label === 'Home';
            return (
              <Pressable
                key={tab.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => {
                  if (tab.label === 'Home') router.replace('/Music');
                  if (tab.label === 'Search') router.push('/Search');
                  if (tab.label === 'Your Library') router.push('/Library');
                  if (tab.label === 'Settings') router.push('/Settings');
                }}
                style={styles.tab}
              >
                <Ionicons
                  name={isSelected ? tab.icon : `${tab.icon}-outline`}
                  size={23}
                  color={isSelected ? COLORS.red : COLORS.muted}
                />
                <Text style={[styles.tabLabel, isSelected && styles.tabLabelSelected]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ImageBackground>
  );
}

const COLORS = {
  green: '#164d38',
  red: '#a62224',
  ink: '#29251e',
  muted: '#837866',
  cream: '#fff8e9',
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { flex: 1, minHeight: 0, paddingHorizontal: 20 },
    homeVideo: {
      width: '100%',
      height: 168,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 12,
      backgroundColor: '#164d38',
    },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  greeting: { color: '#5b5141', fontFamily: 'NunitoSemiBold', fontSize: 14 },
  name: { color: COLORS.green, fontFamily: 'NunitoExtraBold', fontSize: 23, lineHeight: 27 },
  categories: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  categoryPill: {
    minWidth: 76,
    height: 36,
    paddingHorizontal: 17,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
  categoryPillSelected: { backgroundColor: COLORS.green },
  categoryText: { color: '#665f50', fontFamily: 'NunitoBold', fontSize: 12 },
  categoryTextSelected: { color: '#fff8e9' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  recentHeading: { marginBottom: 6 },
  sectionTitle: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 17 },
  seeAll: { color: COLORS.green, fontFamily: 'NunitoBold', fontSize: 12 },
  recentScroll: { height: 132, flexGrow: 0, flexShrink: 0 },
  recentRow: { flexDirection: 'row', gap: 11 },
  albumCard: { width: 104 },
  albumArt: { width: '100%', aspectRatio: 1.25, borderRadius: 10, backgroundColor: '#d9c7a4' },
  albumTitle: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 12, marginTop: 4 },
  albumSubtitle: { color: '#5e5548', fontFamily: 'NunitoRegular', fontSize: 11 },
  recentEmpty: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,248,233,0.72)' },
  recentEmptyText: { color: '#5e5548', fontFamily: 'NunitoSemiBold', fontSize: 12, flexShrink: 1 },
  songsHeading: { marginTop: 12, marginBottom: 8 },
  headingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: {
    backgroundColor: 'rgba(22, 77, 56, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 9,
  },
  countBadgeText: { color: COLORS.green, fontFamily: 'NunitoBold', fontSize: 11 },
  searchLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alphabetBarWrapper: { marginBottom: 10 },
  alphabetBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  letterPill: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 248, 233, 0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(75, 59, 37, 0.14)',
  },
  letterPillSelected: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  letterPillDisabled: {
    opacity: 0.32,
    backgroundColor: 'transparent',
  },
  letterText: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 12 },
  letterTextSelected: { color: COLORS.cream, fontFamily: 'NunitoExtraBold' },
  letterTextDisabled: { color: COLORS.muted },
  sectionBlock: { marginBottom: 14 },
  letterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 4 },
  letterBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.green, alignItems: 'center', justifyContent: 'center' },
  letterBadgeText: { color: COLORS.cream, fontFamily: 'NunitoExtraBold', fontSize: 11 },
  letterLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(75, 59, 37, 0.16)' },
  letterCount: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 11 },
  sectionSongs: { gap: 8 },
  emptyFilter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
    backgroundColor: 'rgba(255, 248, 233, 0.7)',
    borderRadius: 12,
  },
  emptyFilterText: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 13 },
  clearFilterButton: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.green,
  },
  clearFilterText: { color: COLORS.cream, fontFamily: 'NunitoBold', fontSize: 11 },
  songScroll: { flex: 1, minHeight: 0 },
  songList: { gap: 8 },
  emptySongs: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24, borderRadius: 14, backgroundColor: 'rgba(255,248,233,0.86)' },
  emptySongsTitle: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 14, marginTop: 8, textAlign: 'center' },
  emptySongsMessage: { color: COLORS.muted, fontFamily: 'NunitoRegular', fontSize: 12, lineHeight: 17, marginTop: 4, textAlign: 'center' },
  emptySongsButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 16, marginTop: 12, borderRadius: 18, backgroundColor: COLORS.green },
  emptySongsButtonText: { color: COLORS.cream, fontFamily: 'NunitoBold', fontSize: 12 },
  songRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10 },
  songArt: { width: 44, height: 44, borderRadius: 7, backgroundColor: '#d9c7a4' },
  songDetails: { flex: 1, minWidth: 0 },
  songTitle: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 12 },
  songArtist: { color: '#655c4e', fontFamily: 'NunitoRegular', fontSize: 11 },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cream,
  },
  bottomBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(75, 59, 37, 0.22)',
    backgroundColor: COLORS.cream,
  },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  tabLabel: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 11 },
  tabLabelSelected: { color: COLORS.red, fontFamily: 'NunitoExtraBold' },
});
