// Genera una imagen PNG tipo infografía con el resumen del mes, para compartir o guardar.
import type { Pago, Aparcamiento, Limpieza, Usuario } from '../db'
import { calcularSaldo, conteoParkingMes, gastosPorTipo, eur } from './calculos'

const COLORES: Record<string, string> = { renta: '#6d5efc', luz: '#f5b400', agua: '#2f9bff', gas: '#ff5f4a', internet: '#9b5cff', comunidad: '#18b98d', otro: '#8a8aa3' }
const NOMBRES: Record<string, string> = { renta: 'Renta', luz: 'Luz', agua: 'Agua', gas: 'Gas', internet: 'Internet', comunidad: 'Comunidad', otro: 'Otro' }

export async function generarResumenPng(p: { mes: string; pagos: Pago[]; parking: Aparcamiento[]; limpiezas: Limpieza[]; alias: Record<Usuario, string> }) {
  const W = 1080, H = 1350
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')!
  const fuente = (peso: number, tam: number) => `${peso} ${tam}px ui-rounded, system-ui, sans-serif`
  const pagosMes = p.pagos.filter((x) => x.fecha.startsWith(p.mes))
  const total = pagosMes.reduce((s, x) => s + x.importe, 0)
  const tipos = gastosPorTipo(pagosMes).sort((a, b) => b.total - a.total)
  const park = conteoParkingMes(p.parking, p.mes, '9999-12-31')
  const limp = { A: 0, B: 0 } as Record<Usuario, number>
  p.limpiezas.filter((l) => l.hecho && l.fecha.startsWith(p.mes)).forEach((l) => limp[l.asignadoA]++)
  const saldo = calcularSaldo(pagosMes)
  const nombreMes = new Date(p.mes + '-15').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  // Fondo y cabecera
  g.fillStyle = '#f6f4ff'; g.fillRect(0, 0, W, H)
  const grad = g.createLinearGradient(0, 0, W, 360)
  grad.addColorStop(0, '#6d5efc'); grad.addColorStop(1, '#9b8cff')
  g.fillStyle = grad; g.beginPath(); g.roundRect(40, 40, W - 80, 340, 48); g.fill()
  g.fillStyle = '#fff'; g.font = fuente(600, 40); g.fillText(`🏠 Resumen de ${nombreMes}`, 90, 120)
  g.font = fuente(800, 110); g.fillText(eur(total), 90, 250)
  g.font = fuente(500, 36); g.globalAlpha = 0.9
  g.fillText(saldo === 0 ? 'Cuentas en paz 🎉' : `${saldo > 0 ? p.alias.B : p.alias.A} debe ${eur(Math.abs(saldo))} a ${saldo > 0 ? p.alias.A : p.alias.B}`, 90, 330)
  g.globalAlpha = 1

  // Donut de gastos
  const tarjeta = (y: number, h: number) => { g.fillStyle = '#fff'; g.beginPath(); g.roundRect(40, y, W - 80, h, 40); g.fill() }
  tarjeta(410, 460)
  const cx = 270, cy = 640, rad = 160
  let ang = -Math.PI / 2
  for (const t of tipos) {
    const a = (t.total / (total || 1)) * Math.PI * 2
    g.strokeStyle = COLORES[t.tipo]; g.lineWidth = 70; g.beginPath(); g.arc(cx, cy, rad, ang, ang + a - 0.03); g.stroke()
    ang += a
  }
  if (!tipos.length) { g.strokeStyle = '#ece9ff'; g.lineWidth = 70; g.beginPath(); g.arc(cx, cy, rad, 0, Math.PI * 2); g.stroke() }
  g.fillStyle = '#1f1b3a'; g.font = fuente(700, 30); g.textAlign = 'center'; g.fillText(`${pagosMes.length} pagos`, cx, cy + 10); g.textAlign = 'left'
  tipos.slice(0, 6).forEach((t, i) => {
    const y = 500 + i * 62
    g.fillStyle = COLORES[t.tipo]; g.beginPath(); g.roundRect(500, y, 28, 28, 8); g.fill()
    g.fillStyle = '#1f1b3a'; g.font = fuente(500, 34); g.fillText(NOMBRES[t.tipo], 545, y + 26)
    g.font = fuente(800, 34); g.textAlign = 'right'; g.fillText(eur(t.total), W - 90, y + 26); g.textAlign = 'left'
  })

  // Parking y limpieza
  const barras = (y: number, titulo: string, datos: Record<Usuario, number>) => {
    tarjeta(y, 210)
    g.fillStyle = '#1f1b3a'; g.font = fuente(700, 38); g.fillText(titulo, 90, y + 70)
    const tot = datos.A + datos.B || 1
    const ancho = W - 180
    g.fillStyle = '#ff8a3d'; g.beginPath(); g.roundRect(90, y + 100, ancho * (datos.A / tot), 40, 20); g.fill()
    g.fillStyle = '#18b98d'; g.beginPath(); g.roundRect(90 + ancho * (datos.A / tot), y + 100, ancho * (datos.B / tot), 40, 20); g.fill()
    if (datos.A + datos.B === 0) { g.fillStyle = '#ece9ff'; g.beginPath(); g.roundRect(90, y + 100, ancho, 40, 20); g.fill() }
    g.font = fuente(600, 30)
    g.fillStyle = '#ff8a3d'; g.fillText(`${p.alias.A}: ${datos.A}`, 90, y + 185)
    g.fillStyle = '#18b98d'; g.textAlign = 'right'; g.fillText(`${p.alias.B}: ${datos.B}`, W - 90, y + 185); g.textAlign = 'left'
  }
  barras(900, '🚗 Días de parking', park)
  barras(1130, '🧽 Zonas limpiadas', limp)

  return new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/png'))
}

/** Comparte la imagen (menú nativo del móvil) o la descarga si no se puede compartir. */
export async function compartirImagen(blob: Blob, nombre: string) {
  const archivo = new File([blob], nombre, { type: 'image/png' })
  if (navigator.canShare?.({ files: [archivo] })) {
    try { await navigator.share({ files: [archivo], title: 'Resumen del piso' }); return } catch { /* cancelado */ }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
}
