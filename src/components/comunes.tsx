import { motion, AnimatePresence } from 'motion/react'
import { X, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Usuario, TipoPago } from '../db'
import { Home, Zap, Droplets, Flame, Wifi, Building2, Receipt } from 'lucide-react'

export const ICONO_PAGO: Record<TipoPago, { icono: LucideIcon; color: string; nombre: string }> = {
  renta: { icono: Home, color: '#6d5efc', nombre: 'Renta' },
  luz: { icono: Zap, color: '#f5b400', nombre: 'Luz' },
  agua: { icono: Droplets, color: '#2f9bff', nombre: 'Agua' },
  gas: { icono: Flame, color: '#ff5f4a', nombre: 'Gas' },
  internet: { icono: Wifi, color: '#9b5cff', nombre: 'Internet' },
  comunidad: { icono: Building2, color: '#18b98d', nombre: 'Comunidad' },
  otro: { icono: Receipt, color: '#8a8aa3', nombre: 'Otro' },
}

export const colorUsuario = (u: Usuario) => (u === 'A' ? 'var(--color-a)' : 'var(--color-b)')

export function Avatar({ u, nombre, tam = 36 }: { u: Usuario; nombre: string; tam?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: tam, height: tam, background: colorUsuario(u), fontSize: tam * 0.42 }}
      aria-label={nombre}
    >
      {nombre.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function Cabecera({ titulo, icono: Icono, extra }: { titulo: string; icono: LucideIcon; extra?: ReactNode }) {
  return (
    <header className="pt-seguro mb-4 flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-marca text-white shadow-lg shadow-marca/30">
        <Icono size={22} />
      </span>
      <h1 className="flex-1 text-2xl font-extrabold tracking-tight">{titulo}</h1>
      {extra}
    </header>
  )
}

export function TarjetaKPI({ icono: Icono, etiqueta, valor, color, pie }: {
  icono: LucideIcon; etiqueta: string; valor: ReactNode; color: string; pie?: ReactNode
}) {
  return (
    <motion.div className="tarjeta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-tinta/55">
        <span className="grid size-8 place-items-center rounded-xl" style={{ background: color + '22', color }}>
          <Icono size={18} />
        </span>
        {etiqueta}
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{valor}</div>
      {pie && <div className="mt-1 text-xs text-tinta/50">{pie}</div>}
    </motion.div>
  )
}

/** Hoja inferior tipo iOS para formularios. */
export function Hoja({ abierta, cerrar, titulo, children }: { abierta: boolean; cerrar: () => void; titulo: string; children: ReactNode }) {
  return (
    <AnimatePresence>
      {abierta && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35" onClick={cerrar}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          <motion.div role="dialog" aria-label={titulo} onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-[2rem] bg-fondo p-5 pb-[calc(env(safe-area-inset-bottom)+20px)]"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', duration: 0.3, bounce: 0 }}>
            <div className="mb-4 flex items-center">
              <h2 className="flex-1 text-xl font-extrabold">{titulo}</h2>
              <button className="boton size-11 bg-superficie p-0" onClick={cerrar} aria-label="Cerrar"><X size={20} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Vacio({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-tinta/40">
      <Icono size={44} strokeWidth={1.5} />
      <p className="text-sm">{texto}</p>
    </div>
  )
}

export function Segmentos<T extends string>({ opciones, valor, cambiar }: {
  opciones: { valor: T; texto: string }[]; valor: T; cambiar: (v: T) => void
}) {
  return (
    <div className="mb-4 flex rounded-2xl bg-marca-suave p-1">
      {opciones.map((o) => (
        <button key={o.valor} onClick={() => cambiar(o.valor)}
          className={`min-h-10 flex-1 rounded-xl text-sm font-bold transition-colors ${valor === o.valor ? 'bg-superficie text-marca shadow' : 'text-tinta/50'}`}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}
