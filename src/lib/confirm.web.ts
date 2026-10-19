// react-native-web's Alert is a no-op, so the browser's own dialog stands in.
export function confirmDestructive(title: string, message: string, _confirmLabel: string): Promise<boolean> {
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
