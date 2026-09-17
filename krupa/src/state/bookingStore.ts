"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { MAX_ITEM_QUANTITY } from "@/lib/limits";
import type {
  BookingLocation,
  HourRange,
  OrderLine,
  PickupSchedule,
  VendorCatalogItem,
} from "@/types";

export type QuantityUpdate = number | ((current: number) => number);

export type CartEntry = OrderLine;

/** Just enough vendor info to render summaries without refetching on every step. */
export interface SelectedVendor {
  id: string;
  name: string;
  /** Null when the partner has no rating yet. */
  rating: number | null;
  distanceKm: number | null;
  pickupFee: number;
  turnaroundHours: HourRange;
}

export interface CustomerDetailsDraft {
  /** Hidden anti-bot field; must stay empty. */
  honeypot?: string;
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  instructions: string;
  saveAddress: boolean;
}

interface BookingData {
  location: BookingLocation | null;
  /** Area for which the matching animation has already played this session. */
  matchedAreaId: string | null;
  vendor: SelectedVendor | null;
  cart: CartEntry[];
  pickup: PickupSchedule | null;
  details: CustomerDetailsDraft | null;
  /** Set when the flow was started from "Reorder". */
  reorderSourceId: string | null;
  /** Survives a flow reset so the confirmation page can show the order. */
  lastPlacedOrderId: string | null;
}

export interface ReorderInput {
  location: BookingLocation;
  /** `null` when the original partner can't take the order (e.g. at capacity). */
  vendor: SelectedVendor | null;
  cart: CartEntry[];
  details: CustomerDetailsDraft | null;
  sourceOrderId: string;
}

interface BookingActions {
  setLocation: (location: BookingLocation) => void;
  markMatched: (areaId: string) => void;
  selectVendor: (vendor: SelectedVendor) => void;
  /** An updater function reads the quantity at apply time, so rapid taps never use a stale value. */
  setQuantity: (item: Omit<CartEntry, "quantity">, quantity: QuantityUpdate) => void;
  /** Re-prices the cart for the current vendor; returns names of items that were removed. */
  syncCartWithCatalog: (items: VendorCatalogItem[]) => string[];
  clearCart: () => void;
  setPickup: (pickup: PickupSchedule) => void;
  setDetails: (details: CustomerDetailsDraft) => void;
  startReorder: (input: ReorderInput) => void;
  dismissReorderNotice: () => void;
  setLastPlacedOrder: (orderId: string) => void;
  /** Clears the in-progress booking but keeps `lastPlacedOrderId`. */
  resetFlow: () => void;
}

const initialData: BookingData = {
  location: null,
  matchedAreaId: null,
  vendor: null,
  cart: [],
  pickup: null,
  details: null,
  reorderSourceId: null,
  lastPlacedOrderId: null,
};

export { MAX_ITEM_QUANTITY };

export const useBookingStore = create<BookingData & BookingActions>()(
  persist(
    (set, get) => ({
      ...initialData,

      setLocation: (location) =>
        set((state) => {
          const areaChanged = state.location?.areaId !== location.areaId;
          return areaChanged
            ? { location, matchedAreaId: null, vendor: null, pickup: null }
            : { location };
        }),

      markMatched: (areaId) => set({ matchedAreaId: areaId }),

      selectVendor: (vendor) =>
        set((state) => (state.vendor?.id === vendor.id ? { vendor } : { vendor, pickup: null })),

      setQuantity: (item, quantity) =>
        set((state) => {
          const current = state.cart.find((entry) => entry.itemId === item.itemId)?.quantity ?? 0;
          const requested = typeof quantity === "function" ? quantity(current) : quantity;
          const qty = Math.max(0, Math.min(MAX_ITEM_QUANTITY, Math.round(requested)));
          const exists = state.cart.some((entry) => entry.itemId === item.itemId);
          if (qty === 0) return { cart: state.cart.filter((entry) => entry.itemId !== item.itemId) };
          if (exists) {
            return { cart: state.cart.map((entry) => (entry.itemId === item.itemId ? { ...entry, ...item, quantity: qty } : entry)) };
          }
          return { cart: [...state.cart, { ...item, quantity: qty }] };
        }),

      syncCartWithCatalog: (items) => {
        const byId = new Map(items.map((item) => [item.id, item]));
        const removed: string[] = [];
        const cart = get().cart.flatMap((entry) => {
          const item = byId.get(entry.itemId);
          if (!item || !item.available) {
            removed.push(entry.name);
            return [];
          }
          return [{ ...entry, name: item.name, unitPrice: item.price, category: item.category }];
        });
        set({ cart });
        return removed;
      },

      clearCart: () => set({ cart: [] }),
      setPickup: (pickup) => set({ pickup }),
      setDetails: (details) => set({ details }),

      startReorder: ({ location, vendor, cart, details, sourceOrderId }) =>
        set({
          ...initialData,
          lastPlacedOrderId: get().lastPlacedOrderId,
          location,
          // Skip the matching animation when we already know the partner.
          matchedAreaId: vendor ? location.areaId : null,
          vendor,
          cart,
          details,
          reorderSourceId: sourceOrderId,
        }),

      dismissReorderNotice: () => set({ reorderSourceId: null }),
      setLastPlacedOrder: (orderId) => set({ lastPlacedOrderId: orderId }),
      resetFlow: () => set({ ...initialData, lastPlacedOrderId: get().lastPlacedOrderId }),
    }),
    {
      name: "krupa.booking",
      storage: createJSONStorage(() => sessionStorage),
      // Rehydrated manually after mount (see StoreHydration) to avoid SSR hydration mismatches.
      skipHydration: true,
      version: 1,
    },
  ),
);
