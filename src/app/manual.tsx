import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Button } from '@/components/button';
import { Field, Section, Segmented } from '@/components/form';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  ALGORITHMS,
  DEFAULT_INPUT,
  DIGIT_OPTIONS,
  validateAccountInput,
  type AccountInput,
  type Algorithm,
  type OtpType,
} from '@/lib/account';
import { useAccounts } from '@/providers/accounts';
import { useToast } from '@/providers/toast';

export default function ManualEntryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { addAccounts } = useAccounts();

  const [issuer, setIssuer] = useState('');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [type, setType] = useState<OtpType>('totp');
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA1');
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState('30');
  const [counter, setCounter] = useState('0');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const input: AccountInput = {
      ...DEFAULT_INPUT,
      type,
      issuer,
      name,
      secret,
      algorithm,
      digits,
      period: /^\d+$/.test(period) ? Number(period) : NaN,
      counter: /^\d+$/.test(counter) ? Number(counter) : NaN,
    };
    const problem = validateAccountInput(input);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      const { added } = await addAccounts([input]);
      if (added === 0) {
        setError('這個帳號已經存在');
        return;
      }
      toast(`已加入 ${issuer.trim() || name.trim()}`);
      router.dismissTo('/');
    } catch (e) {
      setError(`儲存失敗：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={styles.content}>
      <Section footer="金鑰通常在 QR Code 旁的「無法掃描？」或「手動輸入」連結中，由英文字母與數字 2–7 組成。">
        <Field label="服務" placeholder="例如 GitHub" value={issuer} onChangeText={setIssuer} autoCorrect={false} />
        <Field
          label="帳號"
          placeholder="例如 me@example.com"
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <Field
          label="金鑰"
          placeholder="JBSW Y3DP EHPK 3PXP"
          value={secret}
          onChangeText={setSecret}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          style={{ fontFamily: Fonts.mono, letterSpacing: 0.5 }}
          last
        />
      </Section>

      {showAdvanced ? (
        <Section title="進階設定" footer="除非網站特別說明，否則請保留預設值。">
          <Segmented
            label="類型"
            options={[
              { value: 'totp', label: '依時間' },
              { value: 'hotp', label: '依計數器' },
            ]}
            value={type}
            onChange={setType}
          />
          <Segmented
            label="演算法"
            options={ALGORITHMS.map((a) => ({ value: a, label: a.replace('SHA', 'SHA-') }))}
            value={algorithm}
            onChange={setAlgorithm}
          />
          <Segmented
            label="位數"
            options={DIGIT_OPTIONS.map((d) => ({ value: d, label: String(d) }))}
            value={digits}
            onChange={setDigits}
          />
          {type === 'totp' ? (
            <Field label="週期 (秒)" value={period} onChangeText={setPeriod} keyboardType="number-pad" last />
          ) : (
            <Field label="計數器" value={counter} onChangeText={setCounter} keyboardType="number-pad" last />
          )}
        </Section>
      ) : (
        <Pressable onPress={() => setShowAdvanced(true)} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.link, { color: theme.tint }]}>進階設定（演算法、位數、週期）</Text>
        </Pressable>
      )}

      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <Button title="加入" onPress={save} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  link: {
    fontSize: 15,
    marginHorizontal: Spacing.three,
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
    marginHorizontal: Spacing.three,
  },
});
