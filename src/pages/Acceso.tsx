import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Lock, KeyRound, Home, UserPlus, ShieldCheck } from 'lucide-react'
import { crearHogar, desbloquear, estaConfigurado, unirseConInvitacion } from '../cripto/sesion'
import { registrarDispositivo } from '../sync/relay'
import { useSesion } from '../hooks/useSesion'
import { guardar, fijarUsuario, asegurarPeriodo } from '../db/operaciones'

type Paso = 'cargando' | 'bienvenida' | 'crear' | 'unirse' | 'bloqueo'

export default function Acceso() {
  const { entrar } = useSesion()
  const [paso, setPaso] = useState<Paso>('cargando')
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [alias, setAlias] = useState('')
  const [codigo, setCodigo] = useState(() => new URLSearchParams(location.hash.slice(1)).get('emparejar') ?? '')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    estaConfigurado().then((ok) => setPaso(ok ? 'bloqueo' : codigo ? 'unirse' : 'bienvenida'))
  }, [codigo])

  const validar = () => {
    if (clave.length < 6) return 'La clave debe tener al menos 6 caracteres'
    if (paso !== 'bloqueo' && clave !== clave2) return 'Las claves no coinciden'
    return ''
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    const v = validar()
    if (v) return setError(v)
    setOcupado(true)
    setError('')
    try {
      if (paso === 'bloqueo') {
        entrar(await desbloquear(clave))
      } else {
        const s = paso === 'crear' ? await crearHogar(clave) : await unirseConInvitacion(codigo, clave)
        await registrarDispositivo(s)
        fijarUsuario(s.rol)
        if (alias.trim()) await guardar('ajustes', { id: `alias-${s.rol}`, valor: alias.trim().slice(0, 20) }, 'Alias definido')
        if (s.rol === 'A') await asegurarPeriodo()
        history.replaceState(null, '', location.pathname)
        entrar(s)
      }
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setOcupado(false)
      setClave('')
      setClave2('')
    }
  }

  if (paso === 'cargando') return null

  return (
    <main className="pt-seguro mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 pb-8">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
        className="mb-6 flex flex-col items-center text-center">
        <img src="/icono.svg" alt="" className="mb-3 size-20 drop-shadow-xl" />
        <h1 className="text-3xl font-extrabold">PisoCompartido</h1>
        <p className="text-sm text-black/55">Gastos, limpieza y parking entre dos</p>
      </motion.div>

      {paso === 'bienvenida' ? (
        <div className="grid gap-3">
          <button className="boton tarjeta !justify-start text-left" onClick={() => setPaso('crear')}>
            <Home className="text-marca" /> <span><b>Crear el piso</b><br /><small className="font-normal text-black/50">Soy el primero en instalarla</small></span>
          </button>
          <button className="boton tarjeta !justify-start text-left" onClick={() => setPaso('unirse')}>
            <UserPlus className="text-b" /> <span><b>Unirme con invitación</b><br /><small className="font-normal text-black/50">Escanea el QR del móvil de tu compi</small></span>
          </button>
        </div>
      ) : (
        <form onSubmit={enviar} className="tarjeta grid gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {paso === 'bloqueo' ? <><Lock size={20} /> Introduce tu clave</> : <><KeyRound size={20} /> Crea tu clave personal</>}
          </h2>
          {paso === 'unirse' && (
            <textarea className="campo min-h-20 py-2 text-xs" placeholder="Pega aquí el código de invitación"
              value={codigo} onChange={(e) => setCodigo(e.target.value)} required />
          )}
          {paso !== 'bloqueo' && (
            <input className="campo" placeholder="Tu apodo (opcional, sin datos reales)" value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={20} />
          )}
          <input className="campo" type="password" inputMode="text" autoComplete={paso === 'bloqueo' ? 'current-password' : 'new-password'}
            placeholder="Clave personal" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus />
          {paso !== 'bloqueo' && (
            <input className="campo" type="password" autoComplete="new-password" placeholder="Repite la clave" value={clave2} onChange={(e) => setClave2(e.target.value)} />
          )}
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button className="boton bg-marca text-white disabled:opacity-60" disabled={ocupado}>
            {ocupado ? 'Comprobando…' : paso === 'bloqueo' ? 'Desbloquear' : 'Empezar'}
          </button>
          {paso !== 'bloqueo' && (
            <p className="flex gap-2 text-xs text-black/50"><ShieldCheck size={16} className="shrink-0" />
              Tu clave nunca sale de este móvil y tu compi no puede verla. Si la olvidas no hay forma de recuperarla.</p>
          )}
        </form>
      )}
    </main>
  )
}
