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
import { ImageBackground } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';

import christmasBackground from '../assets/christmas_bg4.png';
import { getPodcastVideos, savePodcastVideos } from '../components/podcastVideoStorage';

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
  const [isPicking, setIsPicking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getPodcastVideos().then(setVideos);
  }, []);

  const persist = useCallback(async (updatedVideos) => {
    setVideos(updatedVideos);
    try {
      await savePodcastVideos(updatedVideos);
      setMessage('');
    } catch {
      setMessage('Could not save your video list.');
    }
  }, []);

  const chooseVideo = async (existingVideo = null) => {
    if (isPicking) return;
    setIsPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/mp4',
        multiple: !existingVideo,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const imported = [];
      for (const [index, asset] of result.assets.entries()) {
        if (!asset.name?.toLowerCase().endsWith('.mp4')) continue;
        const id = `${Date.now()}-${index}`;
        const storedFile = new File(Paths.document, `podcast-video-${id}.mp4`);
        await new File(asset.uri).copy(storedFile);
        imported.push({
          id: existingVideo?.id ?? id,
          name: asset.name,
          uri: storedFile.uri,
        });
      }

      if (!imported.length) {
        setMessage('Select an MP4 video to add.');
        return;
      }

      const updatedVideos = existingVideo
        ? videos.map((video) => video.id === existingVideo.id ? imported[0] : video)
        : [...videos, ...imported];
      await persist(updatedVideos);

      if (existingVideo) {
        try {
          const oldFile = new File(existingVideo.uri);
          if (oldFile.exists) oldFile.delete();
        } catch {}
        if (selectedVideo?.id === existingVideo.id) setSelectedVideo(imported[0]);
      }
    } catch (error) {
      setMessage(error.message || 'Could not add that video.');
    } finally {
      setIsPicking(false);
    }
  };

  const removeVideo = async (video) => {
    const updatedVideos = videos.filter((item) => item.id !== video.id);
    await persist(updatedVideos);
    try {
      const storedFile = new File(video.uri);
      if (storedFile.exists) storedFile.delete();
    } catch {}
    if (selectedVideo?.id === video.id) setSelectedVideo(null);
  };

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
            <Text style={styles.subtitle}>Your MP4 collection</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add MP4 videos"
            disabled={isPicking}
            onPress={() => chooseVideo()}
            style={[styles.addButton, isPicking && styles.disabledButton]}
          >
            <Ionicons name="add" size={25} color={COLORS.cream} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {videos.length ? (
            <View style={styles.videoList}>
              {videos.map((video) => (
                <View key={video.id} style={styles.videoCard}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${video.name}`}
                    onPress={() => setSelectedVideo(video)}
                    style={styles.videoMain}
                  >
                    <View style={styles.videoIcon}>
                      <Ionicons name="play" size={20} color={COLORS.cream} />
                    </View>
                    <View style={styles.videoDetails}>
                      <Text numberOfLines={1} style={styles.videoName}>{video.name}</Text>
                      <Text style={styles.videoType}>MP4 video</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Replace ${video.name}`}
                    disabled={isPicking}
                    onPress={() => chooseVideo(video)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="create-outline" size={20} color={COLORS.green} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${video.name}`}
                    onPress={() => removeVideo(video)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" size={19} color={COLORS.red} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="videocam-outline" size={34} color={COLORS.green} />
              </View>
              <Text style={styles.emptyTitle}>Your video collection is ready</Text>
              <Text style={styles.emptyMessage}>MP4 videos you add will be kept here. Add one whenever you’re ready.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => chooseVideo()}
                disabled={isPicking}
                style={[styles.emptyAddButton, isPicking && styles.disabledButton]}
              >
                <Ionicons name="add" size={20} color={COLORS.cream} />
                <Text style={styles.emptyAddText}>{isPicking ? 'Opening videos…' : 'Add MP4 videos'}</Text>
              </Pressable>
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
  addButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  disabledButton: { opacity: 0.6 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  message: { color: COLORS.red, fontFamily: 'NunitoSemiBold', fontSize: 13, marginBottom: 12 },
  videoList: { gap: 10 },
  videoCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 16, backgroundColor: 'rgba(255,248,233,0.92)' },
  videoMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  videoIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green },
  videoDetails: { flex: 1, minWidth: 0 },
  videoName: { color: COLORS.ink, fontFamily: 'NunitoBold', fontSize: 14 },
  videoType: { color: COLORS.muted, fontFamily: 'NunitoRegular', fontSize: 12, marginTop: 2 },
  actionButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, borderRadius: 24, backgroundColor: 'rgba(255,248,233,0.84)' },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,77,56,0.1)' },
  emptyTitle: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 18, textAlign: 'center', marginTop: 18 },
  emptyMessage: { color: COLORS.muted, fontFamily: 'NunitoRegular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
  emptyAddButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18, marginTop: 20, borderRadius: 22, backgroundColor: COLORS.green },
  emptyAddText: { color: COLORS.cream, fontFamily: 'NunitoBold', fontSize: 14 },
  bottomBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(75,59,37,0.22)', backgroundColor: COLORS.cream },
  tab: { flex: 1, minWidth: 0, alignItems: 'center', gap: 2 },
  tabLabel: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 11 },
  playerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  fullVideo: { width: '100%', flex: 1 },
  closeButton: { position: 'absolute', top: 52, right: 20, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  playingName: { position: 'absolute', top: 60, left: 20, right: 72, color: '#fff', fontFamily: 'NunitoBold', fontSize: 16 },
});
