import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen, Card } from '../components/ui';
import { WalkCard } from '../components/WalkCard';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../db/database';
import * as repo from '../db/repo';
import { formatDistance } from '../lib/geo';
import { MIN_TOUCH, spacing, useTheme } from '../theme';

export default function WalksScreen() {
  const t = useTheme();
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [walks, setWalks] = useState<repo.WalkSummary[]>([]);
  const [week, setWeek] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // debounce typing so we query SQLite once the user pauses, not on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDb();
      const since = Date.now() - 7 * 24 * 3600 * 1000;
      const [list, w] = await Promise.all([repo.listWalks(db, user.id, debounced), repo.distanceSince(db, user.id, since)]);
      setWalks(list);
      setWeek(w);
      setError(null);
    } catch {
      setError('Could not load your walks.');
    } finally {
      setLoading(false);
    }
  }, [user, debounced]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = useCallback((id: number) => nav.navigate('WalkDetail', { walkId: id }), [nav]);

  return (
    <Screen edges={['left', 'right']}>
      <FlatList
        data={walks}
        keyExtractor={(w) => String(w.id)}
        renderItem={({ item }) => <WalkCard walk={item} onPress={open} />}
        contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={8}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Card style={{ marginBottom: spacing.md }}>
              <Text style={{ color: t.muted, fontSize: 14 }}>Last 7 days</Text>
              <Text accessibilityLabel={`You walked ${formatDistance(week)} in the last 7 days`} style={{ color: t.text, fontSize: 28, fontWeight: '800' }}>
                {formatDistance(week)}
              </Text>
            </Card>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search walks"
              placeholderTextColor={t.muted}
              accessibilityLabel="Search walks by title or notes"
              returnKeyType="search"
              clearButtonMode="while-editing"
              style={{
                minHeight: MIN_TOUCH,
                borderWidth: 1.5,
                borderColor: t.border,
                borderRadius: 10,
                paddingHorizontal: spacing.md,
                fontSize: 17,
                color: t.text,
                backgroundColor: t.surface,
              }}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator accessibilityLabel="Loading walks" color={t.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <Text accessibilityLiveRegion="polite" style={{ color: error ? t.errorText : t.muted, fontSize: 17, textAlign: 'center', marginTop: spacing.xl }}>
              {error ?? (debounced ? 'No walks match your search.' : 'No walks yet. Open the Record tab to start your first one.')}
            </Text>
          )
        }
      />
    </Screen>
  );
}
