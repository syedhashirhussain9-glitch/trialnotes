import { normaliseUsername, validateNotes, validatePassword, validateTitle, validateUsername } from '../src/lib/validation';

describe('validateUsername', () => {
  it.each(['abc', 'Alice_99', 'a'.repeat(20)])('accepts %s', (u) => expect(validateUsername(u)).toBeNull());
  it.each(['', '  ', 'ab', 'a'.repeat(21), 'bad name', "x'; DROP TABLE users;--", 'ünï'])('rejects %j', (u) =>
    expect(validateUsername(u)).not.toBeNull());
});
describe('validatePassword', () => {
  it('accepts a valid password', () => expect(validatePassword('walkies42')).toBeNull());
  it('rejects short, no digit, no letter, too long', () => {
    expect(validatePassword('a1')).toMatch(/8/);
    expect(validatePassword('abcdefgh')).toMatch(/letter and one number/);
    expect(validatePassword('12345678')).toMatch(/letter and one number/);
    expect(validatePassword('a1'.repeat(70))).toMatch(/128/);
  });
  it('rejects passwords containing the username', () => expect(validatePassword('alice12345', 'Alice')).toMatch(/username/));
});
describe('title / notes / normalise', () => {
  it('validates title', () => {
    expect(validateTitle('Loop')).toBeNull();
    expect(validateTitle('   ')).not.toBeNull();
    expect(validateTitle('x'.repeat(81))).not.toBeNull();
  });
  it('validates notes', () => {
    expect(validateNotes('')).toBeNull();
    expect(validateNotes('x'.repeat(1001))).not.toBeNull();
  });
  it('normalises case and whitespace', () => expect(normaliseUsername('  AlIcE ')).toBe('alice'));
});
