import { LOCKOUT_SECONDS, MAX_FAILED_ATTEMPTS, constantTimeEqual, hashPassword, lockoutRemaining, verifyPassword } from '../src/lib/security';

const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('password hashing', () => {
  it('is deterministic for same password+salt, 64 hex chars', () => {
    const h = hashPassword('walkies42', salt, 1000);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPassword('walkies42', salt, 1000)).toBe(h);
  });
  it('differs by salt and by password', () => {
    expect(hashPassword('walkies42', salt, 1000)).not.toBe(hashPassword('walkies42', 'ffff' + salt, 1000));
    expect(hashPassword('walkies42', salt, 1000)).not.toBe(hashPassword('walkies43', salt, 1000));
  });
  it('never stores the plaintext', () => expect(hashPassword('walkies42', salt, 1000)).not.toContain('walkies42'));
  it('matches the RFC 6070-style known PBKDF2-HMAC-SHA256 vector', () => {
    // password="password", salt="salt", c=1, dkLen=32 (widely published test vector)
    expect(hashPassword('password', 'salt', 1)).toBe('120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
  });
  it('verifies correct and rejects wrong password', () => {
    const h = hashPassword('walkies42', salt, 1000);
    expect(verifyPassword('walkies42', salt, h, 1000)).toBe(true);
    expect(verifyPassword('Walkies42', salt, h, 1000)).toBe(false);
    expect(verifyPassword('', salt, h, 1000)).toBe(false);
  });
});
describe('constantTimeEqual', () => {
  it('works', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
  });
});
describe('lockout', () => {
  it('reports remaining seconds', () => {
    expect(lockoutRemaining(null)).toBe(0);
    expect(lockoutRemaining(1000, 5000)).toBe(0);
    expect(lockoutRemaining(11_000, 1000)).toBe(10);
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCKOUT_SECONDS).toBe(60);
  });
});
