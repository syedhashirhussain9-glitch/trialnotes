import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme';
import AuthScreen from '../screens/AuthScreen';
import WalksScreen from '../screens/WalksScreen';
import RecordScreen from '../screens/RecordScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WalkDetailScreen from '../screens/WalkDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Icon({ name, color, size }: { name: 'walks' | 'record' | 'profile'; color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {name === 'walks' && <Path d="M4 6h16M4 12h16M4 18h10" />}
      {name === 'record' && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Circle cx={12} cy={12} r={3.5} fill={color} />
        </>
      )}
      {name === 'profile' && (
        <>
          <Circle cx={12} cy={8} r={4} />
          <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </>
      )}
    </Svg>
  );
}

function Tabs() {
  const t = useTheme();
  const tab = (title: string, name: 'walks' | 'record' | 'profile') => ({
    title,
    tabBarAccessibilityLabel: `${title} tab`,
    tabBarIcon: ({ color, size }: { color: string; size: number }) => <Icon name={name} color={color} size={size} />,
  });
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: t.primary,
        tabBarInactiveTintColor: t.muted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        tabBarStyle: { minHeight: 60 },
      }}
    >
      <Tab.Screen name="Walks" component={WalksScreen} options={tab('My Walks', 'walks')} />
      <Tab.Screen name="Record" component={RecordScreen} options={tab('Record', 'record')} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={tab('Profile', 'profile')} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const t = useTheme();
  const { user, loading } = useAuth();
  const base = t.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: t.bg, card: t.surface, text: t.text, border: t.border, primary: t.primary },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={t.primary} accessibilityLabel="Loading TrailNotes" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="WalkDetail" component={WalkDetailScreen} options={{ title: 'Walk' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
