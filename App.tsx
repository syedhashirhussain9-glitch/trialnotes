import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import Navigation from './navigation';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Navigation />
          <StatusBar style="auto" />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
