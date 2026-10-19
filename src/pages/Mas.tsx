import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import QRCode from 'qrcode'
import { Settings, History, QrCode, RotateCw, Download, KeyRound, Trash2, Shield, Lock, Plus, Pencil, Minus, Cloud, CloudOff } from 'lucide-react'
import { db, type Historial } from '../db'
import { useAlias, useSesion } from '../hooks/useSesion'
import { useDatosPeriodo } from '../hooks/useDatos'
import { guardar, renovarPeriodo } from '../db/operaciones'
import { Avatar, Cabecera, Hoja, Segmentos, Vacio } from '../components/comunes'
import { calcularSaldo, eur } from '../logica/calculos'
import { borrarTodoLocal, cambiarClave, generarInvitacion } from '../cripto/sesion'
import { borrarHogarRemoto, relayDisponible } from '../sync/relay'
import { cifrarJSON } from '../cripto'

const ICONO_ACCION = { crear: Plus, editar: Pencil, borrar: Minus }
const NOMBRE_ENTIDAD: Record<string, string> = { pagos: '💶 Pagos', limpiezas: '🧽 Limpieza', tareas: '🛠️ Tareas', parking: '🚗 Parking', periodos: '📅 Periodos', ajustes: '⚙️ Ajustes' }

export default function Mas() {
  const [vista, setVista] = useState<'historial' | 'ajustes'>('historial')
  return (
    <div>
      <Cabecera titulo="Más" icono={Settings} />
      <Segmentos valor={vista} cambiar={setVista} opciones={[{ valor: 'historial', texto: '📜 Histórico' }, { valor: 'ajustes', texto: '⚙️ Ajustes' }]} />
      {vista === 'historial' ? <HistorialVista /> : <Ajustes />}
    </div>
  )
}

