import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { base32Encode } from '../src/lib/base32';
import { OtpParseError, parseMigrationUri, parseOtpauthUri, parseScannedCode } from '../src/lib/otpauth';

describe('parseOtpauthUri', () => {
  it('parses the Key URI format example', () => {
    const account = parseOtpauthUri('otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
    assert.deepEqual(account, {
      type: 'totp',
      issuer: 'Example',
      name: 'alice@google.com',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      counter: 0,
    });
  });

  it('decodes percent-encoding, encoded colons and the space after them', () => {
    const account = parseOtpauthUri(
      'otpauth://totp/ACME%20Co%3A%20john.doe@email.com?secret=HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ&algorithm=SHA256&digits=8&period=60',
    );
    assert.equal(account.issuer, 'ACME Co');
    assert.equal(account.name, 'john.doe@email.com');
    assert.equal(account.algorithm, 'SHA256');
    assert.equal(account.digits, 8);
    assert.equal(account.period, 60);
  });

  it('prefers the issuer parameter over the label prefix', () => {
    const account = parseOtpauthUri('otpauth://totp/Old:me?secret=JBSWY3DPEHPK3PXP&issuer=New+Name');
    assert.equal(account.issuer, 'New Name');
    assert.equal(account.name, 'me');
  });

  it('handles labels without an issuer', () => {
    const account = parseOtpauthUri('otpauth://totp/me@example.com?secret=JBSWY3DPEHPK3PXP');
    assert.equal(account.issuer, '');
    assert.equal(account.name, 'me@example.com');
  });

  it('names accounts that have neither issuer nor label', () => {
    assert.equal(parseOtpauthUri('otpauth://totp/?secret=JBSWY3DPEHPK3PXP').name, '未命名帳號');
  });

  it('normalizes lowercase and padded secrets, and case-insensitive scheme/params', () => {
    const account = parseOtpauthUri('OTPAUTH://TOTP/x?SECRET=jbswy3dpehpk3pxp%3D%3D&Algorithm=sha-512');
    assert.equal(account.secret, 'JBSWY3DPEHPK3PXP');
    assert.equal(account.algorithm, 'SHA512');
  });

  it('parses HOTP with counter', () => {
    const account = parseOtpauthUri('otpauth://hotp/Svc:me?secret=JBSWY3DPEHPK3PXP&counter=42');
    assert.equal(account.type, 'hotp');
    assert.equal(account.counter, 42);
  });

  it('rejects bad input with readable errors', () => {
    const bad = [
      'https://example.com',
      'otpauth://totp/x',
      'otpauth://totp/x?secret=NOT-BASE32-1',
      'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&algorithm=MD5',
      'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&digits=9',
      'otpauth://totp/x?secret=JBSWY3DPEHPK3PXP&period=abc',
      'otpauth://steam/x?secret=JBSWY3DPEHPK3PXP',
    ];
    for (const uri of bad) assert.throws(() => parseOtpauthUri(uri), OtpParseError, uri);
  });
});

// Minimal protobuf writer, enough to build Google Authenticator export payloads.
function varint(n: number): number[] {
  const out: number[] = [];
  while (n >= 0x80) {
    out.push((n % 128) | 0x80);
    n = Math.floor(n / 128);
  }
  out.push(n);
  return out;
}
const lenField = (field: number, bytes: number[] | Uint8Array) => [...varint((field << 3) | 2), ...varint(bytes.length), ...bytes];
const intField = (field: number, value: number) => [...varint(field << 3), ...varint(value)];
const str = (s: string) => [...Buffer.from(s, 'utf8')];

function migrationUri(params: number[][], extra: number[] = []) {
  const payload = [...params.flatMap((p) => lenField(1, p)), ...intField(2, 1), ...extra];
  return `otpauth-migration://offline?data=${encodeURIComponent(Buffer.from(payload).toString('base64'))}`;
}

describe('parseMigrationUri', () => {
  const secretA = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0xde, 0xad, 0xbe, 0xef]);
  const secretB = new Uint8Array(20).map((_, i) => i * 7);

  it('decodes multiple accounts with algorithm, digits, type and counter', () => {
    const uri = migrationUri([
      [...lenField(1, secretA), ...lenField(2, str('GitHub:octocat')), ...lenField(3, str('GitHub')), ...intField(4, 1), ...intField(5, 1), ...intField(6, 2)],
      [...lenField(1, secretB), ...lenField(2, str('王小明@例子.tw')), ...lenField(3, str('銀行')), ...intField(4, 3), ...intField(5, 2), ...intField(6, 1), ...intField(7, 2 ** 40)],
    ]);
    const accounts = parseMigrationUri(uri);
    assert.equal(accounts.length, 2);
    assert.deepEqual(accounts[0], {
      type: 'totp',
      issuer: 'GitHub',
      name: 'octocat',
      secret: base32Encode(secretA),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      counter: 0,
    });
    assert.equal(accounts[1].type, 'hotp');
    assert.equal(accounts[1].issuer, '銀行');
    assert.equal(accounts[1].name, '王小明@例子.tw');
    assert.equal(accounts[1].algorithm, 'SHA512');
    assert.equal(accounts[1].digits, 8);
    assert.equal(accounts[1].counter, 2 ** 40);
  });

  it('skips unknown fields', () => {
    const uri = migrationUri(
      [[...lenField(1, secretA), ...lenField(2, str('me')), ...lenField(99, str('future')), ...intField(100, 5)]],
      [...intField(3, 1), ...intField(4, 0), ...intField(5, 123456)],
    );
    assert.equal(parseMigrationUri(uri)[0].name, 'me');
  });

  it('rejects MD5, empty payloads and corrupt data', () => {
    assert.throws(() => parseMigrationUri(migrationUri([[...lenField(1, secretA), ...lenField(2, str('x')), ...intField(4, 4)]])), OtpParseError);
    assert.throws(() => parseMigrationUri(migrationUri([])), OtpParseError);
    assert.throws(() => parseMigrationUri('otpauth-migration://offline?data=%%%'), OtpParseError);
    assert.throws(() => parseMigrationUri('otpauth-migration://offline?data=CgU'), OtpParseError);
  });
});

describe('parseScannedCode', () => {
  it('dispatches by scheme', () => {
    assert.equal(parseScannedCode('  otpauth://totp/a?secret=JBSWY3DPEHPK3PXP \n').length, 1);
    assert.throws(() => parseScannedCode('https://example.com/login'), /不是驗證器/);
  });
});
