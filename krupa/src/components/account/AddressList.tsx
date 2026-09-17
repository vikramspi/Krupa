"use client";

import { Briefcase, Home, MapPin, Pencil, Plus, Trash2, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { getErrorMessage } from "@/lib/errors";
import { customerService, locationService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";
import type { AddressLabel, SavedAddress } from "@/types";
import { AddressForm } from "./AddressForm";

const labelIcon: Record<AddressLabel, typeof Home> = { Home, Work: Briefcase, Other: MapPin };

interface AddressListProps {
  addresses: SavedAddress[];
  onChange: (addresses: SavedAddress[]) => void;
}

export function AddressList({ addresses, onChange }: AddressListProps) {
  const router = useRouter();
  const setLocation = useBookingStore((s) => s.setLocation);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const areas = useAsync(() => locationService.getSupportedAreas(), "supported-areas", { enabled: editing !== null });

  const save = async (address: Omit<SavedAddress, "id"> & { id?: string }) => {
    setPendingId(address.id ?? "new");
    setSaveError(null);
    try {
      const saved = await customerService.saveAddress(address);
      onChange(address.id ? addresses.map((a) => (a.id === saved.id ? saved : a)) : [...addresses, saved]);
      setEditing(null);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setPendingId(null);
    }
  };

  const remove = async (addressId: string) => {
    setPendingId(addressId);
    setActionError(null);
    try {
      await customerService.deleteAddress(addressId);
      onChange(addresses.filter((a) => a.id !== addressId));
      setConfirmDeleteId(null);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setPendingId(null);
    }
  };

  const bookHere = async (address: SavedAddress) => {
    setPendingId(address.id);
    setActionError(null);
    try {
      const area = await locationService.getAreaById(address.areaId);
      setLocation(
        locationService.toBookingLocation(area, {
          source: "saved",
          savedAddressId: address.id,
          pincode: address.pincode,
          addressLine: `${address.line1}, ${address.line2}`,
        }),
      );
      router.push("/book/vendors");
    } catch (error) {
      setActionError(getErrorMessage(error));
      setPendingId(null);
    }
  };

  const renderForm = (initial?: SavedAddress) =>
    areas.status === "success" && areas.data ? (
      <AddressForm
        initial={initial}
        areas={areas.data}
        saving={pendingId === (initial?.id ?? "new")}
        error={saveError}
        onSave={save}
        onCancel={() => {
          setEditing(null);
          setSaveError(null);
        }}
      />
    ) : areas.status === "error" ? (
      <ErrorState inline title="Couldn't load areas" message={areas.error ?? ""} onRetry={areas.reload} />
    ) : (
      <Skeleton className="h-80 rounded-2xl" />
    );

  return (
    <Card as="section" aria-labelledby="addresses-title">
      <div className="flex items-center justify-between">
        <h2 id="addresses-title" className="font-bold text-ink-900">
          Saved addresses
        </h2>
        {editing === null && (
          <Button variant="ghost" size="sm" onClick={() => setEditing("new")} leadingIcon={<Plus className="size-4" aria-hidden="true" />}>
            Add
          </Button>
        )}
      </div>

      {actionError && <ErrorState inline className="mt-4" title="Something went wrong" message={actionError} />}

      {addresses.length === 0 && editing !== "new" && (
        <div className="mt-4 rounded-2xl border border-dashed border-ink-200 px-4 py-6 text-center">
          <MapPin className="mx-auto size-6 text-ink-300" aria-hidden="true" />
          <p className="mt-2 font-semibold text-ink-800">No saved addresses yet</p>
          <p className="mt-1 text-sm text-ink-500">Save your home or office for one-tap booking.</p>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {addresses.map((address) => {
          const Icon = labelIcon[address.label];
          if (editing === address.id) return <li key={address.id}>{renderForm(address)}</li>;
          return (
            <li key={address.id} className="rounded-2xl border border-line p-4">
              <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 text-[15px]">
                  <p className="font-semibold text-ink-900">{address.label}</p>
                  <address className="not-italic text-ink-600">
                    {address.line1}, {address.line2}
                    {address.landmark && `, ${address.landmark}`}
                    <span className="block text-sm text-ink-500">
                      {address.areaName}, {address.city} {address.pincode}
                    </span>
                  </address>
                </div>
              </div>

              {confirmDeleteId === address.id ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3" role="alertdialog" aria-label={`Delete ${address.label} address?`}>
                  <p className="mr-auto text-sm font-medium text-red-900">Delete this address?</p>
                  <Button size="sm" variant="danger" onClick={() => remove(address.id)} loading={pendingId === address.id}>
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1 pl-12">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => bookHere(address)}
                    loading={pendingId === address.id}
                    disabled={editing !== null}
                    leadingIcon={<Truck className="size-4" aria-hidden="true" />}
                  >
                    Book pickup here
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(address.id)}
                    disabled={editing !== null}
                    aria-label={`Edit ${address.label} address`}
                    leadingIcon={<Pencil className="size-4" aria-hidden="true" />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDeleteId(address.id)}
                    disabled={editing !== null}
                    aria-label={`Delete ${address.label} address`}
                    leadingIcon={<Trash2 className="size-4" aria-hidden="true" />}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </li>
          );
        })}
        {editing === "new" && <li>{renderForm()}</li>}
      </ul>
    </Card>
  );
}
