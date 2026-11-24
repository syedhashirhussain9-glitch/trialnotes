import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Button, Card, Screen, Stat, TextField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../db/database';
import * as repo from '../db/repo';
import {
  DUNDEE,
  LatLng,
  formatDistance,
  formatDuration,
  formatPace,
  haversine,
  isPlausibleFix,
  simulatedFix,
  spokenDuration,
} from '../lib/geo';
import { persistPhoto, removePhoto } from '../lib/photos';
import { validateNotes, validateTitle } from '../lib/validation';
import { Weather, fetchWeather } from '../lib/weather';
import { spacing, useTheme } from '../theme';

type Phase = 'idle' | 'tracking' | 'saving';

function defaultTitle(ms: number) {
  const h = new Date(ms).getHours();
  return `${h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'} walk`;
}

export default function RecordScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>('idle');
  const [simulate, setSimulate] = useState(false);
  const [distance, setDistance] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [pointCount, setPointCount] = useState(0);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needSettings, setNeedSettings] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ title?: string | null; notes?: string | null }>({});
  const [saving, setSaving] = useState(false);

  // Mutable tracking state lives in refs so GPS callbacks never read stale values.
  const routeRef = useRef<LatLng[]>([]);
  const startRef = useRef(0);
  const finalElapsed = useRef(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSources = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    if (simRef.current) clearInterval(simRef.current);
    timerRef.current = null;
    simRef.current = null;
  }, []);

  // Release GPS + timers if the screen is unmounted (saves battery, prevents leaks).
  useEffect(() => stopSources, [stopSources]);

  const addFix = useCallback((fix: LatLng, accuracy?: number | null) => {
    const prev = routeRef.current[routeRef.current.length - 1];
    if (!isPlausibleFix(prev, fix, accuracy)) return;
    routeRef.current.push(fix);
    if (prev) setDistance((d) => d + haversine(prev, fix));
    setPointCount(routeRef.current.length);
  }, []);

  async function start() {
    setMessage(null);
    setNeedSettings(false);
    let origin = DUNDEE;
    if (!simulate) {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setMessage('Location permission is needed to record your route. You can allow it in Settings, or use simulated GPS.');
        setNeedSettings(!perm.canAskAgain);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        origin = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch {
        setMessage('Could not get a GPS fix. Move outdoors or check that location is switched on.');
        return;
      }
    }

    const startedAt = Date.now();
    startRef.current = startedAt;
    routeRef.current = [];
    setDistance(0);
    setElapsed(0);
    setPointCount(0);
    setWeather(null);
    setPhotoUri(null);
    setPhase('tracking');
    addFix({ ...origin, timestamp: startedAt }, 5);

    fetchWeather(origin.latitude, origin.longitude).then(setWeather); // non-blocking; null on failure

    // elapsed is derived from the wall clock so it never drifts if a tick is delayed
    timerRef.current = setInterval(() => setElapsed((Date.now() - startRef.current) / 1000), 1000);

    if (simulate) {
      let step = 0;
      simRef.current = setInterval(() => {
        step += 1;
        addFix(simulatedFix(step, DUNDEE, startRef.current + 0), 5);
      }, 1000);
    } else {
      try {
        watchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 2000 },
          (loc) =>
            addFix(
              { latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: loc.timestamp },
              loc.coords.accuracy,
            ),
        );
      } catch {
        stopSources();
        setPhase('idle');
        setMessage('Lost access to GPS. Please try again.');
      }
    }
  }

  function stop() {
    stopSources();
    finalElapsed.current = Math.round((Date.now() - startRef.current) / 1000);
    setElapsed(finalElapsed.current);
    setTitle(defaultTitle(startRef.current));
    setNotes('');
    setErrors({});
    setPhase('saving');
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access in Settings to attach a photo.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.5 });
      if (!res.canceled && res.assets[0]) setPhotoUri(res.assets[0].uri);
    } catch {
      Alert.alert('Camera unavailable', 'Could not open the camera on this device.');
    }
  }

  function reset() {
    routeRef.current = [];
    setPhase('idle');
    setPhotoUri(null);
    setDistance(0);
    setElapsed(0);
    setPointCount(0);
    setWeather(null);
  }

  async function save() {
    const e = { title: validateTitle(title), notes: validateNotes(notes) };
    setErrors(e);
    if (e.title || e.notes || !user) return;
    setSaving(true);
    try {
      const stored = photoUri ? persistPhoto(photoUri) : null;
      const db = await getDb();
      await repo.addWalk(db, user.id, {
        title: title.trim(),
        notes: notes.trim(),
        startedAt: startRef.current,
        durationS: finalElapsed.current,
        distanceM: distance,
        route: routeRef.current,
        photoUri: stored,
        weather,
      });
      reset();
      nav.navigate('Walks');
    } catch {
      Alert.alert('Could not save', 'Something went wrong saving this walk. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    Alert.alert('Discard this walk?', 'The recorded route will be lost.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { removePhoto(null); reset(); } },
    ]);
  }

  const pace = formatPace(distance, elapsed);

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        {phase !== 'saving' && (
          <Card>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Stat label="Distance" value={formatDistance(distance)} />
              <Stat label="Time" value={formatDuration(elapsed)} spoken={spokenDuration(elapsed)} />
              <Stat label="Pace /km" value={pace} spoken={pace === '–' ? 'not available yet' : `${pace} minutes per kilometre`} />
            </View>
            {phase === 'tracking' && (
              <Text style={{ color: t.muted, marginTop: spacing.sm }} accessibilityLabel={`${pointCount} GPS points recorded`}>
                {pointCount} GPS points · {simulate ? 'simulated GPS' : 'live GPS'}
              </Text>
            )}
          </Card>
        )}

        {phase === 'tracking' && weather && (
          <Card>
            <Text style={{ color: t.text, fontSize: 17 }} accessibilityLabel={`Weather: ${weather.description}, ${weather.temperatureC} degrees Celsius, wind ${weather.windKmh} kilometres per hour`}>
              {weather.description} · {weather.temperatureC}°C · wind {weather.windKmh} km/h
            </Text>
          </Card>
        )}

        {phase === 'idle' && (
          <>
            <Button label="Start walk" onPress={start} hint="Starts tracking your location" style={{ minHeight: 64 }} />
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>Simulated GPS (demo)</Text>
                  <Text style={{ color: t.muted, fontSize: 14 }}>Walks a short loop around Dundee. Handy on an emulator or indoors.</Text>
                </View>
                <Switch value={simulate} onValueChange={setSimulate} accessibilityLabel="Simulated GPS for demo" trackColor={{ true: t.primary, false: t.border }} />
              </View>
            </Card>
          </>
        )}

        {message && (
          <Card style={{ borderColor: t.errorText }}>
            <Text accessibilityRole="alert" style={{ color: t.errorText, fontSize: 15 }}>{message}</Text>
            {needSettings && <Button label="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} style={{ marginTop: spacing.sm }} />}
          </Card>
        )}

        {phase === 'tracking' && <Button label="Stop walk" variant="danger" onPress={stop} style={{ minHeight: 64 }} />}

        {phase === 'saving' && (
          <>
            <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800', color: t.text }}>
              Save your walk
            </Text>
            <Text style={{ color: t.muted, fontSize: 16 }}>
              {formatDistance(distance)} in {spokenDuration(finalElapsed.current)}
            </Text>
            <TextField label="Title" value={title} onChangeText={setTitle} error={errors.title} maxLength={80} />
            <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} error={errors.notes} multiline maxLength={1000} />
            {photoUri && (
              <Image source={{ uri: photoUri }} accessibilityLabel="Photo attached to this walk" style={{ height: 180, borderRadius: 12 }} resizeMode="cover" />
            )}
            <Button label={photoUri ? 'Retake photo' : 'Add photo'} variant="secondary" onPress={takePhoto} hint="Opens the camera" />
            <Button label="Save walk" onPress={save} loading={saving} />
            <Button label="Discard" variant="secondary" onPress={discard} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
