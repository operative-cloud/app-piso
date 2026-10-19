import { db, type Recurrente } from '../db'
import { guardar, periodoActivo } from '../db/operaciones'
import { mesActual } from './calculos'

/** Fecha de este mes para una plantilla (ajusta el día a meses cortos). */
export function fechaRecurrente(r: Pick<Recurrente, 'dia'>, mes = mesActual()) {
  const [a, m] = mes.split('-').map(Number)
  const dia = Math.min(r.dia, new Date(a, m, 0).getDate())
  return `${mes}-${String(dia).padStart(2, '0')}`
}

/** Crea los pagos del mes de cada plantilla activa si aún no existen. Idempotente. */
export async function generarRecurrentes(mes = mesActual()) {
  const periodo = await periodoActivo()
  if (!periodo) return 0
  const plantillas = (await db.recurrentes.toArray()).filter((r) => r.activo && !r.borrado)
  let creados = 0
  for (const r of plantillas) {
    // id determinista: aunque ambos móviles lo generen, acaba siendo el mismo pago
    const id = `rec-${r.id}-${mes}`
    if (await db.pagos.get(id)) continue
    await guardar('pagos', {
      id, periodoId: periodo.id, tipo: r.tipo, concepto: r.concepto, importe: r.importe, fecha: fechaRecurrente(r, mes),
      pagadoPor: r.pagadoPor, partePagador: r.partePagador, saldado: false, recurrenteId: r.id,
    }, `Pago recurrente generado: ${r.concepto}`)
    creados++
  }
  return creados
}
