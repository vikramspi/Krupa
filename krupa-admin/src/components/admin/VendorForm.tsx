"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { serviceAreas } from "@/data/areas";
import { SERVICE_OFFERINGS } from "@/data/services";
import { apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";
import type { AdminVendor } from "@/types";
import { PageHeader, Panel } from "./common";

interface FormState {
  name: string;
  contactPhone: string;
  coverageAreas: string[];
  services: string[];
  minHours: string;
  maxHours: string;
  rating: string;
  isActive: boolean;
  priceMultiplier: string;
  pickupFee: string;
  latitude: string;
  longitude: string;
  acceptsSameDay: boolean;
}

const fromVendor = (v?: AdminVendor): FormState => ({
  name: v?.name ?? "",
  contactPhone: v?.contactPhone ?? "",
  coverageAreas: v?.coverageAreas ?? [],
  services: v?.services ?? [],
  minHours: String(v?.turnaround.minHours ?? 24),
  maxHours: String(v?.turnaround.maxHours ?? 48),
  rating: v?.rating === null || v?.rating === undefined ? "" : String(v.rating),
  isActive: v?.isActive ?? true,
  priceMultiplier: String(v?.priceMultiplier ?? 1),
  pickupFee: String(v?.pickupFee ?? 49),
  latitude: v?.latitude === null || v?.latitude === undefined ? "" : String(v.latitude),
  longitude: v?.longitude === null || v?.longitude === undefined ? "" : String(v.longitude),
  acceptsSameDay: v?.acceptsSameDay ?? true,
});

const zones = [...new Set(serviceAreas.map((a) => a.zone))];

/** Add (no `vendor`) or edit a vendor. */
export function VendorForm({ vendor, onSaved }: { vendor?: AdminVendor; onSaved?: (vendor: AdminVendor) => void }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => fromVendor(vendor));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  };
  const toggle = (key: "coverageAreas" | "services", id: string) =>
    set(key, form[key].includes(id) ? form[key].filter((x) => x !== id) : [...form[key], id]);

  const areaNames = useMemo(() => new Map(serviceAreas.map((a) => [a.id, a.name])), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const numberOrNull = (value: string) => (value.trim() === "" ? null : Number(value));
    const body = {
      name: form.name,
      contactPhone: form.contactPhone.replace(/\D/g, "").slice(-10),
      coverageAreas: form.coverageAreas,
      services: form.services,
      turnaround: { minHours: Number(form.minHours), maxHours: Number(form.maxHours) },
      rating: numberOrNull(form.rating),
      isActive: form.isActive,
      priceMultiplier: Number(form.priceMultiplier),
      pickupFee: Number(form.pickupFee),
      latitude: numberOrNull(form.latitude),
      longitude: numberOrNull(form.longitude),
      acceptsSameDay: form.acceptsSameDay,
    };
    setSaving(true);
    try {
      if (vendor) {
        const res = await apiRequest<{ vendor: AdminVendor }>(`/api/admin/vendors/${vendor.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setForm(fromVendor(res.vendor));
        setSaved(true);
        onSaved?.(res.vendor);
      } else {
        const res = await apiRequest<{ vendor: AdminVendor }>("/api/admin/vendors", { method: "POST", body: JSON.stringify(body) });
        router.replace(`/vendors/${res.vendor.id}?created=1`);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      {!vendor && (
        <>
          <Link href="/vendors" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
            <ArrowLeft className="size-4" aria-hidden="true" /> Vendors
          </Link>
          <PageHeader title="Add vendor" description="After saving, add at least one partner login so the vendor can accept orders." />
        </>
      )}
      <div className="space-y-6">
        <Panel title="Basics">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Shop name" value={form.name} onChange={(e) => set("name", e.target.value)} />
            <Input label="Contact mobile (shown to customers)" type="tel" inputMode="numeric" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="98200 12345" />
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <Check label="Taking orders (off = paused, shown as 'at capacity')" checked={form.isActive} onChange={(v) => set("isActive", v)} />
            <Check label="Offers same-day pickup" checked={form.acceptsSameDay} onChange={(v) => set("acceptsSameDay", v)} />
          </div>
        </Panel>

        <Panel title={`Services · ${form.services.length} selected`}>
          <ChipGroup label="Services offered">
            {SERVICE_OFFERINGS.map((s) => (
              <Chip key={s.id} label={s.name} selected={form.services.includes(s.id)} onClick={() => toggle("services", s.id)} />
            ))}
          </ChipGroup>
        </Panel>

        <Panel
          title={`Coverage · ${form.coverageAreas.length} areas`}
          action={
            form.coverageAreas.length > 0 && (
              <button type="button" className="text-sm font-semibold text-ink-600 hover:underline" onClick={() => set("coverageAreas", [])}>
                Clear
              </button>
            )
          }
        >
          <div className="space-y-4">
            {zones.map((zone) => (
              <ChipGroup key={zone} label={zone}>
                {serviceAreas
                  .filter((a) => a.zone === zone)
                  .map((a) => (
                    <Chip key={a.id} label={a.coverage === "supported" ? a.name : `${a.name} (coming soon)`} selected={form.coverageAreas.includes(a.id)} onClick={() => toggle("coverageAreas", a.id)} />
                  ))}
              </ChipGroup>
            ))}
          </div>
          {form.coverageAreas.length > 0 && (
            <p className="mt-3 text-sm text-ink-500">Selected: {form.coverageAreas.map((id) => areaNames.get(id) ?? id).join(", ")}</p>
          )}
        </Panel>

        <Panel title="Pricing, speed & location">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Input label="Price multiplier" hint="1 = standard prices, 1.1 = 10% higher" inputMode="decimal" value={form.priceMultiplier} onChange={(e) => set("priceMultiplier", e.target.value)} />
            <Input label="Pickup fee (₹)" hint="Waived on orders over ₹499" inputMode="numeric" value={form.pickupFee} onChange={(e) => set("pickupFee", e.target.value)} />
            <Input label="Turnaround from (hours)" inputMode="numeric" value={form.minHours} onChange={(e) => set("minHours", e.target.value)} />
            <Input label="Turnaround up to (hours)" inputMode="numeric" value={form.maxHours} onChange={(e) => set("maxHours", e.target.value)} />
            <Input label="Starting rating (optional)" hint="Used until real reviews arrive. Blank = no stars." inputMode="decimal" value={form.rating} onChange={(e) => set("rating", e.target.value)} />
            <Input label="Latitude (optional)" hint="For distance, e.g. 19.1364" inputMode="decimal" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} />
            <Input label="Longitude (optional)" hint="e.g. 72.8296" inputMode="decimal" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} />
          </div>
        </Panel>

        {error && (
          <Alert tone="warning" title="Couldn't save" role="alert">
            {error}
          </Alert>
        )}
        {saved && (
          <Alert tone="success" title="Saved" role="status">
            Customers see the changes on their next search.
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="lg" loading={saving} loadingText="Saving…">
            {vendor ? "Save changes" : "Add vendor"}
          </Button>
          {!vendor && (
            <Link href="/vendors" className="inline-flex h-12 items-center px-4 text-[15px] font-semibold text-ink-600 hover:text-ink-900">
              Cancel
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[15px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-brand-600" />
      {label}
    </label>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-500">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium",
        selected ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white text-ink-700 hover:border-brand-300",
      )}
    >
      {label}
    </button>
  );
}
