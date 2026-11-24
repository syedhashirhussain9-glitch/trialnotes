import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Button, Card, Screen, Stat, TextField } from '../components/ui';
import { RouteView } from '../components/RouteView';
import { formatDate } from '../components/WalkCard';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../db/database';
import * as repo from '../db/repo';
import { formatDistance, formatDuration, formatPace, spokenDuration } from '../lib/geo';
import { removePhoto } from '../lib/photos';
import { validateNotes, validateTitle } from '../lib/validation';
import { spacing, useTheme } from '../theme';

export default function WalkDetailScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();
  const { params } = useRoute<RouteProp<{ WalkDetail: { walkId: number } }, 'WalkDetail'>>();
  const { user } = useAuth();
  const [walk, setWalk] = useState<repo.Walk | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ title?: string | null; notes?: string | null }>({});
  const [photoOk, setPhotoOk] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const w = await repo.getWalk(await getDb(), user.id, params.walkId);
        if (w) {
          setWalk(w);
          setTitle(w.title);
          setNotes(w.notes);
          setState('ready');
        } else setState('missing');
      } catch {
        setState('missing');
      }
    })();
  }, [user, params.walkId]);

  useEffect(() => {
    if (walk) nav.setOptions({ title: walk.title });
  }, [walk, nav]);

  const save = useCallback(async () => {
    if (!walk || !user) return;
    const e = { title: validateTitle(title), notes: validateNotes(notes) };
    setErrors(e);
    if (e.title || e.notes) return;
    try {
      await repo.updateWalk(await getDb(), user.id, walk.id, title.trim(), notes.trim());
      setWalk({ ...walk, title: title.trim(), notes: notes.trim() });
      setEditing(false);
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    }
  }, [walk, user, title, notes]);

  function confirmDelete() {
    if (!walk || !user) return;
    Alert.alert('Delete this walk?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const photo = await repo.deleteWalk(await getDb(), user.id, walk.id);
            removePhoto(photo);
            nav.goBack();
          } catch {
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  }

  if (state !== 'ready' || !walk) {
    return (
      <Screen edges={['left', 'right']}>
        <Text accessibilityLiveRegion="polite" style={{ color: t.muted, fontSize: 17, textAlign: 'center', marginTop: spacing.xl }}>
          {state === 'loading' ? 'Loading…' : 'This walk could not be found.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: t.muted, fontSize: 15 }}>{formatDate(walk.startedAt)}</Text>

        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Stat label="Distance" value={formatDistance(walk.distanceM)} />
            <Stat label="Time" value={formatDuration(walk.durationS)} spoken={spokenDuration(walk.durationS)} />
            <Stat label="Pace /km" value={formatPace(walk.distanceM, walk.durationS)} />
          </View>
        </Card>

        {walk.weather && (
          <Card>
            <Text
              style={{ color: t.text, fontSize: 17 }}
              accessibilityLabel={`Weather at start: ${walk.weather.description}, ${walk.weather.temperatureC} degrees Celsius, wind ${walk.weather.windKmh} kilometres per hour`}
            >
              {walk.weather.description} · {walk.weather.temperatureC}°C · wind {walk.weather.windKmh} km/h
            </Text>
          </Card>
        )}

        <RouteView route={walk.route} distanceM={walk.distanceM} />

        {walk.photoUri && photoOk && (
          <Image
            source={{ uri: walk.photoUri }}
            onError={() => setPhotoOk(false)}
            accessibilityLabel="Photo attached to this walk"
            style={{ height: 220, borderRadius: 14 }}
            resizeMode="cover"
          />
        )}

        {editing ? (
          <>
            <TextField label="Title" value={title} onChangeText={setTitle} error={errors.title} maxLength={80} />
            <TextField label="Notes" value={notes} onChangeText={setNotes} error={errors.notes} multiline maxLength={1000} />
            <Button label="Save changes" onPress={save} />
            <Button
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setEditing(false);
                setTitle(walk.title);
                setNotes(walk.notes);
                setErrors({});
              }}
            />
          </>
        ) : (
          <>
            <Card>
              <Text accessibilityRole="header" style={{ color: t.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.xs }}>
                Notes
              </Text>
              <Text style={{ color: walk.notes ? t.text : t.muted, fontSize: 16 }}>{walk.notes || 'No notes.'}</Text>
            </Card>
            <Button label="Edit title and notes" variant="secondary" onPress={() => setEditing(true)} />
            <Button label="Delete walk" variant="danger" onPress={confirmDelete} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
