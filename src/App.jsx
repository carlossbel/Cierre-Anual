import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { db, auth } from './firebase'
import Login from './Login'

// Días que faltan para que la fecha se considere "próxima"
const DIAS_PROXIMO = 7

function diasHasta(fechaStr) {
  if (!fechaStr) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const [y, m, d] = fechaStr.split('-').map(Number)
  const objetivo = new Date(y, m - 1, d)
  objetivo.setHours(0, 0, 0, 0)
  const diffMs = objetivo.getTime() - hoy.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function estadoSemaforo(fechaStr) {
  const dias = diasHasta(fechaStr)
  if (dias === null) return { color: 'gris', label: 'Sin fecha' }
  if (dias <= 0) return { color: 'rojo', label: 'En cierre' }
  if (dias <= DIAS_PROXIMO) return { color: 'amarillo', label: 'Próximo' }
  return { color: 'verde', label: 'Aún no cierra' }
}

function formatearFecha(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-')
  return `${d}/${m}/${y}`
}

function Semaforo({ color }) {
  return (
    <div className={`semaforo semaforo--${color}`}>
      <span className={`luz luz--rojo ${color === 'rojo' ? 'activa' : ''}`} />
      <span className={`luz luz--amarillo ${color === 'amarillo' ? 'activa' : ''}`} />
      <span className={`luz luz--verde ${color === 'verde' ? 'activa' : ''}`} />
    </div>
  )
}

function Dashboard({ usuario }) {
  const [cliente, setCliente] = useState('')
  const [fecha, setFecha] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('todos')

  const editando = editandoId !== null

  const registrosFiltrados = registros.filter((r) => {
    const coincideBusqueda = r.cliente
      .toLowerCase()
      .includes(busqueda.trim().toLowerCase())
    if (!coincideBusqueda) return false
    if (filtroEstatus === 'todos') return true
    const estado = estadoSemaforo(r.fecha)
    return estado.color === filtroEstatus
  })

  const conteos = {
    todos: registros.length,
    verde: 0,
    amarillo: 0,
    rojo: 0,
  }
  registros.forEach((r) => {
    const c = estadoSemaforo(r.fecha).color
    if (c === 'verde' || c === 'amarillo' || c === 'rojo') conteos[c]++
  })

  useEffect(() => {
    const q = query(collection(db, 'cierres'), orderBy('fecha', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setRegistros(items)
    })
    return () => unsub()
  }, [])

  function limpiarForm() {
    setCliente('')
    setFecha('')
    setEditandoId(null)
  }

  function cargarParaEditar(r) {
    setCliente(r.cliente)
    setFecha(r.fecha)
    setEditandoId(r.id)
    // Scroll al form para que se vea en móvil
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  async function guardar(e) {
    e.preventDefault()
    if (!cliente.trim() || !fecha) return
    setCargando(true)
    try {
      if (editando) {
        await updateDoc(doc(db, 'cierres', editandoId), {
          cliente: cliente.trim(),
          fecha,
          modificado: Date.now(),
          modificadoPor: usuario.email,
        })
      } else {
        await addDoc(collection(db, 'cierres'), {
          cliente: cliente.trim(),
          fecha,
          creado: Date.now(),
          creadoPor: usuario.email,
        })
      }
      limpiarForm()
    } finally {
      setCargando(false)
    }
  }

  async function eliminar(id) {
    const r = registros.find((x) => x.id === id)
    const nombre = r?.cliente || 'este registro'
    if (!window.confirm(`¿Eliminar ${nombre}?`)) return
    await deleteDoc(doc(db, 'cierres', id))
    if (editandoId === id) limpiarForm()
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Cierre Anual</h1>
          <p className="sub">Control de fechas de cierre por cliente</p>
        </div>
        <div className="user-info">
          <span className="user-email">{usuario.email}</span>
          <button className="btn-salir" onClick={() => signOut(auth)}>
            Salir
          </button>
        </div>
      </header>

      <form className={`form ${editando ? 'form--editando' : ''}`} onSubmit={guardar}>
        <div className="campo">
          <label htmlFor="cliente">
            Cliente {editando && <span className="hint">(editando)</span>}
          </label>
          <input
            id="cliente"
            type="text"
            placeholder="Nombre del cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="fecha">Fecha</label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
          />
        </div>
        <div className="form-acciones">
          <button type="submit" className="btn" disabled={cargando}>
            {cargando
              ? 'Guardando…'
              : editando
              ? 'Actualizar'
              : 'Agregar'}
          </button>
          {editando && (
            <button
              type="button"
              className="btn-secundario"
              onClick={limpiarForm}
              disabled={cargando}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div className="controles">
        <div className="buscador">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Buscar cliente…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              type="button"
              className="btn-limpiar-busqueda"
              onClick={() => setBusqueda('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
        <div className="filtros">
          <button
            type="button"
            className={`chip ${filtroEstatus === 'todos' ? 'chip--activo' : ''}`}
            onClick={() => setFiltroEstatus('todos')}
          >
            Todos <span className="chip-conteo">{conteos.todos}</span>
          </button>
          <button
            type="button"
            className={`chip chip--verde ${filtroEstatus === 'verde' ? 'chip--activo' : ''}`}
            onClick={() => setFiltroEstatus('verde')}
          >
            <span className="punto punto--verde"></span>
            Aún no cierra <span className="chip-conteo">{conteos.verde}</span>
          </button>
          <button
            type="button"
            className={`chip chip--amarillo ${filtroEstatus === 'amarillo' ? 'chip--activo' : ''}`}
            onClick={() => setFiltroEstatus('amarillo')}
          >
            <span className="punto punto--amarillo"></span>
            Próximo <span className="chip-conteo">{conteos.amarillo}</span>
          </button>
          <button
            type="button"
            className={`chip chip--rojo ${filtroEstatus === 'rojo' ? 'chip--activo' : ''}`}
            onClick={() => setFiltroEstatus('rojo')}
          >
            <span className="punto punto--rojo"></span>
            En cierre <span className="chip-conteo">{conteos.rojo}</span>
          </button>
        </div>
      </div>

      <section className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Indicador</th>
              <th>Estatus</th>
              <th className="col-acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {registros.length === 0 && (
              <tr>
                <td colSpan={5} className="vacio">
                  Sin registros aún.
                </td>
              </tr>
            )}
            {registros.length > 0 && registrosFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="vacio">
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            )}
            {registrosFiltrados.map((r) => {
              const estado = estadoSemaforo(r.fecha)
              const esFilaEditada = editandoId === r.id
              return (
                <tr key={r.id} className={esFilaEditada ? 'fila-editada' : ''}>
                  <td>{r.cliente}</td>
                  <td>{formatearFecha(r.fecha)}</td>
                  <td>
                    <Semaforo color={estado.color} />
                  </td>
                  <td>
                    <span className={`etiqueta etiqueta--${estado.color}`}>
                      {estado.label}
                    </span>
                  </td>
                  <td>
                    <div className="acciones">
                      <button
                        className="btn-editar"
                        onClick={() => cargarParaEditar(r)}
                        aria-label="Editar"
                        title="Editar"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-eliminar"
                        onClick={() => eliminar(r.id)}
                        aria-label="Eliminar"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

    </div>
  )
}

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [verificando, setVerificando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUsuario(u)
      setVerificando(false)
    })
    return () => unsub()
  }, [])

  if (verificando) {
    return <div className="verificando">Cargando…</div>
  }

  if (!usuario) {
    return <Login />
  }

  return <Dashboard usuario={usuario} />
}
