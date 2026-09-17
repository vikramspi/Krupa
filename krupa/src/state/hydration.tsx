"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useBookingStore } from "./bookingStore";

/**
 * Only the in-progress booking is persisted in the browser now (session storage, for
 * UX across refreshes). Identity lives in an httpOnly cookie and orders live in Postgres.
 */
const persistedStores = [useBookingStore];

function subscribe(onChange: () => void) {
  const unsubscribers = persistedStores.map((store) => store.persist.onFinishHydration(onChange));
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

const getSnapshot = () => persistedStores.every((store) => store.persist.hasHydrated());
const getServerSnapshot = () => false;

/** True once persisted client state has been restored. Always false during SSR. */
export function useStoresHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Mounted once in the root layout; restores persisted stores after hydration. */
export function StoreHydration() {
  useEffect(() => {
    persistedStores.forEach((store) => {
      if (!store.persist.hasHydrated()) void store.persist.rehydrate();
    });
  }, []);
  return null;
}
