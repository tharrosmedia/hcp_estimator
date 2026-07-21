// Encryption helpers for hcp_api_key at rest.
// Uses dynamic import('crypto') to avoid Edge runtime bundling issues.
const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

async function getCrypto() {
  return await import('crypto');
}

function getEncryptionKey(crypto: any): Buffer {
  let secret = process.env.HCP_KEY_ENCRYPTION_SECRET || 'dev-encryption-key-32bytes-long!!';
  if (secret.length < 32) {
    secret = secret.padEnd(32, '0');
  }
  return Buffer.from(secret.slice(0, 32));
}

export async function encryptApiKey(plain: string): Promise<string> {
  if (!plain) return plain;
  const crypto = await getCrypto();
  const key = getEncryptionKey(crypto);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plain, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `enc:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export async function decryptApiKey(data: string | null | undefined): Promise<string | null> {
  if (!data) return null;
  if (!data.startsWith('enc:')) {
    // legacy plain text (migrate by re-saving key)
    return data;
  }
  try {
    const crypto = await getCrypto();
    const parts = data.split(':');
    if (parts.length !== 4) return data;
    const [, ivHex, tagHex, encrypted] = parts;
    const key = getEncryptionKey(crypto);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.warn('Failed to decrypt hcp api key');
    return data;
  }
}
