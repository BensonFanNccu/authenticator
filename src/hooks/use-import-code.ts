import * as Haptics from 'expo-haptics';

import { OtpParseError, parseScannedCode } from '@/lib/otpauth';
import { useAccounts } from '@/providers/accounts';
import { useToast } from '@/providers/toast';

export type ImportResult = { ok: true } | { ok: false; error: string };

/** Parses scanned QR text, saves the accounts in it and announces the result. */
export function useImportCode() {
  const { addAccounts } = useAccounts();
  const toast = useToast();

  return async (data: string): Promise<ImportResult> => {
    let inputs;
    try {
      inputs = parseScannedCode(data);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return { ok: false, error: error instanceof OtpParseError ? error.message : '無法解析這個 QR Code' };
    }

    try {
      const { added, skipped } = await addAccounts(inputs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (added === 0) toast(inputs.length === 1 ? '這個帳號已經存在' : '這些帳號都已經存在');
      else if (inputs.length === 1) toast(`已加入 ${inputs[0].issuer || inputs[0].name}`);
      else toast(`已匯入 ${added} 個帳號${skipped > 0 ? `，略過 ${skipped} 個重複` : ''}`);
      return { ok: true };
    } catch (error) {
      console.error('Failed to save accounts', error);
      return { ok: false, error: `儲存失敗：${error instanceof Error ? error.message : String(error)}` };
    }
  };
}
