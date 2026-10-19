import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AccountsProvider } from '@/providers/accounts';
import { ToastProvider } from '@/providers/toast';

// Kept up until the accounts have been read from secure storage.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <ToastProvider>
        <AccountsProvider>
          <Stack screenOptions={{ headerShadowVisible: false, headerBackTitle: '返回' }}>
            <Stack.Screen name="index" options={{ title: '驗證器' }} />
            <Stack.Screen name="add" options={{ title: '新增帳號' }} />
            <Stack.Screen name="scan" options={{ title: '掃描 QR Code' }} />
            <Stack.Screen name="manual" options={{ title: '手動輸入' }} />
            <Stack.Screen name="edit" options={{ title: '編輯帳號' }} />
          </Stack>
        </AccountsProvider>
      </ToastProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
