// expo-secure-store has no web implementation. The web build exists only for previewing the UI
// during development, so it falls back to plain localStorage, which is NOT encrypted.
// Don't keep real 2FA secrets in the web version.
export const secureStorage = {
  getItem: async (key: string) => localStorage.getItem(key),
  setItem: async (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: async (key: string) => localStorage.removeItem(key),
};
