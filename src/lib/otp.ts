// HOTP (RFC 4226) and TOTP (RFC 6238) code generation.
import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';

export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

const HASHES = { SHA1: sha1, SHA256: sha256, SHA512: sha512 };

export function hotp(key: Uint8Array, counter: number, algorithm: Algorithm = 'SHA1', digits = 6): string {
  // 8-byte big-endian counter. Division instead of bit shifts keeps values above 2^32 intact.
  const message = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    message[i] = c % 256;
    c = Math.floor(c / 256);
  }

  const mac = hmac(HASHES[algorithm], key, message);
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];

  return (binary % 10 ** digits).toString().padStart(digits, '0');
}

export function totp(key: Uint8Array, timeMs: number, period = 30, algorithm: Algorithm = 'SHA1', digits = 6): string {
  return hotp(key, Math.floor(timeMs / 1000 / period), algorithm, digits);
}

/** Whole seconds until the current TOTP code rolls over (1..period). */
export function secondsRemaining(timeMs: number, period = 30): number {
  return period - (Math.floor(timeMs / 1000) % period);
}
