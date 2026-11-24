import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { WalkSummary } from '../db/repo';
import { formatDistance, formatDuration, spokenDuration } from '../lib/geo';
import { spacing, useTheme } from '../theme';

export const formatDate = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

function WalkCardBase({ walk, onPress }: { walk: WalkSummary; onPress: (id: number) => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => onPress(walk.id)}
      accessibilityRole="button"
      accessibilityLabel={`${walk.title}, ${formatDate(walk.startedAt)}, ${formatDistance(walk.distanceM)}, ${spokenDuration(walk.durationS)}`}
      accessibilityHint="Opens walk details"
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: spacing.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        opacity: pressed ? 0.85 : 1,
        minHeight: 72,
      })}
    >
      {walk.photoUri ? (
        <Image source={{ uri: walk.photoUri }} style={{ width: 64, height: 64, borderRadius: 10 }} accessibilityIgnoresInvertColors />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: '700', color: t.text }}>
          {walk.title}
        </Text>
        <Text style={{ color: t.muted, fontSize: 14, marginTop: 2 }}>{formatDate(walk.startedAt)}</Text>
        <Text style={{ color: t.text, fontSize: 15, marginTop: 4 }}>
          {formatDistance(walk.distanceM)} · {formatDuration(walk.durationS)}
        </Text>
      </View>
    </Pressable>
  );
}

/** memo: rows only re-render when their own walk changes, keeping long lists smooth. */
export const WalkCard = React.memo(WalkCardBase);
