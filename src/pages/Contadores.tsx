import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Gauge, Plus, Trash2, Zap, Droplets, Flame } from 'lucide-react'
import { db, type Lectura } from '../db'
import { guardar, borrar } from '../db/operaciones'
import { useToast } from '../hooks/useAvisos'
import { Vacio } from '../components/comunes'
import { isoDia } from '../logica/calculos'

const TIPOS = {
  luz: { icono: Zap, color: '#f5b400', unidad: 'kWh', nombre: 'Luz' },
  agua: { icono: Droplets, color: '#2f9bff', unidad: 'm³', nombre: 'Agua' },
  gas: { icono: Flame, color: '#ff5f4a', unidad: 'm³', nombre: 'Gas' },
} as const
type Tipo = keyof typeof TIPOS

/** Consumo entre lecturas consecutivas (los contadores solo suben). */
export function consumos(lecturas: Lectura[]) {
  const xs = [...lecturas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  return xs.slice(1).map((l, i) => ({
    fecha: l.fecha,
    etiqueta: new Date(l.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    consumo: Math.max(0, Math.round((l.valor - xs[i].valor) * 100) / 100),
    dias: Math.max(1, Math.round((new Date(l.fecha).getTime() - new Date(xs[i].fecha).getTime()) / 864e5)),
  }))
}

export default function Contadores() {
  const toast = useToast()
  const [tipo, setTipo] = useState<Tipo>('luz')
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(isoDia())
  const lecturas = useLiveQuery(() => db.lecturas.where('tipo').equals(tipo).filter((l) => !l.borrado).toArray(), [tipo]) ?? []
  const info = TIPOS[tipo]
  const serie = consumos(lecturas)
  const ultimo = serie.at(-1)
  const mediaDia = serie.length ? serie.reduce((s, x) => s + x.consumo, 0) / serie.reduce((s, x) => s + x.dias, 0) : 0
  const ordenadas = [...lecturas].sort((a, b) => b.fecha.localeCompare(a.fecha))

  async function añadir(e: React.FormEvent) {
    e.preventDefault()
    const v = Number(valor.replace(',', '.'))
    if (!(v >= 0) || !valor) return toast({ tipo: 'error', texto: 'Escribe la lectura del contador' })
    const anterior = ordenadas.find((l) => l.fecha <= fecha)
    if (anterior && v < anterior.valor) return toast({ tipo: 'error', texto: `Es menor que la lectura anterior (${anterior.valor})` })
    await guardar('lecturas', { tipo, fecha, valor: v }, `Lectura ${info.nombre}: ${v} ${info.unidad}`)
    setValor('')
    toast({ tipo: 'ok', texto: 'Lectura guardada' })
  }

  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(Object.keys(TIPOS) as Tipo[]).map((t) => {
          const I = TIPOS[t].icono
          return (
            <button key={t} onClick={() => setTipo(t)} aria-pressed={tipo === t}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-superficie text-sm font-bold transition-colors"
              style={{ borderColor: tipo === t ? TIPOS[t].color : 'transparent', color: tipo === t ? TIPOS[t].color : undefined }}>
              <I size={22} style={{ color: TIPOS[t].color }} /> {TIPOS[t].nombre}
            </button>
          )
        })}
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="tarjeta !p-3">
          <div className="text-xs text-tinta/50">Último periodo</div>
          <div className="text-xl font-extrabold tabular-nums">{ultimo ? `${ultimo.consumo} ${info.unidad}` : '—'}</div>
          {ultimo && <div className="text-xs text-tinta/45">en {ultimo.dias} días</div>}
        </div>
        <div className="tarjeta !p-3">
          <div className="text-xs text-tinta/50">Media diaria</div>
          <div className="text-xl font-extrabold tabular-nums">{mediaDia ? `${mediaDia.toFixed(2)} ${info.unidad}` : '—'}</div>
        </div>
      </div>

      <section className="tarjeta mb-3">
        <h2 className="mb-2 font-bold">Consumo entre lecturas</h2>
        {serie.length === 0 ? <p className="py-6 text-center text-sm text-tinta/40">Añade al menos 2 lecturas para ver el gráfico</p> : (
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={serie}>
                <XAxis dataKey="etiqueta" axisLine={false} tickLine={false} fontSize={11} stroke="currentColor" />
                <Tooltip formatter={(v) => `${v} ${info.unidad}`} cursor={{ fill: info.color + '18' }} />
                <Bar dataKey="consumo" radius={[8, 8, 8, 8]}>
                  {serie.map((s, i) => <Cell key={s.fecha} fill={info.color} fillOpacity={i === serie.length - 1 ? 1 : 0.55} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <form onSubmit={añadir} className="tarjeta mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
        <input className="campo" inputMode="decimal" placeholder={`Lectura (${info.unidad})`} value={valor} onChange={(e) => setValor(e.target.value)} />
        <input className="campo !w-auto" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} aria-label="Fecha de lectura" />
        <button className="boton size-12 bg-marca p-0 text-white" aria-label="Guardar lectura"><Plus /></button>
      </form>

      {ordenadas.length === 0 ? <Vacio icono={Gauge} texto="Apunta la lectura del contador cada mes para ver cuánto gastáis." /> : (
        <ul className="tarjeta divide-y divide-tinta/5 !py-1">
          {ordenadas.map((l) => (
            <li key={l.id} className="flex min-h-12 items-center gap-3 text-sm">
              <span className="flex-1">{new Date(l.fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <b className="tabular-nums">{l.valor} {info.unidad}</b>
              <button className="boton size-10 p-0 text-tinta/30" aria-label="Borrar lectura" onClick={() => borrar('lecturas', l.id, `Lectura borrada: ${l.valor}`)}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
