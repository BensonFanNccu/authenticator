import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Section({ title, children, footer }: { title?: string; children: React.ReactNode; footer?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text> : null}
      <View style={[styles.sectionBody, { backgroundColor: theme.card }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: theme.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

export function Field({ label, last, style, ...inputProps }: TextInputProps & { label: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }, style]}
        {...inputProps}
      />
    </View>
  );
}

export function ReadOnlyRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.input, { color: theme.textSecondary }]}>{value}</Text>
    </View>
  );
}

type SegmentedProps<T extends string | number> = {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  last?: boolean;
};

export function Segmented<T extends string | number>({ label, options, value, onChange, last }: SegmentedProps<T>) {
  const theme = useTheme();
  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={[styles.segments, { backgroundColor: theme.track }]} accessibilityRole="radiogroup">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.segment, selected && { backgroundColor: theme.card }]}>
              <Text style={[styles.segmentText, { color: selected ? theme.text : theme.textSecondary }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    marginLeft: Spacing.three,
  },
  sectionBody: {
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    marginHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  label: {
    fontSize: 16,
    width: 72,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    marginVertical: 8,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
