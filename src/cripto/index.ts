// Utilidades criptográficas con WebCrypto nativo (sin librerías externas).
const ITERACIONES = 600_000

export const aBase64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const deBase64 = (txt: string) => {
  const b = txt.replace(/-/g, '+').replace(/_/g, '/')
  const s = atob(b + '='.repeat((4 - (b.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

export const aleatorio = (n: number) => crypto.getRandomValues(new Uint8Array(n))

/** Deriva una clave AES a partir de la clave personal del usuario. */
export async function derivarClave(secreto: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERACIONES, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export const generarClaveHogar = () => aleatorio(32)

export const importarClaveHogar = (raw: Uint8Array) =>
  crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt'])

export async function cifrarBytes(clave: CryptoKey, datos: Uint8Array) {
  const iv = aleatorio(12)
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, clave, datos as BufferSource))
  const out = new Uint8Array(iv.length + c.length)
  out.set(iv)
  out.set(c, iv.length)
  return aBase64(out)
}

export async function descifrarBytes(clave: CryptoKey, txt: string) {
  const todo = deBase64(txt)
  const plano = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: todo.slice(0, 12) as BufferSource },
    clave,
    todo.slice(12) as BufferSource,
  )
  return new Uint8Array(plano)
}

export const cifrarJSON = (clave: CryptoKey, obj: unknown) =>
  cifrarBytes(clave, new TextEncoder().encode(JSON.stringify(obj)))

export const descifrarJSON = async <T>(clave: CryptoKey, txt: string): Promise<T> =>
  JSON.parse(new TextDecoder().decode(await descifrarBytes(clave, txt)))
