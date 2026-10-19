// Toasts con acción "Deshacer", vibración háptica y tema claro/oscuro.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, AlertCircle } from 'lucide-react'

interface Toast { id: number; texto: string; tipo: 'ok' | 'error'; deshacer?: () => void }
const Contexto = createContext<(t: Omit<Toast, 'id'>) => void>(() => {})
export const useToast = () => useContext(Contexto)

export const vibrar = (ms: number | number[] = 12) => {
  try { navigator.vibrate?.(ms) } catch { /* sin soporte */ }
}

export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const n = useRef(0)
  const mostrar = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++n.current
    setToasts((xs) => [...xs.slice(-2), { ...t, id }])
    vibrar(t.tipo === 'error' ? [20, 40, 20] : 12)
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), t.deshacer ? 5000 : 2600)
  }, [])
  const quitar = (id: number) => setToasts((xs) => xs.filter((x) => x.id !== id))

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+164px)] z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12 } }} transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-[#1f1b3a] px-4 py-3 text-sm text-white shadow-2xl">
              {t.tipo === 'ok' ? <CheckCircle2 size={18} className="shrink-0 text-b" /> : <AlertCircle size={18} className="shrink-0 text-red-400" />}
              <span className="flex-1">{t.texto}</span>
              {t.deshacer && (
                <button className="font-bold text-[#b7aeff]" onClick={() => { t.deshacer!(); quitar(t.id) }}>Deshacer</button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Contexto.Provider>
  )
}

export type Tema = 'auto' | 'claro' | 'oscuro'
const leerTema = (): Tema => { try { return (localStorage.getItem('tema') as Tema) || 'auto' } catch { return 'auto' } }

export function useTema() {
  const [tema, setTema] = useState<Tema>(leerTema)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      const oscuro = tema === 'oscuro' || (tema === 'auto' && mq.matches)
      document.documentElement.classList.toggle('oscuro', oscuro)
      document.querySelector('meta[name=theme-color]')?.setAttribute('content', oscuro ? '#121022' : '#6d5efc')
    }
    aplicar()
    mq.addEventListener('change', aplicar)
    try { localStorage.setItem('tema', tema) } catch { /* modo privado */ }
    return () => mq.removeEventListener('change', aplicar)
  }, [tema])
  return [tema, setTema] as const
}
