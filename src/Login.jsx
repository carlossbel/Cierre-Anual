import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from './firebase'
import BotonTema from './BotonTema'

export default function Login({ tema, onAlternarTema }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      const codigo = err?.code || ''
      if (codigo === 'auth/invalid-credential' || codigo === 'auth/wrong-password') {
        setError('Correo o contraseña incorrectos.')
      } else if (codigo === 'auth/user-not-found') {
        setError('Usuario no registrado.')
      } else if (codigo === 'auth/too-many-requests') {
        setError('Demasiados intentos. Intenta más tarde.')
      } else {
        setError('No se pudo iniciar sesión.')
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login">
      {onAlternarTema && (
        <div className="login-tema">
          <BotonTema tema={tema} onClick={onAlternarTema} />
        </div>
      )}
      <form className="login-card" onSubmit={entrar}>
        <h1>Cierre Anual</h1>
        <p className="login-sub">Acceso de administrador</p>

        <div className="campo">
          <label htmlFor="email">Correo</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="error">{error}</div>}

        <button type="submit" className="btn" disabled={cargando}>
          {cargando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
