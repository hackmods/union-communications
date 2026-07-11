/**
 * Passphrase-based encryption via Web Crypto (PBKDF2 + AES-GCM).
 * Used for hybrid-mode local export/import - passphrase never leaves the client.
 */

const PBKDF2_ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto API is not available");
  }
  return subtle;
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const material = await subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: KEY_BITS },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  version: "1.0";
  kdf: "PBKDF2";
  iterations: number;
  hash: "SHA-256";
  cipher: "AES-GCM";
  salt: string;
  iv: string;
  ciphertext: string;
}

export async function encryptJson(
  data: unknown,
  passphrase: string,
): Promise<EncryptedPayload> {
  if (!passphrase || passphrase.length < 8) {
    throw new Error("Passphrase must be at least 8 characters");
  }
  const subtle = getSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const cipherBuf = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext,
  );
  return {
    version: "1.0",
    kdf: "PBKDF2",
    iterations: PBKDF2_ITERATIONS,
    hash: "SHA-256",
    cipher: "AES-GCM",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(cipherBuf)),
  };
}

export async function decryptJson<T = unknown>(
  payload: EncryptedPayload,
  passphrase: string,
): Promise<T> {
  if (payload.version !== "1.0" || payload.cipher !== "AES-GCM") {
    throw new Error("Unsupported encrypted payload format");
  }
  if (!passphrase) {
    throw new Error("Passphrase is required");
  }
  const subtle = getSubtle();
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const ciphertext = fromBase64(payload.ciphertext);
  const key = await deriveKey(passphrase, salt);
  try {
    const plainBuf = await subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    return JSON.parse(new TextDecoder().decode(plainBuf)) as T;
  } catch {
    throw new Error("Decryption failed - wrong passphrase or corrupt file");
  }
}

export function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    p.version === "1.0" &&
    p.kdf === "PBKDF2" &&
    p.cipher === "AES-GCM" &&
    typeof p.salt === "string" &&
    typeof p.iv === "string" &&
    typeof p.ciphertext === "string"
  );
}
