import { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, CookingPot, Bath, Sofa, Trash, CheckCircle2, Circle, Plus, ListTodo, Trash2, type LucideIcon } from 'lucide-react'
import { useDatosPeriodo } from '../hooks/useDatos'
import { useAlias } from '../hooks/useSesion'
import { guardar, borrar } from '../db/operaciones'
import { Avatar, Cabecera, Segmentos, Vacio } from '../components/comunes'
import { ZONAS, turnoSemana } from '../logica/calculos'
import type { Usuario } from '../db'

const ICONO_ZONA: Record<string, LucideIcon> = { Cocina: CookingPot, Baño: Bath, Salón: Sofa, Basura: Trash }

/** Lunes de la semana de una fecha, en ISO. */
const lunes = (d: Date) => {
  const x = new Date(d)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x.toISOString().slice(0, 10)
}

export default function Casa() {
  const d = useDatosPeriodo()
  const alias = useAlias()
  const [vista, setVista] = useState<'limpieza' | 'tareas'>('limpieza')
  const [nueva, setNueva] = useState('')
  const [asignar, setAsignar] = useState<Usuario | 'ambos'>('ambos')
  if (!d) return null

  const semanas = [0, 1, 2, 3].map((i) => { const f = new Date(); f.setDate(f.getDate() + i * 7); return f })
  const hecha = (zona: string, sem: string) => d.limpiezas.find((l) => l.zona === zona && l.fecha === sem)

  async function alternar(zona: string, fecha: Date, idx: number) {
    if (!d?.periodo) return
    const sem = lunes(fecha)
    const ya = hecha(zona, sem)
    const quien = turnoSemana(fecha, idx)
    if (ya) await guardar('limpiezas', { ...ya, hecho: !ya.hecho }, `${zona}: ${ya.hecho ? 'desmarcada' : 'limpia'} (${alias[quien]})`)
    else await guardar('limpiezas', { periodoId: d.periodo.id, zona, fecha: sem, asignadoA: quien, hecho: true }, `${zona}: limpia (${alias[quien]})`)
  }

  const hechasPor = (u: Usuario) => d.limpiezas.filter((l) => l.hecho && l.asignadoA === u).length

  return (
    <div>
      <Cabecera titulo="Casa" icono={Sparkles} />
      <Segmentos valor={vista} cambiar={setVista} opciones={[{ valor: 'limpieza', texto: '🧽 Limpieza' }, { valor: 'tareas', texto: '🛠️ Tareas' }]} />

      {vista === 'limpieza' ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            {(['A', 'B'] as const).map((u) => (
              <div key={u} className="tarjeta flex items-center gap-3 !p-3">
                <Avatar u={u} nombre={alias[u]} />
                <div><div className="text-xs text-black/50">{alias[u]}</div><b className="text-xl">{hechasPor(u)}</b> <span className="text-xs">limpiezas</span></div>
              </div>
            ))}
          </div>
          {semanas.map((fecha, si) => (
            <section key={si} className="tarjeta mb-3">
              <h2 className="mb-2 text-sm font-bold text-black/60">
                {si === 0 ? 'Esta semana' : `Semana del ${new Date(lunes(fecha)).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {ZONAS.map((z, i) => {
                  const Icono = ICONO_ZONA[z]
                  const quien = turnoSemana(fecha, i)
                  const ok = hecha(z, lunes(fecha))?.hecho
                  return (
                    <button key={z} onClick={() => alternar(z, fecha, i)} disabled={si > 0}
                      className="flex items-center gap-2 rounded-2xl border-2 p-2 text-left transition-colors disabled:opacity-70"
                      style={{ borderColor: ok ? 'var(--color-b)' : 'transparent', background: ok ? '#18b98d14' : '#f6f4ff' }}>
                      <Icono size={22} className="shrink-0 text-marca" />
                      <span className="flex-1 text-sm font-semibold">{z}<br /><small className="font-normal text-black/50">{alias[quien]}</small></span>
                      {si === 0 && (ok
                        ? <motion.span initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', duration: 0.25, bounce: 0.3 }}><CheckCircle2 className="text-b" /></motion.span>
                        : <Circle className="text-black/20" />)}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </>
      ) : (
        <>
          <form className="tarjeta mb-3 grid gap-2" onSubmit={async (e) => {
            e.preventDefault()
            if (!nueva.trim() || !d.periodo) return
            await guardar('tareas', { periodoId: d.periodo.id, titulo: nueva.trim(), estado: 'pendiente', asignadoA: asignar }, `Tarea: ${nueva.trim()}`)
            setNueva('')
          }}>
            <div className="flex gap-2">
              <input className="campo" placeholder="Ej. cambiar bombilla del pasillo" value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={60} />
              <button className="boton size-11 shrink-0 bg-marca p-0 text-white" aria-label="Añadir tarea"><Plus /></button>
            </div>
            <div className="flex gap-2 text-xs">
              {(['ambos', 'A', 'B'] as const).map((u) => (
                <button type="button" key={u} onClick={() => setAsignar(u)}
                  className={`rounded-full px-3 py-1.5 font-semibold ${asignar === u ? 'bg-marca text-white' : 'bg-marca-suave'}`}>
                  {u === 'ambos' ? 'Ambos' : alias[u]}
                </button>
              ))}
            </div>
          </form>
          {d.tareas.length === 0 ? <Vacio icono={ListTodo} texto="Sin tareas comunes pendientes" /> : (
            (['pendiente', 'hecho'] as const).map((estado) => (
              <section key={estado} className="mb-3">
                <h2 className="mb-2 text-sm font-bold text-black/50">{estado === 'pendiente' ? 'Pendientes' : 'Hechas'}</h2>
                <ul className="grid gap-2">
                  {d.tareas.filter((t) => t.estado === estado).map((t) => (
                    <li key={t.id} className="tarjeta flex items-center gap-3 !p-3">
                      <button aria-label="Cambiar estado" className="boton size-10 p-0" onClick={() =>
                        guardar('tareas', { ...t, estado: t.estado === 'hecho' ? 'pendiente' : 'hecho' }, `Tarea ${t.estado === 'hecho' ? 'reabierta' : 'hecha'}: ${t.titulo}`)}>
                        {t.estado === 'hecho' ? <CheckCircle2 className="text-b" /> : <Circle className="text-black/25" />}
                      </button>
                      <span className={`flex-1 ${t.estado === 'hecho' ? 'text-black/40 line-through' : 'font-semibold'}`}>{t.titulo}</span>
                      {t.asignadoA !== 'ambos' && <Avatar u={t.asignadoA} nombre={alias[t.asignadoA]} tam={24} />}
                      <button aria-label="Borrar tarea" className="boton size-10 p-0 text-black/30" onClick={() => borrar('tareas', t.id, `Tarea borrada: ${t.titulo}`)}><Trash2 size={18} /></button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </div>
  )
}
