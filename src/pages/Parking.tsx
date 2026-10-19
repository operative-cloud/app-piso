import { useState } from 'react'
import { motion } from 'motion/react'
import { Car, ChevronLeft, ChevronRight, ParkingSquare, CalendarPlus, X } from 'lucide-react'
import { useDatosPeriodo } from '../hooks/useDatos'
import { useAlias, useSesion } from '../hooks/useSesion'
import { useToast, vibrar } from '../hooks/useAvisos'
import { guardar, borrar } from '../db/operaciones'
import { Avatar, Cabecera, Hoja, colorUsuario } from '../components/comunes'
import { conteoParkingMes, mesActual, isoDia } from '../logica/calculos'

export default function Parking() {
  const d = useDatosPeriodo()
  const alias = useAlias()
  const { sesion } = useSesion()
  const toast = useToast()
  const [mes, setMes] = useState(mesActual())
  const [diaSel, setDiaSel] = useState<string>()
  const [nota, setNota] = useState('')
  if (!d) return null
  const yo = sesion!.rol
  const otro = yo === 'A' ? 'B' : 'A'
  const hoy = isoDia()
  const deDia = (f: string) => d.parking.find((p) => p.fecha === f)
  const deHoy = deDia(hoy)
  const conteo = conteoParkingMes(d.parking, mes)
  const total = conteo.A + conteo.B
  const reservas = d.parking.filter((p) => p.fecha > hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))

  const [anio, m] = mes.split('-').map(Number)
  const diasMes = new Date(anio, m, 0).getDate()
  const offset = (new Date(anio, m - 1, 1).getDay() + 6) % 7
  const moverMes = (delta: number) => setMes(mesActual(new Date(anio, m - 1 + delta, 15)))
  const fmt = (f: string) => new Date(f + 'T12:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

  async function aparcar() {
    if (!d?.periodo) return
    if (deHoy) {
      if (deHoy.usuario !== yo) return toast({ tipo: 'error', texto: `Hoy la plaza es de ${alias[deHoy.usuario]}` })
      if (deHoy.reserva) {
        await guardar('parking', { ...deHoy, reserva: false }, `${alias[yo]} aparcó (tenía reserva)`)
        vibrar([15, 40, 15])
        return toast({ tipo: 'ok', texto: 'Aparcamiento registrado' })
      }
      await borrar('parking', deHoy.id, `${alias[yo]} quitó el aparcamiento de hoy`)
      return toast({ tipo: 'ok', texto: 'Aparcamiento de hoy quitado', deshacer: () => guardar('parking', { ...deHoy, borrado: false }, `${alias[yo]} aparcó`) })
    }
    await guardar('parking', { periodoId: d.periodo.id, fecha: hoy, usuario: yo }, `${alias[yo]} aparcó`)
    vibrar([15, 40, 15])
    toast({ tipo: 'ok', texto: `¡Aparcado! Llevas ${conteo[yo] + 1} este mes` })
  }

  async function reservar() {
    if (!d?.periodo || !diaSel) return
    await guardar('parking', { periodoId: d.periodo.id, fecha: diaSel, usuario: yo, reserva: true, nota: nota.trim() || undefined }, `${alias[yo]} reservó el ${fmt(diaSel)}`)
    toast({ tipo: 'ok', texto: `Reservado para el ${fmt(diaSel)}` })
    setDiaSel(undefined)
    setNota('')
  }

  function tocarDia(f: string) {
    const r = deDia(f)
    if (f < hoy) return
    if (f === hoy) return aparcar()
    if (!r) return setDiaSel(f)
    if (r.usuario !== yo) return toast({ tipo: 'error', texto: `${alias[r.usuario]} lo reservó${r.nota ? `: «${r.nota}»` : ''}` })
    borrar('parking', r.id, `${alias[yo]} canceló la reserva del ${fmt(f)}`)
    toast({ tipo: 'ok', texto: 'Reserva cancelada', deshacer: () => guardar('parking', { ...r, borrado: false }, `${alias[yo]} reservó el ${fmt(f)}`) })
  }

  const ocupadaPorOtro = deHoy && deHoy.usuario !== yo

  return (
    <div>
      <Cabecera titulo="Parking" icono={ParkingSquare} />

      <motion.button whileTap={{ scale: 0.97 }} onClick={aparcar} disabled={!d.periodo}
        className="relative mb-4 flex w-full flex-col items-center gap-1 overflow-hidden rounded-[2rem] p-6 text-white shadow-xl"
        style={{ background: deHoy ? colorUsuario(deHoy.usuario) : 'linear-gradient(135deg,#6d5efc,#9b8cff)' }}>
        <motion.span key={deHoy?.id ?? 'libre'} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}>
          <Car size={60} strokeWidth={1.6} />
        </motion.span>
        <span className="text-xl font-extrabold">
          {!deHoy ? 'Aparqué hoy' : deHoy.reserva ? `Reservada por ${alias[deHoy.usuario]}` : `Hoy aparca ${alias[deHoy.usuario]}`}
        </span>
        <span className="text-sm opacity-85">
          {!deHoy ? 'Toca para registrarlo' : ocupadaPorOtro ? 'Plaza ocupada hoy' : deHoy.reserva ? 'Toca para confirmar que aparcas' : 'Toca para deshacer'}
        </span>
      </motion.button>

      {reservas.length > 0 && (
        <section className="tarjeta mb-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><CalendarPlus size={18} className="text-marca" /> Próximas reservas</h2>
          <ul className="grid gap-1.5">
            {reservas.slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center gap-2 text-sm">
                <Avatar u={r.usuario} nombre={alias[r.usuario]} tam={22} />
                <span className="flex-1 capitalize">{fmt(r.fecha)}{r.nota && <span className="text-tinta/50"> · {r.nota}</span>}</span>
                {r.usuario === yo && <button className="boton size-9 p-0 text-tinta/40" aria-label="Cancelar reserva" onClick={() => tocarDia(r.fecha)}><X size={16} /></button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta mb-3">
        <div className="mb-3 flex items-center justify-between">
          <button className="boton size-10 p-0" onClick={() => moverMes(-1)} aria-label="Mes anterior"><ChevronLeft /></button>
          <h2 className="font-bold capitalize">{new Date(anio, m - 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
          <button className="boton size-10 p-0" onClick={() => moverMes(1)} aria-label="Mes siguiente"><ChevronRight /></button>
        </div>
        <div className="mb-2 flex h-5 overflow-hidden rounded-full bg-tinta/5">
          {total > 0 && (['A', 'B'] as const).map((u) => (
            <div key={u} className="transition-[width] duration-300" style={{ width: `${(conteo[u] / total) * 100}%`, background: colorUsuario(u) }} />
          ))}
        </div>
        <div className="mb-4 flex justify-between text-sm">
          {([yo, otro] as const).map((u) => (
            <span key={u} className="flex items-center gap-2"><Avatar u={u} nombre={alias[u]} tam={24} />{alias[u]} <b className="text-lg tabular-nums">{conteo[u]}</b></span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-tinta/40">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((x) => <span key={x}>{x}</span>)}
          {[...Array(offset)].map((_, i) => <span key={'v' + i} />)}
          {[...Array(diasMes)].map((_, i) => {
            const f = `${mes}-${String(i + 1).padStart(2, '0')}`
            const r = deDia(f)
            const pasado = f < hoy
            return (
              <button key={f} onClick={() => tocarDia(f)} disabled={pasado}
                aria-label={`${f}${r ? (r.reserva ? ', reservado por ' : ', aparcó ') + alias[r.usuario] : ''}`}
                className={`grid aspect-square place-items-center rounded-lg text-xs font-semibold ${f === hoy ? 'ring-2 ring-marca' : ''}`}
                style={r ? (r.reserva
                  ? { border: `2px dashed ${colorUsuario(r.usuario)}`, color: colorUsuario(r.usuario) }
                  : { background: colorUsuario(r.usuario), color: '#fff' })
                  : { background: 'color-mix(in srgb, var(--tinta) 5%, transparent)', opacity: pasado ? 0.5 : 1, color: 'var(--tinta)' }}>
                {i + 1}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-center text-xs text-tinta/45">Toca un día futuro para reservarlo · borde discontinuo = reserva</p>
      </section>

      <Hoja abierta={!!diaSel} cerrar={() => setDiaSel(undefined)} titulo="Reservar plaza">
        <div className="grid gap-3">
          <p className="text-center text-lg font-bold capitalize">{diaSel && fmt(diaSel)}</p>
          <input className="campo" placeholder="Motivo (opcional): viene mi familia…" value={nota} onChange={(e) => setNota(e.target.value)} maxLength={40} />
          <button className="boton min-h-13 bg-marca text-white" onClick={reservar}><CalendarPlus size={18} /> Reservar para mí</button>
        </div>
      </Hoja>
    </div>
  )
}
