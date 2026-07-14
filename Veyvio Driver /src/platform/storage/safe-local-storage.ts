import type { StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export function safeLocalStorage(): StateStorage {
  if (typeof window === "undefined") return noopStorage;
  return window.localStorage;
}
