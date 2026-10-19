import { base32Decode, isValidBase32, normalizeBase32 } from './base32';
import { hotp, totp, type Algorithm } from './otp';

export type { Algorithm };
export type OtpType = 'totp' | 'hotp';

export type AccountInput = {
  type: OtpType;
  /** Service name, e.g. "GitHub". */
  issuer: string;
  /** Account name within the service, e.g. "me@example.com". */
  name: string;
  /** Base32, normalized (uppercase, no spaces or padding). */
  secret: string;
  algorithm: Algorithm;
  digits: number;
  /** TOTP step in seconds. */
  period: number;
  /** HOTP moving factor. */
  counter: number;
};

export type Account = AccountInput & {
  id: string;
  createdAt: number;
};

export const ALGORITHMS: Algorithm[] = ['SHA1', 'SHA256', 'SHA512'];
export const DIGIT_OPTIONS = [6, 7, 8];

export const DEFAULT_INPUT: AccountInput = {
  type: 'totp',
  issuer: '',
  name: '',
  secret: '',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  counter: 0,
};

/** Returns a user-facing error message, or null when the input is usable. */
export function validateAccountInput(input: AccountInput): string | null {
  if (!input.issuer.trim() && !input.name.trim()) return '請輸入服務名稱或帳號名稱';
  if (!isValidBase32(input.secret)) return '金鑰格式錯誤，應為 A–Z 與 2–7 組成的 Base32 字串';
  if (base32Decode(input.secret).length < 1) return '金鑰太短';
  if (!ALGORITHMS.includes(input.algorithm)) return `不支援的演算法：${input.algorithm}`;
  if (!DIGIT_OPTIONS.includes(input.digits)) return `不支援的位數：${input.digits}`;
  if (input.type === 'totp' && !(Number.isInteger(input.period) && input.period > 0 && input.period <= 600)) {
    return '週期必須是 1 到 600 秒之間的整數';
  }
  if (input.type === 'hotp' && !(Number.isSafeInteger(input.counter) && input.counter >= 0)) {
    return '計數器必須是 0 以上的整數';
  }
  return null;
}

export function normalizeAccountInput(input: AccountInput): AccountInput {
  return {
    ...input,
    issuer: input.issuer.trim(),
    name: input.name.trim(),
    secret: normalizeBase32(input.secret),
  };
}

/**
 * Secrets are random per enrollment, so a matching secret is the same credential even if the
 * user has since renamed it. Comparing names too would let a re-scan create a duplicate.
 */
export function isSameAccount(a: AccountInput, b: AccountInput): boolean {
  return a.secret === b.secret;
}

export function generateCode(account: AccountInput, nowMs: number): string {
  const key = base32Decode(account.secret);
  return account.type === 'hotp'
    ? hotp(key, account.counter, account.algorithm, account.digits)
    : totp(key, nowMs, account.period, account.algorithm, account.digits);
}

/** "123456" -> "123 456", "12345678" -> "1234 5678". */
export function formatCode(code: string): string {
  const mid = Math.ceil(code.length / 2);
  return `${code.slice(0, mid)} ${code.slice(mid)}`;
}
