import { useState } from 'react'
import { motion } from 'motion/react'
import { Car, ChevronLeft, ChevronRight, ParkingSquare } from 'lucide-react'
import { useDatosPeriodo } from '../hooks/useDatos'
import { useAlias, useSesion } from '../hooks/useSesion'
import { guardar, borrar } from '../db/operaciones'
import { Avatar, Cabecera, colorUsuario } from '../components/comunes'
import { conteoParkingMes, mesActual } from '../logica/calculos'

export default function Parking() {
  const d = useDatosPeriodo()
  const alias = useAlias()
  const { sesion } = useSesion()
  const [mes, setMes] = useState(mesActual())
  if (!d) return null
  const yo = sesion!.rol
  const hoy = new Date().toISOString().slice(0, 10)
  const deHoy = d.parking.find((p) => p.fecha === hoy)
  const conteo = conteoParkingMes(d.parking, mes)
  const total = conteo.A + conteo.B

  const [anio, m] = mes.split('-').map(Number)
  const diasMes = new Date(anio, m, 0).getDate()
  const offset = (new Date(anio, m - 1, 1).getDay() + 6) % 7
  const moverMes = (delta: number) => setMes(mesActual(new Date(anio, m - 1 + delta, 15)))

  async function aparcar() {
    if (!d?.periodo) return
    if (deHoy) {
      if (deHoy.usuario !== yo) return alert(`Hoy ya ha aparcado ${alias[deHoy.usuario]}`)
      if (confirm('¿Quitar tu aparcamiento de hoy?')) await borrar('parking', deHoy.id, `${alias[yo]} quitó el aparcamiento de hoy`)
      return
    }
    await guardar('parking', { periodoId: d.periodo.id, fecha: hoy, usuario: yo }, `${alias[yo]} aparcó`)
    navigator.vibrate?.(30)
  }

  return (
    <div>
      <Cabecera titulo="Parking" icono={ParkingSquare} />

      <motion.button whileTap={{ scale: 0.96 }} onClick={aparcar} disabled={!d.periodo}
        className="mb-4 flex w-full flex-col items-center gap-2 rounded-[2rem] p-6 text-white shadow-xl"
        style={{ background: deHoy ? colorUsuario(deHoy.usuario) : 'linear-gradient(135deg,#6d5efc,#9b8cff)' }}>
        <Car size={56} strokeWidth={1.6} />
        <span className="text-xl font-extrabold">{deHoy ? `Hoy aparca ${alias[deHoy.usuario]}` : 'Aparqué hoy'}</span>
        <span className="text-sm opacity-85">{deHoy ? (deHoy.usuario === yo ? 'Pulsa para deshacer' : 'Plaza ocupada') : 'Pulsa para registrarlo'}</span>
      </motion.button>

      <section className="tarjeta mb-3">
        <div className="mb-3 flex items-center justify-between">
          <button className="boton size-10 p-0" onClick={() => moverMes(-1)} aria-label="Mes anterior"><ChevronLeft /></button>
          <h2 className="font-bold capitalize">{new Date(anio, m - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
          <button className="boton size-10 p-0" onClick={() => moverMes(1)} aria-label="Mes siguiente"><ChevronRight /></button>
        </div>
        {/* Barra comparativa */}
        <div className="mb-2 flex h-5 overflow-hidden rounded-full bg-black/5">
          {total > 0 && (['A', 'B'] as const).map((u) => (
            <div key={u} className="transition-[width] duration-300" style={{ width: `${(conteo[u] / total) * 100}%`, background: colorUsuario(u) }} />
          ))}
        </div>
        <div className="mb-4 flex justify-between text-sm">
          {(['A', 'B'] as const).map((u) => (
            <span key={u} className="flex items-center gap-2"><Avatar u={u} nombre={alias[u]} tam={24} />{alias[u]} <b className="text-lg">{conteo[u]}</b></span>
          ))}
        </div>
        {/* Calendario de calor */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-black/40">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => <span key={x}>{x}</span>)}
          {[...Array(offset)].map((_, i) => <span key={'v' + i} />)}
          {[...Array(diasMes)].map((_, i) => {
            const f = `${mes}-${String(i + 1).padStart(2, '0')}`
            const r = d.parking.find((p) => p.fecha === f)
            return (
              <span key={f} className="grid aspect-square place-items-center rounded-lg text-xs font-semibold"
                style={{ background: r ? colorUsuario(r.usuario) : '#f1effa', color: r ? '#fff' : f === hoy ? '#6d5efc' : '#0006', outline: f === hoy ? '2px solid #6d5efc' : undefined }}>
                {i + 1}
              </span>
            )
          })}
        </div>
      </section>
    </div>
  )
}
