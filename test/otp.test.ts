import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

import { formatCode, generateCode, DEFAULT_INPUT } from '../src/lib/account';
import { base32Decode, base32Encode, isValidBase32 } from '../src/lib/base32';
import { hotp, secondsRemaining, totp, type Algorithm } from '../src/lib/otp';

const ascii = (s: string) => new Uint8Array(Buffer.from(s, 'ascii'));

describe('base32 (RFC 4648 vectors)', () => {
  const vectors: [string, string][] = [
    ['', ''],
    ['f', 'MY'],
    ['fo', 'MZXQ'],
    ['foo', 'MZXW6'],
    ['foob', 'MZXW6YQ'],
    ['fooba', 'MZXW6YTB'],
    ['foobar', 'MZXW6YTBOI'],
  ];
  for (const [plain, encoded] of vectors) {
    it(`"${plain}" <-> "${encoded}"`, () => {
      assert.equal(base32Encode(ascii(plain)), encoded);
      assert.deepEqual(base32Decode(encoded), ascii(plain));
    });
  }

  it('accepts lowercase, spaces, dashes and padding', () => {
    assert.deepEqual(base32Decode('mzxw 6ytb-oi======'), ascii('foobar'));
    assert.ok(isValidBase32('jbsw y3dp ehpk 3pxp'));
  });

  it('rejects invalid characters', () => {
    assert.throws(() => base32Decode('ABC1'));
    assert.equal(isValidBase32('ABC1'), false);
    assert.equal(isValidBase32('   '), false);
  });

  it('round-trips random bytes', () => {
    for (let i = 0; i < 200; i++) {
      const bytes = new Uint8Array(randomBytes(i % 40));
      assert.deepEqual(base32Decode(base32Encode(bytes)), bytes);
    }
  });
});

describe('HOTP (RFC 4226 Appendix D)', () => {
  const key = ascii('12345678901234567890');
  const expected = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
  expected.forEach((code, counter) => {
    it(`counter ${counter} -> ${code}`, () => assert.equal(hotp(key, counter), code));
  });
});

describe('TOTP (RFC 6238 Appendix B)', () => {
  const keys: Record<Algorithm, Uint8Array> = {
    SHA1: ascii('12345678901234567890'),
    SHA256: ascii('12345678901234567890123456789012'),
    SHA512: ascii('1234567890123456789012345678901234567890123456789012345678901234'),
  };
  const vectors: [number, string, string, string][] = [
    [59, '94287082', '46119246', '90693936'],
    [1111111109, '07081804', '68084774', '25091201'],
    [1111111111, '14050471', '67062674', '99943326'],
    [1234567890, '89005924', '91819424', '93441116'],
    [2000000000, '69279037', '90698825', '38618901'],
    [20000000000, '65353130', '77737706', '47863826'],
  ];
  for (const [seconds, sha1, sha256, sha512] of vectors) {
    it(`t=${seconds}`, () => {
      assert.equal(totp(keys.SHA1, seconds * 1000, 30, 'SHA1', 8), sha1);
      assert.equal(totp(keys.SHA256, seconds * 1000, 30, 'SHA256', 8), sha256);
      assert.equal(totp(keys.SHA512, seconds * 1000, 30, 'SHA512', 8), sha512);
    });
  }
});

describe('HOTP vs node:crypto reference', () => {
  function reference(key: Uint8Array, counter: number, algorithm: Algorithm, digits: number) {
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(counter));
    const mac = createHmac(algorithm.toLowerCase(), key).update(msg).digest();
    const offset = mac[mac.length - 1] & 0x0f;
    const bin = mac.readUInt32BE(offset) & 0x7fffffff;
    return String(bin % 10 ** digits).padStart(digits, '0');
  }

  it('matches for random keys, counters above 2^32, all algorithms and digit counts', () => {
    const algorithms: Algorithm[] = ['SHA1', 'SHA256', 'SHA512'];
    for (let i = 0; i < 300; i++) {
      const key = new Uint8Array(randomBytes(10 + (i % 54)));
      const counter = Math.floor(Math.random() * 2 ** 50);
      const algorithm = algorithms[i % 3];
      const digits = 6 + (i % 3);
      assert.equal(hotp(key, counter, algorithm, digits), reference(key, counter, algorithm, digits));
    }
  });
});

describe('helpers', () => {
  it('secondsRemaining counts down within the period', () => {
    assert.equal(secondsRemaining(0, 30), 30);
    assert.equal(secondsRemaining(29_999, 30), 1);
    assert.equal(secondsRemaining(30_000, 30), 30);
    assert.equal(secondsRemaining(65_500, 60), 55);
  });

  it('formatCode splits codes in half', () => {
    assert.equal(formatCode('123456'), '123 456');
    assert.equal(formatCode('1234567'), '1234 567');
    assert.equal(formatCode('12345678'), '1234 5678');
  });

  it('generateCode uses the account type', () => {
    const secret = base32Encode(ascii('12345678901234567890'));
    assert.equal(generateCode({ ...DEFAULT_INPUT, secret, digits: 8 }, 59_000), '94287082');
    assert.equal(generateCode({ ...DEFAULT_INPUT, secret, type: 'hotp', counter: 1 }, 0), '287082');
  });
});
