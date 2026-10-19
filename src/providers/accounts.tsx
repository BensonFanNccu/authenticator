import * as SplashScreen from 'expo-splash-screen';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { isSameAccount, normalizeAccountInput, type Account, type AccountInput } from '@/lib/account';
import { deleteAccount, loadAccounts, saveAccounts } from '@/lib/vault';

type Status = 'loading' | 'ready' | 'error';
type AddResult = { added: number; skipped: number };
type Mutation<T> = (all: Account[]) => Promise<{ next: Account[]; result: T }>;

type AccountsContextValue = {
  accounts: Account[];
  status: Status;
  /** Adds new accounts, skipping ones already present. */
  addAccounts: (inputs: AccountInput[]) => Promise<AddResult>;
  updateAccount: (id: string, patch: Partial<AccountInput>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
};

const AccountsContext = createContext<AccountsContextValue | null>(null);

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const current = useRef<Account[]>([]);
  const loadFailed = useRef(false);
  // Every write waits for the initial load and for the write before it, so rapid edits
  // (e.g. tapping an HOTP refresh twice) never work from stale state.
  const queue = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    queue.current = loadAccounts()
      .then((loaded) => {
        current.current = loaded;
        setAccounts(loaded);
        setStatus('ready');
      })
      .catch((error) => {
        console.error('Failed to load accounts', error);
        loadFailed.current = true;
        setStatus('error');
      })
      .finally(() => SplashScreen.hideAsync());
  }, []);

  function mutate<T>(task: Mutation<T>): Promise<T> {
    const run = (queue.current ?? Promise.resolve()).then(async () => {
      // Writing after a failed load would overwrite the stored index with an empty list.
      if (loadFailed.current) throw new Error('無法讀取帳號資料，暫停寫入以免覆蓋');
      const { next, result } = await task(current.current);
      current.current = next;
      setAccounts(next);
      return result;
    });
    queue.current = run.catch(() => {});
    return run;
  }

  const addAccounts = (inputs: AccountInput[]) =>
    mutate(async (all) => {
      const fresh: Account[] = [];
      for (const raw of inputs) {
        const input = normalizeAccountInput(raw);
        if ([...all, ...fresh].some((a) => isSameAccount(a, input))) continue;
        fresh.push({ ...input, id: newId(), createdAt: Date.now() });
      }
      const next = [...all, ...fresh];
      if (fresh.length > 0) await saveAccounts(next, fresh);
      return { next, result: { added: fresh.length, skipped: inputs.length - fresh.length } };
    });

  const updateAccount = (id: string, patch: Partial<AccountInput>) =>
    mutate(async (all) => {
      const existing = all.find((a) => a.id === id);
      if (!existing) return { next: all, result: undefined };
      const updated = { ...existing, ...patch };
      const next = all.map((a) => (a.id === id ? updated : a));
      await saveAccounts(next, [updated]);
      return { next, result: undefined };
    });

  const removeAccount = (id: string) =>
    mutate(async (all) => {
      const next = all.filter((a) => a.id !== id);
      await deleteAccount(next, id);
      return { next, result: undefined };
    });

  return (
    <AccountsContext value={{ accounts, status, addAccounts, updateAccount, removeAccount }}>
      {children}
    </AccountsContext>
  );
}

export function useAccounts(): AccountsContextValue {
  const value = use(AccountsContext);
  if (!value) throw new Error('useAccounts must be used inside <AccountsProvider>');
  return value;
}
