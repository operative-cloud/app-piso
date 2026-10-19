// Desbloqueo con Face ID / huella mediante WebAuthn + extensión PRF.
// El autenticador del móvil devuelve un secreto que solo sale tras verificar la biometría;
// con él se cifra una copia de la clave del hogar. Sin PRF no se activa (no hay atajos inseguros).
import { leerConfig, escribirConfig, db } from '../db'
import { aBase64, deBase64, aleatorio, cifrarBytes, descifrarBytes } from './index'

const SAL_PRF = new TextEncoder().encode('piso-compartido-bio-v1')

export const biometriaDisponible = async () =>
  !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false))

export const biometriaActiva = async () => !!(await leerConfig('bioCredId'))

async function claveDesdePrf(salida: ArrayBuffer) {
  return crypto.subtle.importKey('raw', salida, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

type ConPrf = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } }

async function obtenerPrf(credId: Uint8Array) {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: aleatorio(32) as BufferSource,
      allowCredentials: [{ type: 'public-key', id: credId as BufferSource }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: SAL_PRF } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  const prf = (cred?.getClientExtensionResults() as ConPrf | undefined)?.prf?.results?.first
  if (!prf) throw new Error('Este móvil no permite desbloqueo biométrico seguro')
  return prf
}

export async function activarBiometria(rawClaveHogar: Uint8Array, alias: string) {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: aleatorio(32) as BufferSource,
      rp: { name: 'PisoCompartido', id: location.hostname },
      user: { id: aleatorio(16) as BufferSource, name: alias, displayName: alias },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      extensions: { prf: { eval: { first: SAL_PRF } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Cancelado')
  const credId = new Uint8Array(cred.rawId)
  const ext = cred.getClientExtensionResults() as ConPrf
  if (ext.prf?.enabled === false) throw new Error('Este móvil no permite desbloqueo biométrico seguro')
  const prf = ext.prf?.results?.first ?? (await obtenerPrf(credId))
  await escribirConfig('claveHogarBio', await cifrarBytes(await claveDesdePrf(prf), rawClaveHogar))
  await escribirConfig('bioCredId', aBase64(credId))
}

export async function desbloquearConBiometria() {
  const id = await leerConfig('bioCredId')
  if (!id) throw new Error('Biometría no activada')
  const prf = await obtenerPrf(deBase64(id))
  return descifrarBytes(await claveDesdePrf(prf), (await leerConfig('claveHogarBio'))!)
}

export async function desactivarBiometria() {
  await db.config.bulkDelete(['bioCredId', 'claveHogarBio'])
}
