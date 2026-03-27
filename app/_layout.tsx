import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)"       options={{ headerShown: false }} />
        <Stack.Screen name="modal"        options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="health-logs"  options={{ headerShown: false }} />
        <Stack.Screen name="journal"      options={{ headerShown: false }} />
        <Stack.Screen name="ai-insights"  options={{ headerShown: false }} />
        <Stack.Screen name="profile"      options={{ headerShown: false }} />
        <Stack.Screen name="add-data"     options={{ headerShown: false }} />
        <Stack.Screen name="body-scan"    options={{ headerShown: false }} />
        <Stack.Screen name="exercises"    options={{ headerShown: false }} />
        <Stack.Screen name="meals"        options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
