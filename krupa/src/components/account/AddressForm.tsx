"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import type { AddressLabel, SavedAddress, ServiceArea } from "@/types";

const LABELS: AddressLabel[] = ["Home", "Work", "Other"];

interface AddressFormProps {
  initial?: SavedAddress;
  areas: ServiceArea[];
  saving: boolean;
  error: string | null;
  onSave: (address: Omit<SavedAddress, "id"> & { id?: string }) => void;
  onCancel: () => void;
}

export function AddressForm({ initial, areas, saving, error, onSave, onCancel }: AddressFormProps) {
  const [label, setLabel] = useState<AddressLabel>(initial?.label ?? "Home");
  const [line1, setLine1] = useState(initial?.line1 ?? "");
  const [line2, setLine2] = useState(initial?.line2 ?? "");
  const [landmark, setLandmark] = useState(initial?.landmark ?? "");
  const [areaId, setAreaId] = useState(initial?.areaId ?? "");
  const [pincode, setPincode] = useState(initial?.pincode ?? "");
  const [errors, setErrors] = useState<Partial<Record<"line1" | "line2" | "area", string>>>({});

  const area = areas.find((a) => a.id === areaId);
  const zones = [...new Set(areas.map((a) => a.zone))];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (line1.trim().length < 3) nextErrors.line1 = "Enter flat or house number and building.";
    if (line2.trim().length < 3) nextErrors.line2 = "Enter street or road.";
    if (!area) nextErrors.area = "Choose your area.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !area) return;
    onSave({
      id: initial?.id,
      label,
      line1: line1.trim(),
      line2: line2.trim(),
      landmark: landmark.trim() || undefined,
      areaId: area.id,
      areaName: area.name,
      pincode: area.pincodes.includes(pincode) ? pincode : area.pincodes[0],
      city: area.city,
    });
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-canvas p-4">
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold text-ink-800">Label</legend>
        <div className="flex gap-2">
          {LABELS.map((option) => (
            <label
              key={option}
              className={cn(
                "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600",
                label === option ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-ink-700",
              )}
            >
              <input type="radio" name="address-label" value={option} checked={label === option} onChange={() => setLabel(option)} className="sr-only" />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
      <Input label="Flat / house no. & building" autoComplete="address-line1" value={line1} onChange={(e) => setLine1(e.target.value)} error={errors.line1} />
      <Input label="Street / road" autoComplete="address-line2" value={line2} onChange={(e) => setLine2(e.target.value)} error={errors.line2} />
      <Input label="Landmark" optional value={landmark} onChange={(e) => setLandmark(e.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Area"
          placeholder="Select area"
          value={areaId}
          onChange={(e) => {
            setAreaId(e.target.value);
            setPincode(areas.find((a) => a.id === e.target.value)?.pincodes[0] ?? "");
          }}
          groups={zones.map((zone) => ({
            label: zone,
            options: areas.filter((a) => a.zone === zone).map((a) => ({ value: a.id, label: a.name })),
          }))}
          error={errors.area}
          hint="Only areas we currently serve"
        />
        <Select
          label="Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          disabled={!area}
          placeholder={area ? undefined : "Choose area first"}
          options={(area?.pincodes ?? []).map((p) => ({ value: p, label: p }))}
        />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          {initial ? "Save address" : "Add address"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
