// Gestión de la clave personal, el hogar y el emparejamiento entre los 2 dispositivos.
import { db, leerConfig, escribirConfig, type Usuario } from '../db'
import { aBase64, deBase64, aleatorio, cifrarBytes, descifrarBytes, derivarClave, generarClaveHogar, importarClaveHogar } from './index'

export interface Sesion { claveHogar: CryptoKey; hogarId: string; dispositivoId: string; rol: Usuario }

const CADUCIDAD_QR = 5 * 60 * 1000

export const estaConfigurado = async () => !!(await leerConfig('claveHogarCifrada'))

/** Protege la clave del hogar con la clave personal (que nunca se guarda ni se envía). */
async function protegerClaveHogar(raw: Uint8Array, clavePersonal: string) {
  const salt = aleatorio(16)
  const k = await derivarClave(clavePersonal, salt)
  await escribirConfig('salt', aBase64(salt))
  await escribirConfig('claveHogarCifrada', await cifrarBytes(k, raw))
}

export async function crearHogar(clavePersonal: string): Promise<Sesion> {
  const raw = generarClaveHogar()
  const hogarId = aBase64(aleatorio(16))
  const dispositivoId = aBase64(aleatorio(16))
  await protegerClaveHogar(raw, clavePersonal)
  await escribirConfig('hogarId', hogarId)
  await escribirConfig('dispositivoId', dispositivoId)
  await escribirConfig('rol', 'A')
  return { claveHogar: await importarClaveHogar(raw), hogarId, dispositivoId, rol: 'A' }
}

/** Genera el código de invitación que A muestra como QR (caduca a los 5 minutos). */
export async function generarInvitacion(clavePersonal: string) {
  const raw = await abrirClaveHogarRaw(clavePersonal)
  const hogarId = (await leerConfig('hogarId'))!
  return aBase64(new TextEncoder().encode(JSON.stringify({ h: hogarId, k: aBase64(raw), e: Date.now() + CADUCIDAD_QR })))
}

export async function unirseConInvitacion(codigo: string, clavePersonal: string): Promise<Sesion> {
  let datos: { h: string; k: string; e: number }
  try {
    datos = JSON.parse(new TextDecoder().decode(deBase64(codigo.trim())))
  } catch {
    throw new Error('Código de invitación no válido')
  }
  if (Date.now() > datos.e) throw new Error('La invitación ha caducado. Pide un QR nuevo.')
  const raw = deBase64(datos.k)
  const dispositivoId = aBase64(aleatorio(16))
  await protegerClaveHogar(raw, clavePersonal)
  await escribirConfig('hogarId', datos.h)
  await escribirConfig('dispositivoId', dispositivoId)
  await escribirConfig('rol', 'B')
  return { claveHogar: await importarClaveHogar(raw), hogarId: datos.h, dispositivoId, rol: 'B' }
}

async function abrirClaveHogarRaw(clavePersonal: string) {
  const salt = deBase64((await leerConfig('salt'))!)
  const k = await derivarClave(clavePersonal, salt)
  try {
    return await descifrarBytes(k, (await leerConfig('claveHogarCifrada'))!)
  } catch {
    throw new Error('Clave incorrecta')
  }
}

/** Retardo progresivo tras 5 fallos: 30 s, 60 s, 120 s... */
export async function esperaPendiente() {
  const hasta = Number((await leerConfig('bloqueadoHasta')) ?? 0)
  return Math.max(0, hasta - Date.now())
}

export async function desbloquear(clavePersonal: string): Promise<Sesion> {
  const espera = await esperaPendiente()
  if (espera > 0) throw new Error(`Demasiados intentos. Espera ${Math.ceil(espera / 1000)} s`)
  try {
    const raw = await abrirClaveHogarRaw(clavePersonal)
    await escribirConfig('fallos', '0')
    return {
      claveHogar: await importarClaveHogar(raw),
      hogarId: (await leerConfig('hogarId'))!,
      dispositivoId: (await leerConfig('dispositivoId'))!,
      rol: (await leerConfig('rol')) as Usuario,
    }
  } catch (e) {
    const fallos = Number((await leerConfig('fallos')) ?? 0) + 1
    await escribirConfig('fallos', String(fallos))
    if (fallos >= 5) await escribirConfig('bloqueadoHasta', String(Date.now() + 30_000 * 2 ** (fallos - 5)))
    throw e
  }
}

export async function cambiarClave(actual: string, nueva: string) {
  const raw = await abrirClaveHogarRaw(actual)
  await protegerClaveHogar(raw, nueva)
}

export async function borrarTodoLocal() {
  await db.delete()
  location.reload()
}
