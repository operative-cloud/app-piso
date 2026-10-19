import type { Pago, Aparcamiento, Usuario, Limpieza } from '../db'

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

/** Solo cuenta los aparcamientos reales (no las reservas futuras). */
export function conteoParkingMes(registros: Aparcamiento[], mes: string, hoy = isoDia()) {
  const r: Record<Usuario, number> = { A: 0, B: 0 }
  for (const a of registros) if (!a.borrado && a.fecha.startsWith(mes) && a.fecha <= hoy) r[a.usuario]++
  return r
}

export const ZONAS = ['Cocina', 'Baño', 'Salón', 'Basura']

/** Ausencia: rango de fechas ISO en que un usuario está fuera (modo vacaciones). */
export interface Ausencia { desde: string; hasta: string }
export type Ausencias = Partial<Record<Usuario, Ausencia | undefined>>

export const estaAusente = (aus: Ausencia | undefined, dia: string) => !!aus && dia >= aus.desde && dia <= aus.hasta

/** Rotación semanal; si quien le toca está ausente esa semana, pasa al otro. */
export function turnoSemana(fecha: Date, zonaIdx: number, ausencias: Ausencias = {}): Usuario {
  const semana = Math.floor(fecha.getTime() / (7 * 864e5))
  const base: Usuario = (semana + zonaIdx) % 2 === 0 ? 'A' : 'B'
  const otro: Usuario = base === 'A' ? 'B' : 'A'
  const dia = isoDia(fecha)
  return estaAusente(ausencias[base], dia) && !estaAusente(ausencias[otro], dia) ? otro : base
}

/** Puntos de limpieza: 10 por zona hecha. Racha = semanas seguidas con todas sus zonas hechas. */
export function puntosLimpieza(limpiezas: Limpieza[], u: Usuario) {
  const hechas = limpiezas.filter((l) => l.hecho && !l.borrado && l.asignadoA === u)
  const semanas = [...new Set(hechas.map((l) => l.fecha))].sort().reverse()
  let racha = 0
  let cursor = lunesIso(new Date())
  // la semana actual cuenta si ya hay algo hecho; si no, empezamos por la anterior
  if (semanas[0] !== cursor) cursor = sumarDias(cursor, -7)
  for (const s of semanas) {
    if (s === cursor) { racha++; cursor = sumarDias(cursor, -7) } else if (s < cursor) break
  }
  return { puntos: hechas.length * 10, racha, total: hechas.length }
}

export const INSIGNIAS = [
  { id: 'primera', emoji: '🧽', nombre: 'Primera limpieza', cumple: (t: number) => t >= 1 },
  { id: 'diez', emoji: '✨', nombre: '10 limpiezas', cumple: (t: number) => t >= 10 },
  { id: 'cincuenta', emoji: '🏆', nombre: '50 limpiezas', cumple: (t: number) => t >= 50 },
  { id: 'racha3', emoji: '🔥', nombre: 'Racha de 3 semanas', cumple: (_: number, r: number) => r >= 3 },
  { id: 'racha8', emoji: '👑', nombre: 'Racha de 8 semanas', cumple: (_: number, r: number) => r >= 8 },
]

export const isoDia = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return x.toISOString().slice(0, 10)
}
export const lunesIso = (d: Date) => {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return isoDia(x)
}
export const sumarDias = (iso: string, n: number) => {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return isoDia(d)
}

export const mesActual = (d = new Date()) => isoDia(d).slice(0, 7)
export const eur = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
