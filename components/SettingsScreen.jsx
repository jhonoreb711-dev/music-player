import { useRef, useState } from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayback } from './PlaybackContext';

import christmasBackground from '../assets/christmas_bg4.png';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [statusMessage, setStatusMessage] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scanInProgress = useRef(false);
  const { tracks, musicFolderName, chooseMusicFolder, rescanMusicFolder, addAudioFiles } = usePlayback();

  const pickMusicFolder = async () => {
    try {
      const { folderName, trackCount } = await chooseMusicFolder();
      setStatusMessage(`${folderName}: ${trackCount} ${trackCount === 1 ? 'track' : 'tracks'} added.`);
    } catch (error) {
      setStatusMessage(error.message || 'Could not choose a music folder.');
    }
  };

  const rescanMusic = async () => {
    if (scanInProgress.current) return;
    if (!musicFolderName && Platform.OS === 'android') {
      setStatusMessage('Choose a music folder first.');
      return;
    }
    scanInProgress.current = true;
    setIsScanning(true);
    try {
      const count = Platform.OS === 'android'
        ? await rescanMusicFolder()
        : await addAudioFiles();
      setStatusMessage(count
        ? `Found ${count} ${count === 1 ? 'track' : 'tracks'} in ${musicFolderName}.`
        : 'No audio files found. Check the folder and try again.');
    } catch (error) {
      setStatusMessage(error.message || 'Could not rescan the music folder.');
    } finally {
      scanInProgress.current = false;
      setIsScanning(false);
    }
  };

  return (
    <ImageBackground source={christmasBackground} contentFit="cover" style={styles.background}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.screen}>
        <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to your library"
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={25} color={COLORS.ink} />
            </Pressable>
            <Text style={styles.heading}>Settings</Text>
          </View>

          <Text style={styles.intro}>Manage your music library.</Text>
        </View>

        <ScrollView
          style={styles.settingsScroll}
          contentContainerStyle={[styles.settingsScrollContent, { paddingBottom: Math.max(insets.bottom, 8) + 76 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionTitle}>Music library</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{Platform.OS === 'android' ? 'Music folder' : 'Add music'}</Text>
            <Text style={styles.helperText}>
              {Platform.OS === 'android'
                ? musicFolderName ? `Folder: ${musicFolderName}` : 'Choose the folder where your songs are saved.'
                : 'Choose audio files from your phone, then they will be added to your library.'}
            </Text>
            <Text style={styles.helperText}>
              {Platform.OS === 'android'
                ? musicFolderName
                  ? 'Add songs to this folder, then tap Rescan.'
                  : 'Choose your songs folder, then tap Rescan.'
                : 'Supported formats: MP3, M4A, WAV, AAC, OGG, and FLAC.'}
            </Text>
            <Text style={styles.helperText}>Songs are copied into the app. Album tags group them into albums.</Text>
            {Platform.OS === 'android' ? (
              <Pressable
                accessibilityRole="button"
              disabled={isScanning}
                onPress={pickMusicFolder}
                style={({ pressed }) => [styles.secondaryButton, styles.folderButton, pressed && styles.pressed]}
              >
                <Ionicons name="folder-open-outline" size={18} color={COLORS.green} />
                <Text style={styles.secondaryButtonText}>{musicFolderName ? 'Change music folder' : 'Choose music folder'}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              disabled={isScanning}
              onPress={rescanMusic}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Ionicons name={isScanning ? 'hourglass-outline' : 'refresh-outline'} size={18} color={COLORS.green} />
              <Text style={styles.secondaryButtonText}>{isScanning ? 'Scanning...' : Platform.OS === 'android' ? 'Rescan music folder' : 'Add audio files'}</Text>
            </Pressable>
            <Text style={styles.helperText}>{tracks.length} playable {tracks.length === 1 ? 'track' : 'tracks'} in your library.</Text>
          </View>

          {statusMessage ? (
            <View accessibilityRole="text" style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          ) : null}

        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {[
            { label: 'Home', icon: 'home' },
            { label: 'Search', icon: 'search' },
            { label: 'Your Library', icon: 'library' },
            { label: 'Settings', icon: 'settings' },
          ].map((tab) => {
            const selected = tab.label === 'Settings';
            return (
              <Pressable
                key={tab.label}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (tab.label === 'Home') router.replace('/Music');
                  if (tab.label === 'Search') router.replace('/Search');
                  if (tab.label === 'Your Library') router.replace('/Library');
                  if (tab.label === 'Settings') router.replace('/Settings');
                }}
                style={styles.navItem}
              >
                <Ionicons
                  name={selected ? tab.icon : `${tab.icon}-outline`}
                  size={21}
                  color={selected ? COLORS.red : COLORS.muted}
                />
                <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

      </View>
    </ImageBackground>
  );
}

const COLORS = {
  green: '#174d38',
  red: '#a62224',
  ink: '#28251f',
  muted: '#817764',
  cream: '#fff8e9',
  line: '#e9dcc4',
};

const styles = StyleSheet.create({
  background: { flex: 1, width: '100%' },
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 20 },
  settingsScroll: { flex: 1, marginHorizontal: 20, overflow: 'hidden' },
  settingsScrollContent: { paddingBottom: 84 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 7, backgroundColor: COLORS.cream, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(75, 59, 37, 0.2)' },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 1 },
  navLabel: { color: COLORS.muted, fontFamily: 'NunitoSemiBold', fontSize: 10 },
  navLabelSelected: { color: COLORS.red, fontFamily: 'NunitoExtraBold' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, marginTop: 30 },
  backButton: { width: 34, height: 36, justifyContent: 'center', marginRight: 4 },
  heading: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 22 },
  intro: { color: '#5c554a', fontFamily: 'NunitoSemiBold', fontSize: 13, marginBottom: 12 },
  sectionTitle: { color: COLORS.ink, fontFamily: 'NunitoExtraBold', fontSize: 16, marginTop: 8, marginBottom: 7 },
  card: { padding: 14, borderRadius: 14, backgroundColor: COLORS.cream },
  fieldLabel: { color: COLORS.muted, fontFamily: 'NunitoBold', fontSize: 11, marginBottom: 3 },
  input: { minHeight: 38, paddingVertical: 5, color: COLORS.ink, fontFamily: 'NunitoSemiBold', fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: COLORS.line, marginVertical: 7 },
  helperText: { color: COLORS.muted, fontFamily: 'NunitoRegular', fontSize: 11, marginTop: 2, marginBottom: 9 },
  secondaryButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.green, borderRadius: 11 },
  folderButton: { marginBottom: 10 },
  secondaryButtonText: { color: COLORS.green, fontFamily: 'NunitoExtraBold', fontSize: 13 },
  statusBox: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: COLORS.cream },
  statusText: { color: COLORS.green, fontFamily: 'NunitoSemiBold', fontSize: 12 },
  pressed: { opacity: 0.82 },
});
