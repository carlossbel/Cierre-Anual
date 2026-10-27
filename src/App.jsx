import { useEffect, useState } from 'react'
import {
  collection,
  addDoc,
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
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'cierres'), orderBy('fecha', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      setRegistros(items)
    })
    return () => unsub()
  }, [])

  async function guardar(e) {
    e.preventDefault()
    if (!cliente.trim() || !fecha) return
    setCargando(true)
    try {
      await addDoc(collection(db, 'cierres'), {
        cliente: cliente.trim(),
        fecha,
        creado: Date.now(),
      })
      setCliente('')
      setFecha('')
    } finally {
      setCargando(false)
    }
  }

  async function eliminar(id) {
    await deleteDoc(doc(db, 'cierres', id))
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

      <form className="form" onSubmit={guardar}>
        <div className="campo">
          <label htmlFor="cliente">Cliente</label>
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
        <button type="submit" className="btn" disabled={cargando}>
          {cargando ? 'Guardando…' : 'Agregar'}
        </button>
      </form>

      <section className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Indicador</th>
              <th>Estatus</th>
              <th></th>
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
            {registros.map((r) => {
              const estado = estadoSemaforo(r.fecha)
              return (
                <tr key={r.id}>
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
                    <button
                      className="btn-eliminar"
                      onClick={() => eliminar(r.id)}
                      aria-label="Eliminar"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <div className="leyenda">
          <span><span className="punto punto--verde"></span> Aún no cierra</span>
          <span><span className="punto punto--amarillo"></span> Próximo (≤ {DIAS_PROXIMO} días)</span>
          <span><span className="punto punto--rojo"></span> En cierre o vencido</span>
        </div>
      </footer>
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
