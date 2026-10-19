import * as SecureStore from 'expo-secure-store';

// iOS Keychain / Android Keystore. Values are encrypted by the OS and never leave the device.
export const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
