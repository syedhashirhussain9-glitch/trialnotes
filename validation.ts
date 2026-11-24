export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (!u) return 'Enter a username.';
  if (!USERNAME_RE.test(u)) return 'Username must be 3–20 letters, numbers or underscores.';
  return null;
}

export function validatePassword(password: string, username = ''): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return 'Password must contain at least one letter and one number.';
  if (username && password.toLowerCase().includes(username.trim().toLowerCase()))
    return 'Password must not contain your username.';
  return null;
}

export function validateTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return 'Give your walk a title.';
  if (t.length > 80) return 'Title must be 80 characters or fewer.';
  return null;
}

export function validateNotes(notes: string): string | null {
  return notes.length > 1000 ? 'Notes must be 1000 characters or fewer.' : null;
}

/** Normalise usernames so "Alice" and "alice" are the same account. */
export function normaliseUsername(username: string): string {
  return username.trim().toLowerCase();
}
