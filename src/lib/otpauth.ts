// Parsers for what an authenticator QR code can contain:
//   otpauth://totp/Issuer:name?secret=...   (Key URI format, one account)
//   otpauth-migration://offline?data=...    (Google Authenticator "Transfer accounts" export)
import { DEFAULT_INPUT, validateAccountInput, type AccountInput, type Algorithm } from './account';
import { base32Encode, normalizeBase32 } from './base32';

export class OtpParseError extends Error {}

const UNNAMED = '未命名帳號';

function decode(component: string): string {
  try {
    return decodeURIComponent(component);
  } catch {
    return component;
  }
}

function parseQuery(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const value = eq === -1 ? '' : pair.slice(eq + 1);
    params.set(decode(key).toLowerCase(), decode(value.replace(/\+/g, ' ')));
  }
  return params;
}

function parseAlgorithm(value: string | undefined): Algorithm {
  if (!value) return 'SHA1';
  const algo = value.toUpperCase().replace(/[-_]/g, '');
  if (algo === 'SHA1' || algo === 'SHA256' || algo === 'SHA512') return algo;
  throw new OtpParseError(`不支援的演算法：${value}`);
}

function parseIntParam(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new OtpParseError(`${label}格式錯誤：${value}`);
  return Number(value);
}

export function parseOtpauthUri(uri: string): AccountInput {
  const match = /^otpauth:\/\/([^/?#]+)\/([^?#]*)(?:\?([^#]*))?/i.exec(uri.trim());
  if (!match) throw new OtpParseError('不是有效的 otpauth 連結');

  const type = match[1].toLowerCase();
  if (type !== 'totp' && type !== 'hotp') throw new OtpParseError(`不支援的類型：${match[1]}`);

  const label = decode(match[2]);
  const params = parseQuery(match[3] ?? '');

  const colon = label.indexOf(':');
  const labelIssuer = colon === -1 ? '' : label.slice(0, colon).trim();
  const name = (colon === -1 ? label : label.slice(colon + 1)).trim();

  const secret = params.get('secret');
  if (!secret) throw new OtpParseError('QR Code 中沒有金鑰 (secret)');

  const issuer = (params.get('issuer') ?? labelIssuer).trim();
  const input: AccountInput = {
    type,
    issuer,
    name: issuer || name ? name : UNNAMED,
    secret: normalizeBase32(secret),
    algorithm: parseAlgorithm(params.get('algorithm')),
    digits: parseIntParam(params.get('digits'), 6, '位數'),
    period: parseIntParam(params.get('period'), 30, '週期'),
    counter: parseIntParam(params.get('counter'), 0, '計數器'),
  };

  const error = validateAccountInput(input);
  if (error) throw new OtpParseError(error);
  return input;
}

// --- Google Authenticator export (protobuf) ---------------------------------
//
// message MigrationPayload {
//   message OtpParameters {
//     bytes secret = 1; string name = 2; string issuer = 3;
//     Algorithm algorithm = 4;   // 1 SHA1, 2 SHA256, 3 SHA512, 4 MD5
//     DigitCount digits = 5;     // 1 six, 2 eight
//     OtpType type = 6;          // 1 HOTP, 2 TOTP
//     int64 counter = 7;
//   }
//   repeated OtpParameters otp_parameters = 1;
//   ...version / batch fields, ignored
// }

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input: string): Uint8Array {
  const clean = input.replace(/[\s=]/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const value = BASE64.indexOf(ch);
    if (value === -1) throw new OtpParseError('匯出資料損毀 (base64)');
    buffer = ((buffer << 6) | value) & 0xffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

function utf8Decode(bytes: Uint8Array): string {
  let escaped = '';
  for (const b of bytes) escaped += `%${b.toString(16).padStart(2, '0')}`;
  try {
    return decodeURIComponent(escaped);
  } catch {
    throw new OtpParseError('匯出資料損毀 (文字編碼)');
  }
}

class ProtoReader {
  private pos = 0;
  private readonly buf: Uint8Array;

  constructor(buf: Uint8Array) {
    this.buf = buf;
  }

  get done() {
    return this.pos >= this.buf.length;
  }

  varint(): number {
    let result = 0;
    let multiplier = 1;
    for (let i = 0; i < 10; i++) {
      if (this.pos >= this.buf.length) break;
      const byte = this.buf[this.pos++];
      result += (byte & 0x7f) * multiplier;
      if ((byte & 0x80) === 0) return result;
      multiplier *= 128;
    }
    throw new OtpParseError('匯出資料損毀 (varint)');
  }

  bytes(): Uint8Array {
    const length = this.varint();
    if (this.pos + length > this.buf.length) throw new OtpParseError('匯出資料損毀 (長度)');
    const out = this.buf.subarray(this.pos, this.pos + length);
    this.pos += length;
    return out;
  }

  skip(wireType: number) {
    if (wireType === 0) this.varint();
    else if (wireType === 1) this.pos += 8;
    else if (wireType === 2) this.bytes();
    else if (wireType === 5) this.pos += 4;
    else throw new OtpParseError('匯出資料損毀 (wire type)');
  }
}

function parseOtpParameters(buf: Uint8Array): AccountInput {
  const reader = new ProtoReader(buf);
  let secret: Uint8Array = new Uint8Array();
  let name = '';
  let issuer = '';
  let algorithm = 1;
  let digits = 1;
  let type = 2;
  let counter = 0;

  while (!reader.done) {
    const tag = reader.varint();
    const field = Math.floor(tag / 8);
    const wireType = tag % 8;
    if (field === 1 && wireType === 2) secret = reader.bytes();
    else if (field === 2 && wireType === 2) name = utf8Decode(reader.bytes());
    else if (field === 3 && wireType === 2) issuer = utf8Decode(reader.bytes());
    else if (field === 4 && wireType === 0) algorithm = reader.varint();
    else if (field === 5 && wireType === 0) digits = reader.varint();
    else if (field === 6 && wireType === 0) type = reader.varint();
    else if (field === 7 && wireType === 0) counter = reader.varint();
    else reader.skip(wireType);
  }

  // Google stores the name as "Issuer:account" when an issuer is set.
  if (issuer && name.startsWith(`${issuer}:`)) name = name.slice(issuer.length + 1);

  const algorithms: Record<number, Algorithm> = { 0: 'SHA1', 1: 'SHA1', 2: 'SHA256', 3: 'SHA512' };
  if (!(algorithm in algorithms)) throw new OtpParseError('匯出資料含有不支援的演算法 (MD5)');

  issuer = issuer.trim();
  name = name.trim();
  return {
    ...DEFAULT_INPUT,
    type: type === 1 ? 'hotp' : 'totp',
    issuer,
    name: issuer || name ? name : UNNAMED,
    secret: base32Encode(secret),
    algorithm: algorithms[algorithm],
    digits: digits === 2 ? 8 : 6,
    counter,
  };
}

export function parseMigrationUri(uri: string): AccountInput[] {
  const match = /^otpauth-migration:\/\/[^?]*\?(.*)$/i.exec(uri.trim());
  if (!match) throw new OtpParseError('不是有效的 Google Authenticator 匯出連結');
  const data = parseQuery(match[1]).get('data');
  if (!data) throw new OtpParseError('匯出連結中沒有資料');

  const reader = new ProtoReader(base64Decode(data));
  const accounts: AccountInput[] = [];
  while (!reader.done) {
    const tag = reader.varint();
    if (tag === ((1 << 3) | 2)) accounts.push(parseOtpParameters(reader.bytes()));
    else reader.skip(tag % 8);
  }

  for (const account of accounts) {
    const error = validateAccountInput(account);
    if (error) throw new OtpParseError(`${account.issuer || account.name}：${error}`);
  }
  if (accounts.length === 0) throw new OtpParseError('匯出資料中沒有任何帳號');
  return accounts;
}

/** Turns the text of any supported QR code into one or more accounts. */
export function parseScannedCode(data: string): AccountInput[] {
  const text = data.trim();
  if (/^otpauth:\/\//i.test(text)) return [parseOtpauthUri(text)];
  if (/^otpauth-migration:\/\//i.test(text)) return parseMigrationUri(text);
  throw new OtpParseError('這不是驗證器用的 QR Code');
}
