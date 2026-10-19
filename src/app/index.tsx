import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AccountRow } from '@/components/account-row';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatCode, type Account } from '@/lib/account';
import { useAccounts } from '@/providers/accounts';
import { useToast } from '@/providers/toast';

export default function AccountsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const now = useNow();
  const { accounts, status, updateAccount } = useAccounts();

  const copy = async (code: string) => {
    await Clipboard.setStringAsync(code, { android: { isSensitive: true } });
    Haptics.selectionAsync();
    toast(`已複製 ${formatCode(code)}`);
  };

  const nextCode = (account: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateAccount(account.id, { counter: account.counter + 1 }).catch(() => toast('更新失敗，請再試一次'));
  };

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            onPress={() => router.push('/add')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="新增帳號"
            style={styles.headerButton}>
            <Icon name="add" size={26} color={theme.tint} />
          </Pressable>
        ),
      }}
    />
  );

  if (status === 'loading') return header;

  if (status === 'error') {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={[styles.emptyTitle, { color: theme.text }]}>無法讀取帳號資料</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          安全儲存區讀取失敗。為了避免覆蓋既有資料，目前暫停新增與修改，請重新開啟 App。
        </Text>
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={styles.centered}>
        {header}
        <View style={[styles.emptyIcon, { backgroundColor: theme.card }]}>
          <Icon name="shield" size={44} color={theme.tint} />
        </View>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>還沒有任何帳號</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          在網站的「兩步驟驗證」設定中選擇驗證器 App，然後掃描它顯示的 QR Code。
        </Text>
        <View style={styles.emptyButton}>
          <Button title="新增帳號" onPress={() => router.push('/add')} />
        </View>
      </View>
    );
  }

  return (
    <>
      {header}
      <FlatList
        data={accounts}
        keyExtractor={(account) => account.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two + 2 }} />}
        renderItem={({ item }) => (
          <AccountRow
            account={item}
            now={now}
            onCopy={copy}
            onEdit={() => router.push({ pathname: '/edit', params: { id: item.id } })}
            onNextCode={() => nextCode(item)}
          />
        )}
        ListFooterComponent={
          <Text style={[styles.hint, { color: theme.textSecondary }]}>點一下複製驗證碼・長按編輯或刪除</Text>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    paddingHorizontal: Spacing.one,
  },
  list: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hint: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.four,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.two,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  emptyButton: {
    marginTop: Spacing.four,
    width: '100%',
    maxWidth: 320,
  },
});
