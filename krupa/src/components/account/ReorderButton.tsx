"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";
import { locationService, serviceCatalog, vendorService } from "@/services";
import { useBookingStore, type CartEntry } from "@/state/bookingStore";
import type { Order } from "@/types";

interface ReorderButtonProps {
  order: Order;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * Starts a new booking pre-filled with a past order's partner, items and address.
 * Prices are refreshed to the partner's current rates; if the partner is at capacity,
 * the customer lands on partner selection with their items kept.
 */
export function ReorderButton({ order, variant = "primary", size = "sm", fullWidth }: ReorderButtonProps) {
  const router = useRouter();
  const startReorder = useBookingStore((s) => s.startReorder);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reorder = async () => {
    setPending(true);
    setError(null);
    try {
      const [area, vendor] = await Promise.all([
        locationService.getAreaById(order.address.areaId),
        vendorService.getVendorById(order.vendor.id),
      ]);
      const vendorAvailable = vendor.isActive;
      const catalog = vendorAvailable ? await serviceCatalog.getServices(vendor.id) : [];

      const cart: CartEntry[] = order.lines.flatMap((line) => {
        if (!vendorAvailable) return [line];
        const item = catalog.find((c) => c.id === line.itemId);
        return item?.available ? [{ ...line, unitPrice: item.price, name: item.name }] : [];
      });

      startReorder({
        sourceOrderId: order.id,
        location: locationService.toBookingLocation(area, {
          source: "search",
          pincode: order.address.pincode,
          addressLine: `${order.address.line1}, ${order.address.line2}`,
        }),
        vendor: vendorAvailable
          ? {
              id: vendor.id,
              name: vendor.name,
              rating: vendor.rating,
              distanceKm: null,
              pickupFee: vendor.pickupFee,
              turnaroundHours: vendor.turnaroundHours,
            }
          : null,
        cart,
        details: {
          name: order.contact.name,
          phone: order.contact.phone,
          email: order.contact.email ?? "",
          line1: order.address.line1,
          line2: order.address.line2,
          landmark: order.address.landmark ?? "",
          instructions: order.instructions ?? "",
          saveAddress: false,
        },
      });
      router.push(vendorAvailable ? "/book/services" : "/book/vendors");
    } catch (err) {
      setError(getErrorMessage(err));
      setPending(false);
    }
  };

  return (
    <div className={fullWidth ? "w-full" : undefined}>
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        onClick={reorder}
        loading={pending}
        loadingText="Preparing…"
        leadingIcon={<RotateCcw className="size-4" aria-hidden="true" />}
      >
        Reorder<span className="sr-only"> {order.id}</span>
      </Button>
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
