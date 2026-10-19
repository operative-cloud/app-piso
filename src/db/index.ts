import Dexie, { type EntityTable } from 'dexie'

export type Usuario = 'A' | 'B'
export type TipoPago = 'renta' | 'luz' | 'agua' | 'gas' | 'internet' | 'comunidad' | 'otro'

interface Base {
  id: string
  actualizado: number
  borrado?: boolean
}

export interface Periodo extends Base { inicio: string; fin: string; activo: boolean; saldoArrastrado: number }
export interface Pago extends Base {
  periodoId: string; tipo: TipoPago; concepto: string; importe: number; fecha: string
  pagadoPor: Usuario; partePagador: number // % que asume quien paga (50 = mitad)
  saldado: boolean
}
export interface Limpieza extends Base { periodoId: string; zona: string; fecha: string; asignadoA: Usuario; hecho: boolean }
export interface Tarea extends Base { periodoId: string; titulo: string; estado: 'pendiente' | 'hecho'; asignadoA: Usuario | 'ambos' }
export interface Aparcamiento extends Base { periodoId: string; fecha: string; usuario: Usuario }
export interface Ajuste extends Base { valor: string }

export interface Historial {
  id?: number; fecha: number; entidad: string; accion: 'crear' | 'editar' | 'borrar'; usuario: Usuario; resumen: string
}
export interface EventoCola { id?: number; creado: number; tabla: TablaSync; registro: Base; historial: Historial }
export interface Config { clave: string; valor: string }

export const TABLAS_SYNC = ['periodos', 'pagos', 'limpiezas', 'tareas', 'parking', 'ajustes'] as const
export type TablaSync = (typeof TABLAS_SYNC)[number]

export class BaseDatos extends Dexie {
  periodos!: EntityTable<Periodo, 'id'>
  pagos!: EntityTable<Pago, 'id'>
  limpiezas!: EntityTable<Limpieza, 'id'>
  tareas!: EntityTable<Tarea, 'id'>
  parking!: EntityTable<Aparcamiento, 'id'>
  ajustes!: EntityTable<Ajuste, 'id'>
  historial!: EntityTable<Historial, 'id'>
  colaSync!: EntityTable<EventoCola, 'id'>
  config!: EntityTable<Config, 'clave'>

  constructor(nombre = 'piso-compartido') {
    super(nombre)
    this.version(1).stores({
      periodos: 'id, inicio, activo',
      pagos: 'id, periodoId, tipo, fecha, pagadoPor',
      limpiezas: 'id, periodoId, fecha, asignadoA',
      tareas: 'id, periodoId, estado',
      parking: 'id, periodoId, fecha, usuario',
      ajustes: 'id',
      historial: '++id, fecha, entidad',
      colaSync: '++id, creado',
      config: 'clave',
    })
  }
}

export const db = new BaseDatos()
export const nuevoId = () => crypto.randomUUID()

export async function leerConfig(clave: string) {
  return (await db.config.get(clave))?.valor
}
export const escribirConfig = (clave: string, valor: string) => db.config.put({ clave, valor })
