/**
 * Device-managed local crypto key
 *
 * Replaces the old user-chosen "encryption password" flow: API keys are
 * still encrypted at rest (AES via services/encryptionWebCrypto), but the
 * key is a random secret generated once per browser profile and stored in
 * localStorage. Zero user interaction — no setup, no expiry prompts —
 * while keys never sit on disk in plaintext.
 *
 * Threat model note: this protects against casual inspection of stored
 * data and keeps the documented "本地加密存储" guarantee; it is not meant
 * to defend against a fully compromised device.
 */

const DEVICE_KEY_STORAGE = 'lifeos-device-crypto-key-v1';

let cachedKey: string | null = null;

function randomKeyBase64url(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Non-TSSR fallback (older jsdom): derive from Math.random
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Get (or lazily create) this device's stable local crypto key.
 */
export function getDeviceKey(): string {
  if (cachedKey) {
    // Self-heal: if storage lost the key (e.g. cleared site data), write
    // the in-memory copy back so it stays stable across sessions.
    try {
      if (localStorage.getItem(DEVICE_KEY_STORAGE) !== cachedKey) {
        localStorage.setItem(DEVICE_KEY_STORAGE, cachedKey);
      }
    } catch {
      // ignore storage failures
    }
    return cachedKey;
  }
  try {
    const existing = localStorage.getItem(DEVICE_KEY_STORAGE);
    if (existing && existing.length >= 16) {
      cachedKey = existing;
      return cachedKey;
    }
    const created = randomKeyBase64url();
    localStorage.setItem(DEVICE_KEY_STORAGE, created);
    cachedKey = created;
    return cachedKey;
  } catch {
    // localStorage unavailable (private mode?): fall back to ephemeral key.
    // Keys saved this session stay usable until reload.
    cachedKey = cachedKey ?? randomKeyBase64url();
    return cachedKey;
  }
}

/** Test-only: forget the in-memory cache (storage untouched). */
export function resetDeviceKeyCacheForTests(): void {
  cachedKey = null;
}
