import { CameraView, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Section } from '@/components/form';
import { Icon, type IconName } from '@/components/icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useImportCode } from '@/hooks/use-import-code';
import { useTheme } from '@/hooks/use-theme';

// On Android, prefer Google's code scanner: it's the Play services scanner many phones use for
// their own QR scanning and needs no camera permission. The in-app camera is the fallback.
// All ML Kit scanning depends on the expo-build-properties settings in app.json: R8 is off
// because its full mode (AGP 9) strips ML Kit internals, and the Play Store <queries> entry
// lets expo-camera detect Play services on Android 11+.
const useSystemScanner = Platform.OS === 'android' && CameraView.isModernBarcodeScannerAvailable;

/** "CODE: message", shown so a failure on a user's phone can be diagnosed from a screenshot. */
const describeError = (error: unknown) =>
  error instanceof Error
    ? [(error as { code?: string }).code, error.message].filter(Boolean).join(': ')
    : String(error);

const isCancellation = (error: unknown) => /cancel/i.test(describeError(error));

export default function AddScreen() {
  const theme = useTheme();
  const router = useRouter();
  const importCode = useImportCode();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    setError(null);
    if (!useSystemScanner) {
      router.push('/scan');
      return;
    }

    const subscription = CameraView.onModernBarcodeScanned(async ({ data, raw }) => {
      subscription.remove();
      const result = await importCode(raw ?? data);
      if (result.ok) router.dismissTo('/');
      else setError(result.error);
    });
    try {
      await CameraView.launchScanner({ barcodeTypes: ['qr'] });
    } catch (e) {
      subscription.remove();
      if (isCancellation(e)) return;
      // No Play services, or its scanner module isn't installed yet.
      setError(`系統掃描器無法使用，已改用 App 內建相機（${describeError(e)}）`);
      router.push('/scan');
    }
  };

  const pickImage = async () => {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (picked.canceled) return;

    setBusy(true);
    try {
      const codes = await scanFromURLAsync(picked.assets[0].uri, ['qr']);
      // `raw` is the exact text in the code; Android's `data` is ML Kit's reformatted display value.
      const texts = codes.map((c) => c.raw ?? c.data);
      const text = texts.find((t) => /^otpauth/i.test(t)) ?? texts[0];
      if (text === undefined) {
        setError('圖片中找不到 QR Code，請確認 QR Code 清楚且佔畫面大部分。');
        return;
      }
      const result = await importCode(text);
      if (result.ok) router.dismissTo('/');
      else setError(result.error);
    } catch (e) {
      console.error('Failed to scan image', e);
      setError(`無法讀取這張圖片（${describeError(e)}）`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Section footer="也可以掃描 Google Authenticator「匯出帳戶」產生的 QR Code，一次轉移多個帳號。">
        <Option
          icon="scan"
          title="掃描 QR Code"
          subtitle="用相機掃描網站顯示的 QR Code"
          onPress={scan}
        />
        <Option
          icon="photo"
          title="從相片匯入"
          subtitle="選擇含有 QR Code 的截圖或照片"
          onPress={pickImage}
          busy={busy}
        />
        <Option
          icon="keyboard"
          title="手動輸入金鑰"
          subtitle="輸入網站提供的設定金鑰"
          onPress={() => router.push('/manual')}
          last
        />
      </Section>
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
    </ScrollView>
  );
}

type OptionProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
  busy?: boolean;
  last?: boolean;
};

function Option({ icon, title, subtitle, onPress, busy, last }: OptionProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [styles.option, { backgroundColor: pressed ? theme.track : theme.card }]}>
      <View style={[styles.optionIcon, { backgroundColor: theme.tint }]}>
        <Icon name={icon} size={22} color={theme.onTint} />
      </View>
      <View
        style={[
          styles.optionText,
          !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
        ]}>
        <View style={styles.optionLabels}>
          <Text style={[styles.optionTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.optionSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
        {busy ? <ActivityIndicator /> : <Icon name="chevron" size={18} color={theme.textSecondary} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.three,
    gap: Spacing.three,
  },
  optionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingRight: Spacing.three,
    gap: Spacing.two,
  },
  optionLabels: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 13,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: Spacing.three,
  },
});
