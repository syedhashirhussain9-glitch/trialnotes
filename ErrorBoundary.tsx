import React from 'react';
import { Text, View } from 'react-native';
import { Button } from './ui';

/** Last line of defence: a render crash shows a recoverable screen instead of closing the app. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '800' }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 16 }}>Your saved walks are safe. Tap below to try again.</Text>
        <Button label="Try again" onPress={() => this.setState({ failed: false })} />
      </View>
    );
  }
}
