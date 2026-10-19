import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AccountAvatar } from '@/components/account-avatar';
import { Icon } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCode, generateCode, type Account } from '@/lib/account';
import { secondsRemaining } from '@/lib/otp';

type Props = {
  account: Account;
  now: number;
  onCopy: (code: string) => void;
  onEdit: () => void;
  onNextCode: () => void;
};

const WARN_SECONDS = 5;

export function AccountRow({ account, now, onCopy, onEdit, onNextCode }: Props) {
  const theme = useTheme();
  const isTotp = account.type === 'totp';
  const code = generateCode(account, now);
  const remaining = secondsRemaining(now, account.period);
  const expiring = isTotp && remaining <= WARN_SECONDS;
  const title = account.issuer || account.name;
  const subtitle = account.issuer ? account.name : '';

  return (
    <View style={[styles.card, { backgroundColor: theme.card }]}>
      <View style={styles.row}>
        <Pressable
          onPress={() => onCopy(code)}
          onLongPress={onEdit}
          accessibilityRole="button"
          accessibilityLabel={`${title}，驗證碼 ${code.split('').join(' ')}`}
          accessibilityHint="點一下複製，長按編輯"
          style={({ pressed }) => [styles.body, { opacity: pressed ? 0.6 : 1 }]}>
          <AccountAvatar label={title} />
          <View style={styles.middle}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            <Text style={[styles.code, { color: expiring ? theme.warning : theme.tint }]}>{formatCode(code)}</Text>
          </View>
          {isTotp && (
            <Text style={[styles.seconds, { color: expiring ? theme.warning : theme.textSecondary }]}>
              {remaining}
            </Text>
          )}
        </Pressable>
        {/* A sibling of the copy target rather than nested in it: nested buttons are invalid on web
            and get merged into one element by screen readers. */}
        {!isTotp && (
          <Pressable
            onPress={onNextCode}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`產生 ${title} 的下一組驗證碼`}
            style={({ pressed }) => [styles.refresh, { backgroundColor: theme.track, opacity: pressed ? 0.6 : 1 }]}>
            <Icon name="refresh" size={20} color={theme.tint} />
          </Pressable>
        )}
      </View>
      {isTotp && (
        <View style={[styles.track, { backgroundColor: theme.track }]}>
          {/* Each tick animates toward where the bar will be one second from now, so it drains smoothly. */}
          <Animated.View
            style={[
              styles.bar,
              {
                width: `${((remaining - 1) / account.period) * 100}%`,
                backgroundColor: expiring ? theme.warning : theme.tint,
                transitionProperty: 'width',
                transitionDuration: 1000,
                transitionTimingFunction: 'linear',
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: 14,
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  code: {
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 1.5,
    fontVariant: ['tabular-nums'],
    marginTop: Spacing.one,
  },
  seconds: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 24,
    textAlign: 'right',
  },
  refresh: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.three,
  },
  track: {
    height: 3,
  },
  bar: {
    height: 3,
  },
});
