/**
 * Client-safe storage for redux-persist.
 * Uses localStorage in the browser; no-ops on the server so we don't get
 * "redux-persist failed to create sync storage. falling back to noop storage."
 */

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const noop = (): Promise<void> => Promise.resolve();
const noopGet = (): Promise<null> => Promise.resolve(null);

export const persistStorage = {
  getItem: (key: string): Promise<string | null> => {
    const storage = getStorage();
    if (!storage) return noopGet();
    try {
      return Promise.resolve(storage.getItem(key));
    } catch {
      return noopGet();
    }
  },
  setItem: (key: string, value: string): Promise<void> => {
    const storage = getStorage();
    if (!storage) return noop();
    try {
      storage.setItem(key, value);
      return noop();
    } catch {
      return noop();
    }
  },
  removeItem: (key: string): Promise<void> => {
    const storage = getStorage();
    if (!storage) return noop();
    try {
      storage.removeItem(key);
      return noop();
    } catch {
      return noop();
    }
  },
};
