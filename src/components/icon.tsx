import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

// SF Symbols on iOS, Material Symbols on Android and web.
const ICONS = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  scan: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  keyboard: { ios: 'keyboard', android: 'keyboard', web: 'keyboard' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  shield: { ios: 'lock.shield', android: 'shield_lock', web: 'shield_lock' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  noCamera: { ios: 'camera.fill', android: 'no_photography', web: 'no_photography' },
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, color }: { name: IconName; size?: number; color: ColorValue }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
