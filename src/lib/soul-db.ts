'use client';

const DB_NAME = 'godlocal-soul';
const DB_VERSION = 1;
let _db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains('messages')) {
        const s = d.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
        s.createIndex('ts', 'ts');
      }
      if (!d.objectStoreNames.contains('soul')) d.createObjectStore('soul');
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings');
    };
    req.onsuccess = () => { _db = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

function r<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

export interface StoredMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  steps?: { tool: string; result: string }[];
  model?: string;
  ts: number;
  mode?: 'server' | 'sovereign';
}

export async function saveMessage(msg: Omit<StoredMessage, 'id'>): Promise<number> {
  const db = await openDB();
  return r(db.transaction('messages', 'readwrite').objectStore('messages').add(msg)) as Promise<number>;
}

export async function loadMessages(): Promise<StoredMessage[]> {
  try {
    const db = await openDB();
    return r<StoredMessage[]>(db.transaction('messages', 'readonly').objectStore('messages').getAll());
  } catch { return []; }
}

export async function clearMessages(): Promise<void> {
  const db = await openDB();
  await r(db.transaction('messages', 'readwrite').objectStore('messages').clear());
}

export async function loadSoul(): Promise<string> {
  try {
    const db = await openDB();
    return (await r<string>(db.transaction('soul', 'readonly').objectStore('soul').get('memory'))) ?? '';
  } catch { return ''; }
}

export async function saveSoul(memory: string): Promise<void> {
  const db = await openDB();
  await r(db.transaction('soul', 'readwrite').objectStore('soul').put(memory, 'memory'));
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return (await r<string>(db.transaction('settings', 'readonly').objectStore('settings').get(key))) ?? null;
  } catch { return null; }
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await openDB();
  await r(db.transaction('settings', 'readwrite').objectStore('settings').put(value, key));
}
