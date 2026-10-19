import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { periodoActivo } from '../db/operaciones'

/** Datos del periodo activo, reactivos a cualquier cambio en Dexie. */
export function useDatosPeriodo() {
  return useLiveQuery(async () => {
    const periodo = await periodoActivo()
    if (!periodo) return { periodo: undefined, pagos: [], limpiezas: [], tareas: [], parking: [] }
    const de = <T extends { borrado?: boolean }>(xs: T[]) => xs.filter((x) => !x.borrado)
    const [pagos, limpiezas, tareas, parking] = await Promise.all([
      db.pagos.where('periodoId').equals(periodo.id).toArray(),
      db.limpiezas.where('periodoId').equals(periodo.id).toArray(),
      db.tareas.where('periodoId').equals(periodo.id).toArray(),
      db.parking.where('periodoId').equals(periodo.id).toArray(),
    ])
    return { periodo, pagos: de(pagos), limpiezas: de(limpiezas), tareas: de(tareas), parking: de(parking) }
  }, [])
}
