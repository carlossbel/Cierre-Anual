# Cierre-Anual

Aplicación web minimalista para controlar las fechas de cierre anual por cliente, con indicador tipo semáforo que avisa cuándo una empresa puede recibir o facturar.

## Semáforo

- 🟢 **Verde** — Aún no cierra (más de 7 días para el cierre)
- 🟡 **Amarillo** — Próximo (dentro de los 7 días previos al cierre)
- 🔴 **Rojo** — En cierre (es el día de cierre o ya pasó)

El umbral de 7 días para el estado amarillo se puede ajustar con la constante `DIAS_PROXIMO` en `src/App.jsx`.

## Stack

- React 18 + Vite
- Firebase Firestore

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Firestore

Los registros se guardan en la colección `cierres` con la forma:

```js
{
  cliente: string,
  fecha: 'YYYY-MM-DD',
  creado: number
}
```

## Autenticación

Acceso restringido a administrador mediante Firebase Auth (correo + contraseña).

1. Firebase Console → **Authentication → Sign-in method** → habilitar **Email/Password**.
2. **Authentication → Users → Add user** y crear la cuenta del admin.
3. Reglas de Firestore recomendadas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cierres/{doc} {
      allow read, write: if request.auth != null;
    }
  }
}
```
