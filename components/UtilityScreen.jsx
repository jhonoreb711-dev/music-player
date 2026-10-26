import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ImageBackground } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import christmasBackground from '../assets/christmas_bg4.png';
import { usePlayback } from './PlaybackContext';
import SongArtwork from './SongArtwork';
import { getUserAlbums } from './userAlbums';
import { useFavorites } from './FavoritesContext';
import { buildAlbums } from './albumLibrary';

const searchCategories = ['All', 'Songs', 'Albums'];
const libraryCategories = ['Favorites', 'Songs', 'Albums'];

export default function UtilityScreen({ page }) {
  const params = useLocalSearchParams();
  const query = typeof params.query === 'string' ? params.query : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const requestId = typeof params.requestId === 'string' ? params.requestId : '';
  return <UtilityContent key={JSON.stringify([page, query, category, requestId])} page={page} initialQuery={query} initialCategory={category} />;
}

function UtilityContent({ page, initialQuery, initialCategory }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [searchCategory, setSearchCategory] = useState(searchCategories.includes(initialCategory) ? initialCategory : 'All');
  const [libraryCategory, setLibraryCategory] = useState(libraryCategories.includes(initialCategory) ? initialCategory : 'Songs');
  const [selectedLibraryAlbumId, setSelectedLibraryAlbumId] = useState(null);
  const [savedAlbums, setSavedAlbums] = useState([]);
  const isSearch = page === 'Search';
  const { libraryId, playTrack, tracks } = usePlayback();
  const { favoriteTrackIds, favoriteAlbumIds } = useFavorites();
  useEffect(() => {
    let isMounted = true;
    getUserAlbums(libraryId).then((userAlbums) => {
      if (isMounted) setSavedAlbums(userAlbums);
    });
    return () => { isMounted = false; };
  }, [libraryId]);
  const libraryAlbums = useMemo(() => buildAlbums(tracks), [tracks]);
  const albumItems = useMemo(() => [
    ...savedAlbums.map((album) => {
      const albumTracks = album.trackIds.map((id) => tracks.find((track) => track.id === id)).filter(Boolean);
      const songCount = `${albumTracks.length} song${albumTracks.length === 1 ? '' : 's'}`;
      const albumWithTracks = { ...album, tracks: albumTracks, detail: songCount };
      return {
        id: album.id,
        title: albumWithTracks.title,
        subtitle: `Playlist · ${songCount}`,
        type: 'Album',
        image: albumWithTracks.artworkUri ? { uri: albumWithTracks.artworkUri } : null,
        album: albumWithTracks,
      };
    }),
    ...libraryAlbums.map((album) => ({
      id: album.id,
      title: album.title,
      subtitle: `${album.artist} · ${album.detail}`,
      type: 'Album',
      image: album.artwork,
      album,
    })),
  ], [savedAlbums, libraryAlbums, tracks]);
  const searchableItems = useMemo(() => [
    ...tracks.map((track) => ({ id: track.id, title: track.title, subtitle: `${track.artist} - Song`, type: 'Music', image: track.artwork, track })),
    ...albumItems,
  ], [albumItems, tracks]);
  const libraryItems = {
    Favorites: [
      ...tracks.filter((track) => favoriteTrackIds.includes(track.id)).map((track) => ({ id: track.id, title: track.title, subtitle: `${track.artist} - Song`, type: 'Music', image: track.artwork, track })),
      ...albumItems.filter((album) => favoriteAlbumIds.includes(album.id)),
    ],
    Songs: tracks.map((track) => ({ id: track.id, title: track.title, subtitle: `${track.artist} - Song`, type: 'Music', image: track.artwork, track })),
    Albums: albumItems,
  };

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return searchableItems.filter((item) => {
      const matchesCategory = searchCategory === 'All'
        || (searchCategory === 'Songs' && item.type === 'Music')
        || (searchCategory === 'Albums' && item.type === 'Album');
      const matchesQuery = !normalizedQuery
        || `${item.title} ${item.subtitle}`.toLocaleLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [query, searchCategory, searchableItems]);

  const selectedLibraryAlbum = albumItems.find((item) => item.id === selectedLibraryAlbumId);
  const albumTracks = selectedLibraryAlbum?.album.tracks.map((track) => ({
    id: track.id,
    title: track.title,
    subtitle: `${track.artist} - Song`,
    type: 'Music',
    image: track.artwork,
    track,
  }));
  const items = isSearch ? results : albumTracks ?? libraryItems[libraryCategory];

  return (
    <ImageBackground source={christmasBackground} contentFit="cover" style={styles.background}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        <View style={[styles.header, !isSearch && styles.libraryHeader, { paddingTop: insets.top + 42 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to previous screen"
            onPress={() => selectedLibraryAlbum ? setSelectedLibraryAlbumId(null) : router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={25} color={COLORS.ink} />
          </Pressable>
          <Text numberOfLines={1} style={styles.heading}>{isSearch ? 'Search' : selectedLibraryAlbum?.title ?? 'Your Library'}</Text>
        </View>

        {isSearch ? (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={20} color={COLORS.green} />
              <TextInput
              accessibilityLabel="Search songs and albums"
                value={query}
                onChangeText={setQuery}
                placeholder="What do you want to listen to?"
                placeholderTextColor={COLORS.muted}
                returnKeyType="search"
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  onPress={() => setQuery('')}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={19} color={COLORS.muted} />
                </Pressable>
              )}
            </View>

            <View style={styles.filters}>
              {searchCategories.map((category) => {
                const selected = searchCategory === category;
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSearchCategory(category)}
                    style={[styles.filterButton, selected && styles.filterButtonSelected]}
                  >
                    <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{category}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>
              {query.trim()
                ? 'Search results'
                : searchCategory === 'Songs' ? 'Songs' : searchCategory === 'Albums' ? 'Albums' : 'Browse music'}
            </Text>
            {query.trim() || searchCategory !== 'All' ? (
              <ItemList items={items} bottomInset={insets.bottom} onSelect={(item) => {
                if (item.track) { playTrack(item.track); router.push('/Player'); }
                else router.push({ pathname: '/Albums', params: { albumId: item.id } });
              }} />
            ) : (
              <View style={styles.browseCards}>
                <Pressable accessibilityRole="button" onPress={() => router.push('/Albums')} style={[styles.browseCard, styles.musicCard]}>
                  <Text style={styles.browseCardTitle}>Albums</Text>
                  <Text style={styles.browseCardSubtitle}>Browse by album</Text>
                  <Ionicons name="musical-notes" size={42} color="#fff8e9" style={styles.browseIcon} />
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => router.push('/Library')} style={[styles.browseCard, styles.musicCard]}>
                  <Text style={styles.browseCardTitle}>Songs</Text>
                  <Text style={styles.browseCardSubtitle}>Browse your music</Text>
                  <Ionicons name="headset" size={40} color="#fff8e9" style={styles.browseIcon} />
                </Pressable>
              </View>
            )}
          </>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.libraryFilters}
              style={styles.libraryFilterScroll}
            >
              {!selectedLibraryAlbum ? libraryCategories.map((category) => {
                const selected = libraryCategory === category;
                return (
                  <Pressable
                    key={category}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setLibraryCategory(category)}
                    style={[styles.filterButton, selected && styles.filterButtonSelected]}
                  >
                    <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]}>{category}</Text>
                  </Pressable>
                );
              }) : null}
            </ScrollView>
            <View style={styles.librarySection}>
              <Text style={[styles.sectionTitle, styles.librarySectionTitle]}>
                {selectedLibraryAlbum ? selectedLibraryAlbum.subtitle : libraryCategory === 'Albums' ? 'Your albums' : libraryCategory === 'Favorites' ? 'Favorites' : 'Your songs'}
              </Text>
              <ItemList items={items} bottomInset={insets.bottom} compact emptyMessage={libraryCategory === 'Favorites' ? 'No favorites yet. Tap a heart on a song or album to save it here.' : 'No music here yet. Add songs in Settings.'} onSelect={(item) => {
                if (item.track) { playTrack(item.track); router.push('/Player'); }
                else if (item.album) router.push({ pathname: '/Albums', params: { albumId: item.id } });
                else router.push('/Albums');
              }} />
            </View>
          </>
        )}

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <NavItem label="Home" icon="home" selected={false} onPress={() => router.replace('/Music')} />
          <NavItem label="Search" icon="search" selected={isSearch} onPress={() => isSearch ? null : router.replace('/Search')} />
          <NavItem label="Your Library" icon="library" selected={!isSearch} onPress={() => isSearch ? router.replace('/Library') : null} />
          <NavItem label="Settings" icon="settings" selected={false} onPress={() => router.replace('/Settings')} />
        </View>
      </View>
    </ImageBackground>
  );
}

