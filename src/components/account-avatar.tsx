import { StyleSheet, Text, View } from 'react-native';

import { AvatarColors } from '@/constants/theme';

function colorFor(label: string) {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AvatarColors[Math.abs(hash) % AvatarColors.length];
}

export function AccountAvatar({ label, size = 44 }: { label: string; size?: number }) {
  const initial = Array.from(label.trim())[0]?.toUpperCase() ?? '?';
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(label.toLowerCase()) },
      ]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
