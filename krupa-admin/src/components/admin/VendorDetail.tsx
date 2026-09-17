"use client";

import { ArrowLeft, KeyRound, Mail, Smartphone, UserPlus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { AdminVendor, AdminVendorUser } from "@/types";
import { OrdersTable } from "./OrdersTable";
import { PageHeader, Panel } from "./common";
import { VendorForm } from "./VendorForm";

type Tab = "details" | "logins" | "orders";

export function VendorDetail({ id }: { id: string }) {
  const created = useSearchParams().get("created") === "1";
  const data = useAsync(() => apiRequest<{ vendor: AdminVendor; users: AdminVendorUser[] }>(`/api/admin/vendors/${id}`), `vendor:${id}`);
  const [tab, setTab] = useState<Tab>(created ? "logins" : "details");

  if (data.status === "error") return <ErrorState title="Couldn't load this vendor" message={data.error ?? ""} onRetry={data.reload} />;
  if (!data.data) return <LoadingState className="py-24" />;
  const { vendor, users } = data.data;

  return (
    <>
      <Link href="/vendors" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Vendors
      </Link>
      <PageHeader
        title={vendor.name}
        description={`${formatPhone(vendor.contactPhone)} · added ${formatDateTime(vendor.createdAt)}`}
        actions={<Badge tone={vendor.isActive ? "success" : "neutral"}>{vendor.isActive ? "Taking orders" : "Paused"}</Badge>}
      />
      {created && (
        <Alert tone="success" title="Vendor added" className="mb-4" role="status">
          Now add a partner login so they can accept orders in the partner portal.
        </Alert>
      )}
      <div role="tablist" aria-label="Vendor sections" className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl bg-ink-100 p-1.5">
        {(
          [
            ["details", "Details"],
            ["logins", `Logins (${users.length})`],
            ["orders", "Orders"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn("min-h-10 whitespace-nowrap rounded-xl px-4 text-sm font-semibold", tab === key ? "bg-white shadow-card" : "text-ink-600 hover:text-ink-900")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "details" && <VendorForm key={vendor.id} vendor={vendor} onSaved={data.reload} />}
      {tab === "logins" && <Logins vendor={vendor} users={users} onChanged={data.reload} />}
      {tab === "orders" && <OrdersTable fixed={{ vendor: vendor.id }} />}
    </>
  );
}

function Logins({ vendor, users, onChanged }: { vendor: AdminVendor; users: AdminVendorUser[]; onChanged: () => void }) {
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
      setNotice({ tone: "success", text: success });
      onChanged();
    } catch (err) {
      setNotice({ tone: "warning", text: getErrorMessage(err) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel title="Partner portal logins">
        <p className="mb-4 text-sm text-ink-500">
          A login with a mobile number signs in with an SMS code. A login with an email gets an invite to set a password. Disabling a login signs that person out immediately.
        </p>
        {notice && (
          <Alert tone={notice.tone} title={notice.tone === "success" ? "Done" : "Not done"} className="mb-4" role="status">
            {notice.text}
          </Alert>
        )}
        {users.length === 0 ? (
          <p className="rounded-2xl bg-sun-50 px-4 py-6 text-center text-[15px] text-sun-700">
            No logins yet — {vendor.name} can&apos;t accept orders until you add one.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {u.name} {!u.isActive && <Badge tone="neutral">Disabled</Badge>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-500">
                    {u.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Smartphone className="size-3.5" aria-hidden="true" /> {formatPhone(u.phone)}
                      </span>
                    )}
                    {u.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="size-3.5" aria-hidden="true" /> {u.email}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    {u.email && (u.hasPassword ? "Password set" : u.invitePending ? "Invite sent, not accepted yet" : "Invite expired — resend it")}
                    {u.email && " · "}
                    {u.lastLoginAt ? `Last login ${formatDateTime(u.lastLoginAt)}` : "Never logged in"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {u.email && u.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy === `invite:${u.id}`}
                      loadingText="Sending…"
                      leadingIcon={<KeyRound className="size-4" aria-hidden="true" />}
                      onClick={() => void run(`invite:${u.id}`, () => apiRequest(`/api/admin/vendor-users/${u.id}/invite`, { method: "POST" }), `Invite sent to ${u.email}.`)}
                    >
                      {u.hasPassword ? "Send password link" : "Resend invite"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={u.isActive ? "ghost" : "outline"}
                    loading={busy === `toggle:${u.id}`}
                    loadingText="Saving…"
                    onClick={() =>
                      void run(
                        `toggle:${u.id}`,
                        () => apiRequest(`/api/admin/vendor-users/${u.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !u.isActive }) }),
                        u.isActive ? `${u.name} can no longer log in.` : `${u.name} can log in again.`,
                      )
                    }
                  >
                    {u.isActive ? "Disable" : "Enable"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <AddLogin vendor={vendor} onAdded={(text) => { setNotice({ tone: "success", text }); onChanged(); }} />
    </div>
  );
}

function AddLogin({ vendor, onAdded }: { vendor: AdminVendor; onAdded: (text: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(vendor.contactPhone);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await apiRequest<{ user: AdminVendorUser; inviteSent: boolean }>(`/api/admin/vendors/${vendor.id}/users`, {
        method: "POST",
        body: JSON.stringify({ name, phone, email }),
      });
      onAdded(
        res.user.email
          ? res.inviteSent
            ? `Added ${res.user.name}. An invite was emailed to ${res.user.email}.`
            : `Added ${res.user.name}, but the invite email failed — use "Resend invite".`
          : `Added ${res.user.name}. They can log in with an SMS code on ${formatPhone(res.user.phone ?? "")}.`,
      );
      setName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Add a login">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Person's name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh (shop owner)" />
        <Input label="Mobile number (for SMS login)" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} optional />
        <Input label="Email (for password login)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} optional hint="They'll get an invite to set their own password." />
        {error && (
          <Alert tone="warning" title="Couldn't add the login" role="alert">
            {error}
          </Alert>
        )}
        <Button type="submit" fullWidth loading={saving} loadingText="Adding…" leadingIcon={<UserPlus className="size-4" aria-hidden="true" />}>
          Add login
        </Button>
      </form>
    </Panel>
  );
}
