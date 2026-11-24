import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Screen, Stat } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { getDb } from '../db/database';
import * as repo from '../db/repo';
import { formatDistance, formatDuration, spokenDuration } from '../lib/geo';
import { spacing, useTheme } from '../theme';

export default function ProfileScreen() {
  const t = useTheme();
  const { user, logout, deleteAccount } = useAuth();
  const [totals, setTotals] = useState<repo.Totals | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (!user) return;
        try {
          setTotals(await repo.getTotals(await getDb(), user.id));
        } catch {
          setTotals(null);
        }
      })();
    }, [user]),
  );

  async function exportData() {
    if (!user) return;
    try {
      const json = await repo.exportUserData(await getDb(), user.id);
      await Share.share({ title: 'TrailNotes export', message: json });
    } catch {
      Alert.alert('Export failed', 'Please try again.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account, all walks and photos from this device. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete everything', style: 'destructive', onPress: () => deleteAccount() },
      ],
    );
  }

  return (
    <Screen edges={['left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
        <Text accessibilityRole="header" style={{ color: t.text, fontSize: 26, fontWeight: '800' }}>
          {user?.displayName}
        </Text>

        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Stat label="Walks" value={String(totals?.walks ?? 0)} />
            <Stat label="Total distance" value={formatDistance(totals?.distanceM ?? 0)} />
            <Stat label="Total time" value={formatDuration(totals?.durationS ?? 0)} spoken={spokenDuration(totals?.durationS ?? 0)} />
            <Stat label="Longest walk" value={formatDistance(totals?.longestM ?? 0)} />
          </View>
        </Card>

        <Card>
          <Text accessibilityRole="header" style={{ color: t.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.xs }}>
            Privacy
          </Text>
          <Text style={{ color: t.text, fontSize: 15, lineHeight: 22 }}>
            Walks, routes and photos are stored only on this device. Location is read only while you record a walk. To
            show the weather, coordinates rounded to about 1 km are sent to Open-Meteo; nothing else leaves your phone.
          </Text>
          <Text style={{ color: t.muted, fontSize: 14, marginTop: spacing.sm }}>Weather data by Open-Meteo.com (CC BY 4.0).</Text>
        </Card>

        <Button label="Export my data" variant="secondary" onPress={exportData} hint="Shares all your walks as JSON" />
        <Button label="Sign out" variant="secondary" onPress={() => logout()} />
        <Button label="Delete account and data" variant="danger" onPress={confirmDelete} />
      </ScrollView>
    </Screen>
  );
}
