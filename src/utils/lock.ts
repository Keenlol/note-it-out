/**
 * The app lock: the device's own screen lock — fingerprint, face, PIN — asked
 * for before the app shows anything.
 *
 * Built on WebAuthn with a *platform* authenticator, because that is the only
 * web API that can put up the OS's unlock sheet. There is no server here, so
 * nothing ever checks the signature that comes back; the whole guarantee is
 * that the browser refuses to resolve the request until the OS has verified
 * the person holding the device. Which makes this a door, not a safe: the
 * notes stay in plain localStorage underneath, and anyone who can open
 * DevTools on the phone can read them. It answers "someone picked up my
 * phone", not "someone imaged it".
 *
 * The credential is registered once (enrollLock) and its id kept; unlocking
 * (verifyLock) asks the OS for that exact credential. If the OS ever loses it
 * — screen lock removed, browser profile reset, the app served from a new
 * domain — there is no way back in, only the reset on the lock screen.
 */

const CRED_KEY = 'lock_credential'

export type LockSupport = 'ok' | 'insecure' | 'unsupported' | 'no-authenticator'

/** Re-lock delay after the app is backgrounded. Stored as the key, not the ms. */
export type LockGrace = 'now' | '1m' | '5m'
export const LOCK_GRACE_MS: Record<LockGrace, number> = { now: 0, '1m': 60_000, '5m': 300_000 }

/** Whether this browser, on this device, can put up the OS unlock at all. */
export async function lockSupport(): Promise<LockSupport> {
  if (!window.isSecureContext) return 'insecure'
  if (typeof PublicKeyCredential === 'undefined' || !navigator.credentials?.create) return 'unsupported'
  try {
    const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return ok ? 'ok' : 'no-authenticator'
  } catch {
    return 'unsupported'
  }
}

export function isLockEnabled(): boolean {
  return localStorage.getItem(CRED_KEY) !== null
}

export function disableLock(): void {
  localStorage.removeItem(CRED_KEY)
}

function random(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n))
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** The user backed out of the OS sheet, or it timed out. Anything else is a
 *  real failure the caller should hear about. */
function isDismissal(err: unknown): boolean {
  return err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'AbortError')
}

/**
 * Register a credential with the platform authenticator. The OS verifies the
 * person as part of creating it, so a true here is also the first unlock.
 * False means they backed out; a thrown error means the browser refused.
 */
export async function enrollLock(): Promise<boolean> {
  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: random(32),
        // rp.id is left to default to this origin's domain, so the credential
        // is bound to wherever the app is served from.
        rp: { name: 'Note It Out' },
        user: { id: random(16), name: 'note-it-out', displayName: 'Note It Out' },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },     // ES256
          { type: 'public-key', alg: -257 },   // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',   // this device, never a security key
          userVerification: 'required',          // the whole point
          residentKey: 'discouraged',            // a plain screen-lock sheet, not a passkey picker
        },
        attestation: 'none',
        timeout: 60_000,
      },
    })
    if (!(cred instanceof PublicKeyCredential)) return false
    localStorage.setItem(CRED_KEY, toB64(cred.rawId))
    return true
  } catch (err) {
    if (isDismissal(err)) return false
    throw err
  }
}

/**
 * Ask the OS to verify the person against the enrolled credential. False for
 * any failure — cancelled, timed out, no match, credential gone — because from
 * the lock screen every one of them means the same thing: still locked.
 */
export async function verifyLock(): Promise<boolean> {
  const stored = localStorage.getItem(CRED_KEY)
  if (stored === null) return true
  try {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: 'public-key', id: fromB64(stored) }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return cred instanceof PublicKeyCredential && toB64(cred.rawId) === stored
  } catch {
    return false
  }
}