function HistorialVista() {
  const alias = useAlias()
  const [entidad, setEntidad] = useState('todas')
  const filas = useLiveQuery(() => db.historial.orderBy('fecha').reverse().limit(300).toArray(), []) ?? []
  const lista = filas.filter((h) => entidad === 'todas' || h.entidad === entidad)
  const porDia = lista.reduce<Record<string, Historial[]>>((acc, h) => {
    const k = new Date(h.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    ;(acc[k] ??= []).push(h)
    return acc
  }, {})
  return (
    <>
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {['todas', ...Object.keys(NOMBRE_ENTIDAD)].map((e) => (
          <button key={e} onClick={() => setEntidad(e)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold ${entidad === e ? 'bg-marca text-white' : 'bg-white'}`}>
            {e === 'todas' ? 'Todo' : NOMBRE_ENTIDAD[e]}
          </button>
        ))}
      </div>
      {lista.length === 0 && <Vacio icono={History} texto="Aún no hay operaciones" />}
      {Object.entries(porDia).map(([dia, hs]) => (
        <section key={dia} className="mb-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-black/45">{dia}</h2>
          <ol className="relative grid gap-2 border-l-2 border-marca/20 pl-4">
            {hs.map((h) => {
              const I = ICONO_ACCION[h.accion]
              return (
                <li key={h.id} className="tarjeta relative flex items-center gap-3 !p-3">
                  <span className="absolute -left-[27px] grid size-5 place-items-center rounded-full bg-marca text-white"><I size={12} /></span>
                  <Avatar u={h.usuario} nombre={alias[h.usuario]} tam={28} />
                  <span className="flex-1 text-sm">{h.resumen}</span>
                  <time className="text-xs text-black/40">{new Date(h.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</time>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </>
  )
}

function Ajustes() {
  const { sesion, bloquear, estadoSync } = useSesion()
  const alias = useAlias()
  const d = useDatosPeriodo()
  const periodos = useLiveQuery(() => db.periodos.orderBy('inicio').reverse().toArray(), []) ?? []
  const [hoja, setHoja] = useState<'' | 'qr' | 'clave'>('')
  const [qr, setQr] = useState({ img: '', codigo: '' })
  const [c1, setC1] = useState('')
  const [c2, setC2] = useState('')
  const [msg, setMsg] = useState('')
  const yo = sesion!.rol

  async function invitar(e: React.FormEvent) {
    e.preventDefault()
    try {
      const codigo = await generarInvitacion(c1)
      const url = `${location.origin}${location.pathname}#emparejar=${codigo}`
      setQr({ img: await QRCode.toDataURL(url, { width: 280, margin: 1, color: { dark: '#1f1b3a' } }), codigo })
      setC1('')
      setMsg('')
    } catch (err) { setMsg((err as Error).message) }
  }

  async function cambiar(e: React.FormEvent) {
    e.preventDefault()
    if (c2.length < 6) return setMsg('La nueva clave debe tener al menos 6 caracteres')
    try {
      await cambiarClave(c1, c2)
      setMsg('✅ Clave cambiada')
      setC1(''); setC2('')
    } catch (err) { setMsg((err as Error).message) }
  }

  async function exportar() {
    const datos = Object.fromEntries(await Promise.all(['periodos', 'pagos', 'limpiezas', 'tareas', 'parking', 'ajustes', 'historial']
      .map(async (t) => [t, await db.table(t).toArray()])))
    const blob = new Blob([await cifrarJSON(sesion!.claveHogar, datos)], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `piso-backup-${new Date().toISOString().slice(0, 10)}.cifrado`
    a.click()
  }

  async function renovar() {
    if (!d) return
    const saldo = calcularSaldo(d.pagos, d.periodo?.saldoArrastrado)
    if (confirm(`¿Cerrar el periodo y abrir uno nuevo de 1 año?\nSe arrastrará un saldo de ${eur(saldo)} (positivo = ${alias.B} debe a ${alias.A}).`))
      await renovarPeriodo(saldo)
  }

  async function borrarTodo() {
    if (!confirm('Esto borra TODOS los datos de este móvil y del servidor. No se puede deshacer. ¿Seguro?')) return
    await borrarHogarRemoto(sesion!).catch(() => {})
    await borrarTodoLocal()
  }

  const Fila = ({ icono: I, texto, sub, onClick, peligro }: { icono: typeof Lock; texto: string; sub?: string; onClick: () => void; peligro?: boolean }) => (
    <button onClick={onClick} className={`flex min-h-14 w-full items-center gap-3 px-1 text-left ${peligro ? 'text-red-600' : ''}`}>
      <I size={20} className={peligro ? '' : 'text-marca'} />
      <span className="flex-1"><b className="text-sm">{texto}</b>{sub && <><br /><small className="text-black/50">{sub}</small></>}</span>
    </button>
  )

  return (
    <div className="grid gap-3">
      <section className="tarjeta flex items-center gap-3">
        <Avatar u={yo} nombre={alias[yo]} tam={44} />
        <input className="campo" defaultValue={alias[yo]} maxLength={20} aria-label="Tu apodo"
          onBlur={(e) => e.target.value.trim() && e.target.value !== alias[yo] && guardar('ajustes', { id: `alias-${yo}`, valor: e.target.value.trim() }, 'Apodo cambiado')} />
      </section>

      <section className="tarjeta">
        <h2 className="mb-2 flex items-center gap-2 font-bold">📅 Periodos</h2>
        {periodos.map((p) => (
          <div key={p.id} className="flex justify-between border-b border-black/5 py-2 text-sm last:border-0">
            <span>{new Date(p.inicio).toLocaleDateString('es-ES')} → {new Date(p.fin).toLocaleDateString('es-ES')}</span>
            <span className={`rounded-full px-2 text-xs font-bold ${p.activo ? 'bg-b/15 text-b' : 'bg-black/5 text-black/40'}`}>{p.activo ? 'Activo' : 'Cerrado'}</span>
          </div>
        ))}
        <button className="boton mt-2 w-full bg-marca-suave text-marca" onClick={renovar}><RotateCw size={18} /> Renovar 1 año</button>
      </section>

      <section className="tarjeta divide-y divide-black/5 !py-1">
        {yo === 'A' && <Fila icono={QrCode} texto="Invitar a mi compi" sub="QR válido 5 minutos · máx. 2 móviles" onClick={() => { setHoja('qr'); setQr({ img: '', codigo: '' }) }} />}
        <Fila icono={KeyRound} texto="Cambiar mi clave" onClick={() => setHoja('clave')} />
        <Fila icono={Download} texto="Exportar copia cifrada" sub="Solo se puede leer con la clave del piso" onClick={exportar} />
        <Fila icono={Lock} texto="Bloquear ahora" onClick={bloquear} />
        <Fila icono={relayDisponible() ? Cloud : CloudOff} texto="Sincronización"
          sub={relayDisponible() ? `Cifrada de extremo a extremo · ${estadoSync || '—'}` : 'Solo local (sin servidor configurado)'} onClick={() => {}} />
        <Fila icono={Shield} texto="Privacidad" sub="Sin datos personales ni rastreo" onClick={() => window.open('/privacidad.html', '_blank')} />
        <Fila icono={Trash2} texto="Borrar todos los datos" peligro onClick={borrarTodo} />
      </section>

      <Hoja abierta={hoja === 'qr'} cerrar={() => setHoja('')} titulo="Invitar a mi compi">
        {qr.img ? (
          <div className="grid justify-items-center gap-3 text-center">
            <img src={qr.img} alt="Código QR de invitación" className="rounded-2xl bg-white p-2" />
            <p className="text-sm text-black/60">Escanéalo con la cámara del otro móvil. Caduca en 5 minutos.</p>
            <button className="boton bg-white text-sm" onClick={() => navigator.clipboard?.writeText(qr.codigo)}>Copiar código</button>
          </div>
        ) : (
          <form onSubmit={invitar} className="grid gap-3">
            <p className="text-sm text-black/60">Confirma tu clave para generar la invitación.</p>
            <input className="campo" type="password" placeholder="Tu clave" value={c1} onChange={(e) => setC1(e.target.value)} autoFocus />
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <button className="boton bg-marca text-white">Generar QR</button>
          </form>
        )}
      </Hoja>

      <Hoja abierta={hoja === 'clave'} cerrar={() => { setHoja(''); setMsg('') }} titulo="Cambiar mi clave">
        <form onSubmit={cambiar} className="grid gap-3">
          <input className="campo" type="password" placeholder="Clave actual" value={c1} onChange={(e) => setC1(e.target.value)} />
          <input className="campo" type="password" placeholder="Nueva clave" value={c2} onChange={(e) => setC2(e.target.value)} />
          {msg && <p className="text-sm">{msg}</p>}
          <button className="boton bg-marca text-white">Guardar</button>
        </form>
      </Hoja>
    </div>
  )
}
