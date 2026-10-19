import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AccountAvatar } from '@/components/account-avatar';
import { Button } from '@/components/button';
import { Field, ReadOnlyRow, Section } from '@/components/form';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Account } from '@/lib/account';
import { confirmDestructive } from '@/lib/confirm';
import { useAccounts } from '@/providers/accounts';
import { useToast } from '@/providers/toast';

export default function EditScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts } = useAccounts();
  const found = accounts.find((a) => a.id === id);
  // After a delete the account disappears while the screen is still animating away;
  // keep showing what was last on screen instead of flashing the "missing" state.
  const [lastSeen, setLastSeen] = useState(found);
  if (found && found !== lastSeen) setLastSeen(found);
  const account = found ?? lastSeen;

  if (!account) {
    return (
      <View style={styles.missing}>
        <Text style={{ color: theme.textSecondary }}>找不到這個帳號</Text>
      </View>
    );
  }
  // Keyed so the form state resets if the route is reused for another account.
  return <EditForm key={account.id} account={account} />;
}

function EditForm({ account }: { account: Account }) {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { updateAccount, removeAccount } = useAccounts();
  const [issuer, setIssuer] = useState(account.issuer);
  const [name, setName] = useState(account.name);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const title = account.issuer || account.name;

  const save = async () => {
    if (!issuer.trim() && !name.trim()) {
      setError('請輸入服務名稱或帳號名稱');
      return;
    }
    setSaving(true);
    try {
      await updateAccount(account.id, { issuer: issuer.trim(), name: name.trim() });
      toast('已儲存');
      router.back();
    } catch (e) {
      setError(`儲存失敗：${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = await confirmDestructive(
      `刪除「${title}」？`,
      '刪除後這支手機就無法再產生它的驗證碼。請先到該服務停用兩步驟驗證或改用其他驗證方式，否則可能會無法登入。',
      '刪除',
    );
    if (!confirmed) return;
    try {
      await removeAccount(account.id);
      toast(`已刪除 ${title}`);
      router.back();
    } catch (e) {
      setError(`刪除失敗：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AccountAvatar label={issuer || name || title} size={64} />
      </View>

      <Section>
        <Field label="服務" value={issuer} onChangeText={setIssuer} placeholder="服務名稱" autoCorrect={false} />
        <Field
          label="帳號"
          value={name}
          onChangeText={setName}
          placeholder="帳號名稱"
          autoCapitalize="none"
          autoCorrect={false}
          last
        />
      </Section>

      <Section title="驗證設定">
        <ReadOnlyRow label="類型" value={account.type === 'totp' ? '依時間 (TOTP)' : '依計數器 (HOTP)'} />
        <ReadOnlyRow label="演算法" value={account.algorithm.replace('SHA', 'SHA-')} />
        <ReadOnlyRow label="位數" value={String(account.digits)} />
        {account.type === 'totp' ? (
          <ReadOnlyRow label="週期" value={`${account.period} 秒`} last />
        ) : (
          <ReadOnlyRow label="計數器" value={String(account.counter)} last />
        )}
      </Section>

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button title="儲存" onPress={save} loading={saving} />
        <Button title="刪除帳號" onPress={remove} variant="danger" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
  },
});
