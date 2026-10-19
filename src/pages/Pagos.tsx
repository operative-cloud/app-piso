import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Wallet, Plus, Check, Trash2, Receipt } from 'lucide-react'
import { useDatosPeriodo } from '../hooks/useDatos'
import { useAlias, useSesion } from '../hooks/useSesion'
import { guardar, borrar } from '../db/operaciones'
import { Avatar, Cabecera, Hoja, ICONO_PAGO, Segmentos, Vacio } from '../components/comunes'
import { eur } from '../logica/calculos'
import type { TipoPago, Usuario } from '../db'

const hoyIso = () => new Date().toISOString().slice(0, 10)

export default function Pagos() {
  const d = useDatosPeriodo()
  const alias = useAlias()
  const { sesion } = useSesion()
  const [abierta, setAbierta] = useState(false)
  const [filtro, setFiltro] = useState<'pendientes' | 'todos'>('pendientes')
  const [f, setF] = useState({ tipo: 'renta' as TipoPago, concepto: '', importe: '', fecha: hoyIso(), pagadoPor: sesion!.rol as Usuario, parte: 50 })

  if (!d) return null
  const lista = d.pagos
    .filter((p) => filtro === 'todos' || !p.saldado)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    const importe = Number(f.importe.replace(',', '.'))
    if (!d?.periodo || !(importe > 0)) return
    await guardar('pagos', {
      periodoId: d.periodo.id, tipo: f.tipo, concepto: f.concepto || ICONO_PAGO[f.tipo].nombre, importe,
      fecha: f.fecha, pagadoPor: f.pagadoPor, partePagador: f.parte, saldado: false,
    }, `Pago ${ICONO_PAGO[f.tipo].nombre} ${eur(importe)} por ${alias[f.pagadoPor]}`)
    setAbierta(false)
    setF({ ...f, concepto: '', importe: '' })
  }

  return (
    <div>
      <Cabecera titulo="Pagos" icono={Wallet} extra={
        <button className="boton size-11 bg-marca p-0 text-white disabled:opacity-40" disabled={!d.periodo} onClick={() => setAbierta(true)} aria-label="Nuevo pago">
          <Plus /></button>} />
      <Segmentos valor={filtro} cambiar={setFiltro} opciones={[{ valor: 'pendientes', texto: 'Pendientes' }, { valor: 'todos', texto: 'Todos' }]} />

      {lista.length === 0 ? <Vacio icono={Receipt} texto="No hay pagos aquí. Pulsa + para añadir el primero." /> : (
        <ul className="grid gap-2">
          <AnimatePresence initial={false}>
            {lista.map((p) => {
              const info = ICONO_PAGO[p.tipo]
              const deuda = p.importe * (1 - p.partePagador / 100)
              const otro = p.pagadoPor === 'A' ? 'B' : 'A'
              return (
                <motion.li key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.18 }} className={`tarjeta flex items-center gap-3 !p-3 ${p.saldado ? 'opacity-55' : ''}`}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: info.color + '1f', color: info.color }}>
                    <info.icono size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{p.concepto}</div>
                    <div className="flex items-center gap-1 text-xs text-black/50">
                      <Avatar u={p.pagadoPor} nombre={alias[p.pagadoPor]} tam={16} />
                      {new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {!p.saldado && deuda > 0 && <> · {alias[otro]} debe {eur(deuda)}</>}
                    </div>
                  </div>
                  <b className="tabular-nums">{eur(p.importe)}</b>
                  {!p.saldado && (
                    <button aria-label="Marcar saldado" className="boton size-10 bg-b/15 p-0 text-b"
                      onClick={() => guardar('pagos', { ...p, saldado: true }, `Saldado: ${p.concepto}`)}><Check size={18} /></button>
                  )}
                  <button aria-label="Borrar pago" className="boton size-10 p-0 text-black/30"
                    onClick={() => confirm('¿Borrar este pago?') && borrar('pagos', p.id, `Borrado: ${p.concepto} ${eur(p.importe)}`)}><Trash2 size={18} /></button>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}

      <Hoja abierta={abierta} cerrar={() => setAbierta(false)} titulo="Nuevo pago">
        <form onSubmit={crear} className="grid gap-3">
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(ICONO_PAGO) as TipoPago[]).map((t) => {
              const info = ICONO_PAGO[t]
              const sel = f.tipo === t
              return (
                <button type="button" key={t} onClick={() => setF({ ...f, tipo: t })}
                  className="flex flex-col items-center gap-1 rounded-2xl border-2 bg-white py-2 text-xs font-semibold transition-colors"
                  style={{ borderColor: sel ? info.color : 'transparent', color: sel ? info.color : undefined }}>
                  <info.icono size={22} style={{ color: info.color }} />{info.nombre}
                </button>
              )
            })}
          </div>
          <input className="campo text-2xl font-bold" inputMode="decimal" placeholder="0,00 €" value={f.importe}
            onChange={(e) => setF({ ...f, importe: e.target.value })} required autoFocus />
          <input className="campo" placeholder="Concepto (opcional)" value={f.concepto} onChange={(e) => setF({ ...f, concepto: e.target.value })} maxLength={40} />
          <input className="campo" type="date" value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} />
          <div>
            <p className="mb-1 text-sm font-semibold">¿Quién pagó?</p>
            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B'] as const).map((u) => (
                <button type="button" key={u} onClick={() => setF({ ...f, pagadoPor: u })}
                  className={`boton border-2 bg-white ${f.pagadoPor === u ? 'border-marca' : 'border-transparent'}`}>
                  <Avatar u={u} nombre={alias[u]} tam={26} /> {alias[u]}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm font-semibold">
            Reparto: {alias[f.pagadoPor]} asume {f.parte}% · el otro {100 - f.parte}%
            <input type="range" min={0} max={100} step={5} value={f.parte} onChange={(e) => setF({ ...f, parte: Number(e.target.value) })} className="mt-2 w-full accent-marca" />
          </label>
          <button className="boton bg-marca text-white">Guardar pago</button>
        </form>
      </Hoja>
    </div>
  )
}
