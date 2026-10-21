import crypto from 'node:crypto';

/**
 * Hash a plain password using PBKDF2 with SHA-512 and salt
 */
export function hashPassword(plainPassword) {
  if (!plainPassword) return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(plainPassword, salt, 1000, 64, 'sha512').toString('hex');
  return `pbkdf2$${salt}$${hash}`;
}

/**
 * Verify password against stored hash or fallback plain password
 */
export function verifyPassword(plainPassword, storedPassword) {
  if (!storedPassword || !plainPassword) return false;

  // Stored with PBKDF2 format
  if (storedPassword.startsWith('pbkdf2$')) {
    const parts = storedPassword.split('$');
    if (parts.length === 3) {
      const [, salt, originalHash] = parts;
      const hash = crypto.pbkdf2Sync(plainPassword, salt, 1000, 64, 'sha512').toString('hex');
      try {
        return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
      } catch {
        return false;
      }
    }
  }

  // Fallback for plain text stored passwords
  return storedPassword === plainPassword;
}
