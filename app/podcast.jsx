import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import christmasBackground from '../assets/christmas_bg4.png';
import { getPodcastVideos } from '../components/podcastVideoStorage';

const COLORS = {
  green: '#164d38',
  red: '#a62224',
  ink: '#29251e',
  muted: '#837866',
  cream: '#fff8e9',
};

export default function PodcastScreen() {
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    getPodcastVideos().then((storedVideos) => {
      if (active) setVideos(storedVideos);
    });
    return () => { active = false; };
  }, []));

  return (
    <ImageBackground source={christmasBackground} contentFit="cover" style={styles.background}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={21} color={COLORS.green} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Podcast videos</Text>
            <Text style={styles.subtitle}>Your video playlist</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {videos.length ? (
            <View style={styles.videoList}>
              {videos.map((video) => (
                <PodcastVideoCard key={video.id} video={video} onPress={() => setSelectedVideo(video)} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-outline" size={34} color={COLORS.green} />
              </View>
              <Text style={styles.emptyTitle}>No podcast videos yet</Text>
              <Text style={styles.emptyMessage}>Add MP4 videos from Settings. They will appear in this list.</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {[
            { label: 'Home', icon: 'home' },
            { label: 'Search', icon: 'search' },
            { label: 'Your Library', icon: 'library' },
            { label: 'Settings', icon: 'settings' },
          ].map((tab) => (
            <Pressable
              key={tab.label}
              accessibilityRole="button"
              onPress={() => {
                if (tab.label === 'Home') router.replace('/Music');
                if (tab.label === 'Search') router.push('/Search');
                if (tab.label === 'Your Library') router.push('/Library');
                if (tab.label === 'Settings') router.push('/Settings');
              }}
              style={styles.tab}
            >
              <Ionicons name={`${tab.icon}-outline`} size={23} color={COLORS.muted} />
              <Text style={styles.tabLabel}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal visible={Boolean(selectedVideo)} animationType="fade" onRequestClose={() => setSelectedVideo(null)}>
        {selectedVideo ? <PodcastVideoPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} /> : null}
      </Modal>
    </ImageBackground>
  );
}

function PodcastVideoCard({ video, onPress }) {
  const player = useVideoPlayer(video.uri, (videoPlayer) => {
    videoPlayer.muted = true;
    videoPlayer.pause();
  });
  const [thumbnail, setThumbnail] = useState(null);

  useEffect(() => {
    let active = true;
    let generating = false;
    const createThumbnail = async () => {
      if (generating || player.status !== 'readyToPlay') return;
      generating = true;
      try {
        const thumbnails = await player.generateThumbnailsAsync([1], { maxWidth: 640, maxHeight: 360 });
        if (active && thumbnails.length) setThumbnail(thumbnails[0]);
      } catch {
        // Keep the branded video placeholder if this codec/device cannot make a preview.
      }
    };
    const subscription = player.addListener('statusChange', createThumbnail);
    createThumbnail();
    return () => {
      active = false;
      subscription.remove();
      player.pause();
    };
  }, [player]);

  return (
    <View style={styles.videoCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${video.name}`}
        onPress={onPress}
        style={({ pressed }) => [styles.videoMain, pressed && styles.videoPressed]}
      >
        <View style={styles.videoPreview}>
          {thumbnail ? (
            <Image source={thumbnail} contentFit="cover" style={styles.videoThumbnail} />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Ionicons name="videocam" size={36} color={COLORS.cream} />
            </View>
          )}
          <View style={styles.videoPlayBadge}>
            <Ionicons name="play" size={18} color={COLORS.cream} />
          </View>
          <View style={styles.videoTag}><Text style={styles.videoTagText}>VIDEO</Text></View>
        </View>
        <View style={styles.videoDetails}>
          <Text numberOfLines={2} style={styles.videoName}>{video.name}</Text>
          <Text style={styles.videoType}>Podcast video</Text>
        </View>
      </Pressable>
    </View>
  );
}

function PodcastVideoPlayer({ video, onClose }) {
  const player = useVideoPlayer(video.uri, (videoPlayer) => {
    videoPlayer.play();
  });

  return (
    <View style={styles.playerScreen}>
      <StatusBar hidden />
      <VideoView player={player} style={styles.fullVideo} contentFit="contain" nativeControls />
      <Pressable accessibilityRole="button" accessibilityLabel="Close video" onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={25} color="#fff" />
      </Pressable>
      <Text numberOfLines={1} style={styles.playingName}>{video.name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 18 },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,233,0.88)' },
  headerTitles: { flex: 1 },
  title: { color: COLORS.green, fontFamily: 'NunitoExtraBold', fontSize: 22 },
  subtitle: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 12, marginTop: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  videoList: { gap: 16 },
  videoCard: { overflow: 'hidden', borderRadius: 16, backgroundColor: 'rgba(255,248,233,0.94)', borderWidth: 1, borderColor: 'rgba(22,77,56,0.18)' },
  videoMain: { minWidth: 0 },
  videoPressed: { opacity: 0.88 },
  videoPreview: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', backgroundColor: '#102b20', alignItems: 'center', justifyContent: 'center' },
  videoThumbnail: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  videoPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  videoPlayBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingLeft: 3, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(255,248,233,0.85)' },
  videoTag: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: 'rgba(0,0,0,0.72)' },
  videoTagText: { color: '#fff', fontFamily: 'NunitoExtraBold', fontSize: 9, letterSpacing: 0.5 },
  videoDetails: { minHeight: 54, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  videoName: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 14 },
  videoType: { color: COLORS.muted, fontFamily: 'NunitoRegular', fontSize: 12, marginTop: 2 },
  emptyState: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, borderRadius: 24, backgroundColor: 'rgba(255,248,233,0.84)' },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,77,56,0.1)' },
  emptyTitle: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 18, textAlign: 'center', marginTop: 18 },
  emptyMessage: { color: COLORS.muted, fontFamily: 'NunitoRegular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  bottomBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(75,59,37,0.22)', backgroundColor: COLORS.cream },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  tabLabel: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 11 },
  playerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  fullVideo: { width: '100%', flex: 1 },
  closeButton: { position: 'absolute', top: 52, right: 20, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  playingName: { position: 'absolute', top: 60, left: 20, right: 72, color: '#fff', fontFamily: 'NunitoBold', fontSize: 16 },
});