function ItemList({ items, bottomInset, compact = false, onSelect, emptyMessage }) {
  return (
    <ScrollView
      contentContainerStyle={[
        styles.itemList,
        compact && styles.compactItemList,
        { paddingBottom: Math.max(bottomInset, 8) + (compact ? 60 : 72) },
      ]}
      style={compact && styles.libraryList}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {items.length > 0 ? items.map((item) => (
        <Pressable key={`${item.title}-${item.subtitle}`} accessibilityRole="button" onPress={() => onSelect?.(item)} style={[styles.itemRow, compact && styles.compactItemRow]}>
          <SongArtwork source={item.image} style={[styles.itemArt, compact && styles.compactItemArt]} iconSize={22} />
          <View style={styles.itemDetails}>
            <Text numberOfLines={1} style={styles.itemTitle}>{item.title}</Text>
            <Text numberOfLines={1} style={styles.itemSubtitle}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={COLORS.green} />
        </Pressable>
      )) : (
        <Text style={styles.emptyMessage}>{emptyMessage ?? (compact ? 'No music here yet. Add songs in Settings.' : 'No results found. Try another search.')}</Text>
      )}
    </ScrollView>
  );
}

function NavItem({ label, icon, selected, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={styles.navItem}>
      <Ionicons
        name={selected ? icon : `${icon}-outline`}
        size={21}
        color={selected ? COLORS.red : COLORS.muted}
      />
      <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const COLORS = {
  green: '#174d38',
  red: '#a62224',
  ink: '#28251f',
  muted: '#817764',
  cream: '#fff8e9',
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  libraryHeader: { paddingBottom: 4 },
  backButton: { width: 34, height: 36, justifyContent: 'center', marginRight: 4 },
  heading: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 22 },
  searchBox: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 18,
    paddingHorizontal: 14,
    borderRadius: 13,
    backgroundColor: COLORS.cream,
  },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 8, color: COLORS.ink, fontFamily: 'NunitoSemiBold', fontSize: 13 },
  filters: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 14, marginBottom: 18 },
  libraryFilterScroll: { flexGrow: 0, flexShrink: 0, height: 34 },
  libraryFilters: { gap: 9, paddingHorizontal: 20, paddingBottom: 0 },
  filterButton: {
    minWidth: 72,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 17,
    backgroundColor: COLORS.cream,
  },
  filterButtonSelected: { backgroundColor: COLORS.green },
  filterLabel: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 12 },
  filterLabelSelected: { color: COLORS.cream },
  sectionTitle: { marginHorizontal: 20, marginBottom: 10, color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 17 },
  librarySectionTitle: { marginTop: 0, marginBottom: 2 },
  librarySection: { flex: 1, minHeight: 0, marginTop: 12 },
  libraryList: { flex: 1 },
  itemList: { gap: 5, paddingHorizontal: 18, paddingTop: 1 },
  compactItemList: { gap: 2, paddingTop: 0 },
  itemRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 5, paddingVertical: 5 },
  compactItemRow: { minHeight: 56, gap: 10, paddingVertical: 3 },
  itemArt: { width: 54, height: 54, borderRadius: 8, backgroundColor: '#d9c7a4' },
  compactItemArt: { width: 46, height: 46 },
  itemDetails: { flex: 1, minWidth: 0 },
  itemTitle: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 14 },
  itemSubtitle: { color: '#5c554a', fontFamily: 'NunitoSemiBold', fontSize: 12 },
  emptyMessage: { marginHorizontal: 5, marginTop: 15, color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 13 },
  browseCards: { flexDirection: 'row', gap: 12, paddingHorizontal: 18 },
  browseCard: { flex: 1, minHeight: 132, justifyContent: 'flex-end', overflow: 'hidden', padding: 14, borderRadius: 15 },
  musicCard: { backgroundColor: COLORS.green },
  browseCardTitle: { color: COLORS.cream, fontFamily: 'NunitoExtraBold', fontSize: 17 },
  browseCardSubtitle: { color: COLORS.cream, fontFamily: 'NunitoSemiBold', fontSize: 11 },
  browseIcon: { position: 'absolute', right: 11, top: 12, opacity: 0.82 },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 7,
    backgroundColor: COLORS.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(75, 59, 37, 0.2)',
  },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 1 },
  navLabel: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 10 },
  navLabelSelected: { color: COLORS.red, fontFamily: 'NunitoExtraBold' },
});
