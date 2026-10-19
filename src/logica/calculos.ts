import type { Pago, Aparcamiento, Usuario } from '../db'

/** Saldo desde el punto de vista de A: positivo = B debe a A. */
export function calcularSaldo(pagos: Pago[], arrastrado = 0) {
  let saldo = arrastrado
  for (const p of pagos) {
    if (p.borrado || p.saldado) continue
    const deudaOtro = p.importe * (1 - p.partePagador / 100)
    saldo += p.pagadoPor === 'A' ? deudaOtro : -deudaOtro
  }
  return Math.round(saldo * 100) / 100
}

export function gastosPorTipo(pagos: Pago[]) {
  const mapa = new Map<string, number>()
  for (const p of pagos) if (!p.borrado) mapa.set(p.tipo, (mapa.get(p.tipo) ?? 0) + p.importe)
  return [...mapa].map(([tipo, total]) => ({ tipo, total: Math.round(total * 100) / 100 }))
}

export function conteoParkingMes(registros: Aparcamiento[], mes: string) {
  const r: Record<Usuario, number> = { A: 0, B: 0 }
  for (const a of registros) if (!a.borrado && a.fecha.startsWith(mes)) r[a.usuario]++
  return r
}

export const ZONAS = ['Cocina', 'Baño', 'Salón', 'Basura']

/** Rotación semanal: alterna quién limpia cada zona según el número de semana. */
export function turnoSemana(fecha: Date, zonaIdx: number): Usuario {
  const semana = Math.floor(fecha.getTime() / (7 * 864e5))
  return (semana + zonaIdx) % 2 === 0 ? 'A' : 'B'
}

export const mesActual = (d = new Date()) => d.toISOString().slice(0, 7)
export const eur = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
