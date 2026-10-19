// Each account is its own secure-storage entry, plus one entry listing the ids in display order.
// Splitting them keeps every value small (some iOS versions reject values over ~2 KB).
import type { Account } from './account';
import { secureStorage } from './secure-storage';

const INDEX_KEY = 'vault.index';
const accountKey = (id: string) => `vault.account.${id}`;

export async function loadAccounts(): Promise<Account[]> {
  const index = await secureStorage.getItem(INDEX_KEY);
  if (!index) return [];
  const ids: string[] = JSON.parse(index);
  const items = await Promise.all(ids.map((id) => secureStorage.getItem(accountKey(id))));
  return items.flatMap((item) => (item ? [JSON.parse(item) as Account] : []));
}

/** Writes accounts first and the index last, so the index never points at a missing entry. */
export async function saveAccounts(all: Account[], changed: Account[]): Promise<void> {
  for (const account of changed) {
    await secureStorage.setItem(accountKey(account.id), JSON.stringify(account));
  }
  await secureStorage.setItem(INDEX_KEY, JSON.stringify(all.map((a) => a.id)));
}

/** Drops the id from the index before deleting the entry, so a crash in between only leaves an orphan. */
export async function deleteAccount(all: Account[], id: string): Promise<void> {
  await secureStorage.setItem(INDEX_KEY, JSON.stringify(all.map((a) => a.id)));
  await secureStorage.removeItem(accountKey(id));
}
