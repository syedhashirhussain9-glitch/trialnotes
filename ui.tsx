import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MIN_TOUCH, spacing, useTheme } from '../theme';

/** Centres content with a max width so layouts stay readable on tablets and landscape. */
export function Screen({
  children,
  style,
  edges = ['top', 'left', 'right'],
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={[{ flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' }, style]}>{children}</View>
    </SafeAreaView>
  );
}

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  hint,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.primary : variant === 'danger' ? t.danger : 'transparent';
  const fg = variant === 'primary' ? t.onPrimary : variant === 'danger' ? t.onDanger : t.primary;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? t.primary : bg, opacity: inactive ? 0.55 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  secure,
  ...props
}: TextInputProps & { label: string; error?: string | null; secure?: boolean }) {
  const t = useTheme();
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: t.surface, borderColor: error ? t.errorText : t.border }]}>
        <TextInput
          {...props}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          placeholderTextColor={t.muted}
          style={[styles.input, { color: t.text }, props.multiline && { minHeight: 96, textAlignVertical: 'top' }]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            style={styles.eye}
          >
            <Text style={{ color: t.primary, fontWeight: '600' }}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: t.errorText }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>{children}</View>;
}

export function Stat({ label, value, spoken }: { label: string; value: string; spoken?: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${spoken ?? value}`}>
      <Text style={[styles.statValue, { color: t.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: t.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 17, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '600', marginBottom: spacing.xs },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10 },
  input: { flex: 1, minHeight: MIN_TOUCH, fontSize: 17, paddingHorizontal: spacing.md },
  eye: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  error: { marginTop: spacing.xs, fontSize: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: spacing.md },
  stat: { minWidth: 96, flexGrow: 1, flexBasis: '30%', paddingVertical: spacing.sm },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 14 },
});
