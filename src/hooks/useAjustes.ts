import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Usuario } from '../db'
import type { Ausencias } from '../logica/calculos'

/** Ausencias (modo vacaciones) de cada usuario, guardadas en la tabla sincronizada de ajustes. */
export function useAusencias(): Ausencias {
  const filas = useLiveQuery(() => db.ajustes.where('id').anyOf('ausente-A', 'ausente-B').toArray(), []) ?? []
  const r: Ausencias = {}
  for (const f of filas) {
    if (f.borrado || !f.valor) continue
    try { r[f.id.slice(-1) as Usuario] = JSON.parse(f.valor) } catch { /* valor corrupto */ }
  }
  return r
}
