import type { OnsiteDraftRecord } from "./onsiteDrafts";

const DB_NAME = "teamquo-onsite-drafts";
const STORE_NAME = "onsiteDrafts";
const DB_VERSION = 1;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable on this device"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "localOnsiteDraftId" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open onsite drafts database"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  runner: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
) {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
          reject(tx.error ?? new Error("Onsite draft transaction failed"));
          db.close();
        };
        tx.onabort = () => {
          reject(tx.error ?? new Error("Onsite draft transaction aborted"));
          db.close();
        };
        runner(store, resolve, reject);
      })
  );
}

export async function listOnsiteDrafts() {
  return withStore<OnsiteDraftRecord[]>("readonly", (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const drafts = (request.result as OnsiteDraftRecord[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      resolve(drafts);
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to load onsite drafts"));
  });
}

export async function getOnsiteDraft(localOnsiteDraftId: string) {
  return withStore<OnsiteDraftRecord | null>("readonly", (store, resolve, reject) => {
    const request = store.get(localOnsiteDraftId);
    request.onsuccess = () => resolve((request.result as OnsiteDraftRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Failed to load onsite draft"));
  });
}

export async function saveOnsiteDraft(record: OnsiteDraftRecord) {
  return withStore<OnsiteDraftRecord>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve(record);
    request.onerror = () => reject(request.error ?? new Error("Failed to save onsite draft"));
  });
}

export async function deleteOnsiteDraft(localOnsiteDraftId: string) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(localOnsiteDraftId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to delete onsite draft"));
  });
}

export async function importOnsiteDrafts(records: OnsiteDraftRecord[]) {
  return withStore<OnsiteDraftRecord[]>("readwrite", (store, resolve, reject) => {
    if (records.length === 0) {
      resolve([]);
      return;
    }

    let completed = 0;
    records.forEach(record => {
      const request = store.put(record);
      request.onsuccess = () => {
        completed += 1;
        if (completed === records.length) resolve(records);
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to import onsite drafts"));
    });
  });
}
