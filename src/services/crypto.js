/**
 * Client-Side E2E Encryption Engine for Abby AI Girlfriend
 * Uses Web Crypto API: PBKDF2 (100,000 iterations, SHA-256) + AES-GCM 256-bit
 */

const SALT = new TextEncoder().encode('abby-ai-girlfriend-e2e-salt-v1');
const ITERATIONS = 100000;

class CryptoService {
  /**
   * Derive AES-GCM CryptoKey from string password/PIN
   */
  static async deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password || 'default-secret-key'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: SALT,
        iterations: ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt plain text into base64 JSON ciphertext
   */
  static async encrypt(plainText, password) {
    if (!plainText) return '';
    try {
      const key = await this.deriveKey(password);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();
      
      const cipherBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plainText)
      );

      const payload = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(cipherBuffer))
      };

      return btoa(JSON.stringify(payload));
    } catch (e) {
      console.error('Encryption failed:', e);
      return plainText; // Graceful fallback
    }
  }

  /**
   * Decrypt base64 JSON ciphertext back to plain text
   */
  static async decrypt(cipherBase64, password) {
    if (!cipherBase64) return '';
    try {
      const jsonStr = atob(cipherBase64);
      const payload = JSON.parse(jsonStr);
      if (!payload.iv || !payload.data) return cipherBase64;

      const key = await this.deriveKey(password);
      const iv = new Uint8Array(payload.iv);
      const data = new Uint8Array(payload.data);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
      // If not encrypted or password mismatch, return original
      return cipherBase64;
    }
  }
}

export { CryptoService };
