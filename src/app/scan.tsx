import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import { useImportCode } from '@/hooks/use-import-code';
import { useTheme } from '@/hooks/use-theme';

const FRAME_SIZE = 250;

export default function ScanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const importCode = useImportCode();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  // The camera reports the same code many times per second; handle one at a time
  // and don't keep re-reporting a code that was already rejected.
  const handling = useRef(false);
  const rejected = useRef<string | null>(null);

  const onScanned = async ({ data: display, raw }: BarcodeScanningResult) => {
    // `raw` is the exact text in the code; Android's `data` is ML Kit's reformatted display value.
    const data = raw ?? display;
    if (handling.current || data === rejected.current) return;
    handling.current = true;
    const result = await importCode(data);
    if (result.ok) {
      router.dismissTo('/');
      return;
    }
    rejected.current = data;
    setError(result.error);
    handling.current = false;
  };

  if (!permission) return <View style={[styles.fill, { backgroundColor: theme.background }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission, { backgroundColor: theme.background }]}>
        <Icon name="noCamera" size={44} color={theme.textSecondary} />
        <Text style={[styles.permissionTitle, { color: theme.text }]}>需要相機權限</Text>
        <Text style={[styles.permissionText, { color: theme.textSecondary }]}>
          掃描 QR Code 需要使用相機。影像只在手機上即時辨識，不會儲存或上傳。
        </Text>
        <View style={styles.permissionButton}>
          {permission.canAskAgain ? (
            <Button title="允許使用相機" onPress={requestPermission} />
          ) : (
            <Button title="前往設定開啟" onPress={() => Linking.openSettings()} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.fill, styles.camera]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <View style={[styles.message, error ? styles.messageError : null]}>
          <Text style={styles.messageText}>{error ?? '將 QR Code 對準框內'}</Text>
        </View>
      </View>
    </View>
  );
}

const CORNER = 34;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  camera: {
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    pointerEvents: 'none',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FFFFFF',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 16 },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 16 },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 16,
  },
  message: {
    maxWidth: '86%',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  messageError: {
    backgroundColor: 'rgba(185, 28, 28, 0.9)',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  permissionText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  permissionButton: {
    marginTop: Spacing.four,
    width: '100%',
    maxWidth: 320,
  },
});
