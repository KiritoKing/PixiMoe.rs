import {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client";
import { Store } from "@tauri-apps/plugin-store";

export function createTauriPersister(): Persister {
  let store: Store | null = null;

  const getStore = async () => {
    if (!store) {
      store = await Store.load("query-cache.dat");
    }
    return store;
  };

  return {
    persistClient: async (client: PersistedClient) => {
      const s = await getStore();
      await s.set("query-cache", client);
      await s.save();
    },
    restoreClient: async () => {
      const s = await getStore();
      const cached = await s.get<PersistedClient>("query-cache");
      return cached || undefined;
    },
    removeClient: async () => {
      const s = await getStore();
      await s.delete("query-cache");
      await s.save();
    },
  };
}
