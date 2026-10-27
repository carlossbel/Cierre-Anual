import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCyu5h6UuB85Ks_e_58vD-DY0CKZfdX26I',
  authDomain: 'cierre-anual.firebaseapp.com',
  projectId: 'cierre-anual',
  storageBucket: 'cierre-anual.firebasestorage.app',
  messagingSenderId: '110367823301',
  appId: '1:110367823301:web:99a4250f114a98a820e7ac',
  measurementId: 'G-2EPHP7G58Z',
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
