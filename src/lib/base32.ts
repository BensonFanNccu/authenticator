// RFC 4648 Base32, the encoding used for TOTP/HOTP secrets.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Uppercases and strips the spaces, dashes and padding people paste in along with a secret. */
export function normalizeBase32(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
}

export function base32Decode(input: string): Uint8Array {
  const clean = normalizeBase32(input);
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = ALPHABET.indexOf(ch);
    if (value === -1) throw new Error(`Invalid base32 character "${ch}"`);
    buffer = ((buffer << 5) | value) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

export function base32Encode(bytes: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export function isValidBase32(input: string): boolean {
  const clean = normalizeBase32(input);
  return clean.length > 0 && /^[A-Z2-7]+$/.test(clean);
}
