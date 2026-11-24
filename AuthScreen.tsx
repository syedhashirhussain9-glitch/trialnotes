import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Screen, Button, TextField } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { spacing, useTheme } from '../theme';

export default function AuthScreen() {
  const t = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  async function submit() {
    setError(null);
    if (isRegister && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    // yield a frame so the spinner paints before the (CPU-heavy) password hashing starts
    await new Promise((r) => setTimeout(r, 30));
    const err = isRegister ? await register(username, password) : await login(username, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={{ fontSize: 34, fontWeight: '800', color: t.primary }}>
            TrailNotes
          </Text>
          <Text style={{ fontSize: 17, color: t.muted, marginBottom: spacing.lg, marginTop: spacing.xs }}>
            Record your walks, route and weather. Your data stays on this device.
          </Text>

          <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: t.text, marginBottom: spacing.md }}>
            {isRegister ? 'Create account' : 'Sign in'}
          </Text>

          <TextField
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            autoComplete="username"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secure
            autoCapitalize="none"
            textContentType={isRegister ? 'newPassword' : 'password'}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
          />
          {isRegister && (
            <TextField label="Confirm password" value={confirm} onChangeText={setConfirm} secure autoCapitalize="none" />
          )}
          {isRegister && (
            <Text style={{ color: t.muted, marginBottom: spacing.md }}>
              Use 8+ characters with at least one letter and one number.
            </Text>
          )}
          {error && (
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={{ color: t.errorText, marginBottom: spacing.md, fontSize: 15 }}>
              {error}
            </Text>
          )}

          <Button label={isRegister ? 'Create account' : 'Sign in'} onPress={submit} loading={busy} />

          <View style={{ marginTop: spacing.md, alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMode(isRegister ? 'login' : 'register');
                setError(null);
              }}
              style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md }}
            >
              <Text style={{ color: t.primary, fontSize: 16, fontWeight: '600' }}>
                {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
