import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Client, ColumnType, CellEntry, NoteUrgency, SharedNote, StatusOption, TaskColumn } from './types';

const firebaseConfig = {
  apiKey: 'AIzaSyABvXTNz9NsgmKejoFwjR95BVwI9XMLcg8',
  authDomain: 'muhasebe-app-36eda.firebaseapp.com',
  projectId: 'muhasebe-app-36eda',
  storageBucket: 'muhasebe-app-36eda.firebasestorage.app',
  messagingSenderId: '216178798300',
  appId: '1:216178798300:web:39775f0066c2fbe4cd4e19',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firestore güvenlik kuralları "request.auth != null" şartı arıyor. Kendi kullanıcı adı/şifre
// sistemimiz Firebase Authentication kullanmadığı için, oturuma sadece erişim izni vermek amacıyla
// arka planda anonim bir Firebase Auth oturumu açıyoruz.
let anonymousSession: Promise<void> | null = null;
function ensureAnonymousSession(): Promise<void> {
  if (!anonymousSession) {
    anonymousSession = new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        user => {
          if (user) {
            unsubscribe();
            resolve();
          }
        },
        err => {
          unsubscribe();
          reject(err);
        },
      );
      signInAnonymously(auth).catch(reject);
    });
  }
  return anonymousSession;
}

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
}

// --- GİRİŞ ---
// Kullanıcılar Firestore'daki "users" koleksiyonunda tutulur ve Firebase Console üzerinden
// elle eklenir (bkz. scripts/hash-password.mjs ve firestore.rules). Kayıt/self servis yoktur.
export async function loginUser(username: string, password: string): Promise<AppUser> {
  await ensureAnonymousSession();
  const passwordHash = await sha256Hex(password);
  const normalized = username.trim().toLocaleLowerCase('tr-TR');

  const snap = await getDocs(query(collection(db, 'users'), where('username', '==', normalized)));
  const match = snap.docs.find(d => d.data().passwordHash === passwordHash);
  if (!match) {
    throw new Error('Kullanıcı adı veya şifre hatalı.');
  }
  const data = match.data() as { username: string; displayName?: string; role?: string };
  return {
    id: match.id,
    username: data.username,
    displayName: data.displayName ?? data.username,
    role: data.role ?? 'staff',
  };
}

// --- MÜVEKKİLLER ---
export function subscribeClients(cb: (clients: Client[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'clients'), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Client, 'id'>) }));
    list.sort((a, b) => a.companyCode.localeCompare(b.companyCode));
    cb(list);
  });
}

export async function addClientDoc(companyCode: string, name: string) {
  await ensureAnonymousSession();
  await addDoc(collection(db, 'clients'), { companyCode, name, isDeleted: false });
}

export async function deleteClientDoc(clientId: string) {
  await ensureAnonymousSession();
  const orphaned = await getDocs(query(collection(db, 'cellData'), where('clientId', '==', clientId)));
  await Promise.all(orphaned.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'clients', clientId));
}

// --- SÜTUNLAR ---
export function subscribeColumns(cb: (columns: TaskColumn[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'columns'), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<TaskColumn, 'id'>) }));
    list.sort((a, b) => a.order - b.order);
    cb(list);
  });
}

export async function addColumnDoc(title: string, type: ColumnType, order: number, statuses?: StatusOption[]) {
  await ensureAnonymousSession();
  await addDoc(collection(db, 'columns'), {
    title,
    type,
    order,
    ...(type === 'status' ? { statuses: statuses ?? [] } : {}),
  });
}

export async function deleteColumnDoc(columnId: string) {
  await ensureAnonymousSession();
  const orphaned = await getDocs(query(collection(db, 'cellData'), where('columnId', '==', columnId)));
  await Promise.all(orphaned.docs.map(d => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'columns', columnId));
}

// --- HÜCRELER (aya göre) ---
const cellDocId = (clientId: string, columnId: string, monthKey: string) => `${clientId}_${columnId}_${monthKey}`;

export function subscribeCellData(monthKey: string, cb: (data: Record<string, CellEntry>) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'cellData'), where('monthKey', '==', monthKey)), snap => {
    const data: Record<string, CellEntry> = {};
    snap.docs.forEach(d => {
      const v = d.data() as { clientId: string; columnId: string; value: string; updatedBy: string; updatedAt: number };
      data[`${v.clientId}::${v.columnId}`] = { value: v.value, updatedBy: v.updatedBy, updatedAt: v.updatedAt };
    });
    cb(data);
  });
}

export async function setCellValue(
  clientId: string,
  columnId: string,
  monthKey: string,
  value: string | null,
  updatedBy: string,
) {
  await ensureAnonymousSession();
  const ref = doc(db, 'cellData', cellDocId(clientId, columnId, monthKey));
  if (value === null) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { clientId, columnId, monthKey, value, updatedBy, updatedAt: Date.now() });
  }
}

// --- ORTAK NOTLAR ---
export function subscribeNotes(cb: (notes: SharedNote[]) => void): Unsubscribe {
  return onSnapshot(collection(db, 'notes'), snap => {
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SharedNote, 'id'>) }));
    list.sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

export async function addNoteDoc(content: string, createdBy: string, urgency: NoteUrgency) {
  await ensureAnonymousSession();
  await addDoc(collection(db, 'notes'), {
    content,
    createdBy,
    urgency,
    monthYear: new Date().toISOString().slice(0, 7),
    createdAt: Date.now(),
    isDeleted: false,
  });
}

export async function deleteNoteDoc(noteId: string) {
  await ensureAnonymousSession();
  await deleteDoc(doc(db, 'notes', noteId));
}
