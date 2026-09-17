"use client";

import { LogIn, LogOut, ShoppingBasket } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState, Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { useCustomer } from "@/hooks/useCustomer";
import { orderService } from "@/services";
import { useSession } from "@/state/SessionProvider";
import { AddressList } from "./AddressList";
import { OrderHistoryList } from "./OrderHistoryList";
import { ProfileCard } from "./ProfileCard";

export function AccountDashboard() {
  const router = useRouter();
  const session = useSession();
  const customer = useCustomer();
  const orders = useAsync(() => orderService.getCustomerOrders(), `orders:${customer.customerId}`, {
    enabled: customer.isSignedIn,
  });

  const signOut = async () => {
    await session.signOut();
    router.push("/");
  };

  if (!customer.sessionReady) return <LoadingState title="Loading your account…" className="py-24" />;

  if (!customer.isSignedIn) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          className="rounded-[32px] border border-line bg-white py-14 shadow-card"
          tone="brand"
          icon={<LogIn />}
          title="Log in to see your account"
          description="View past orders, manage saved addresses and reorder your usual in one tap."
          actions={
            <>
              <ButtonLink href="/login?next=/account">Log in</ButtonLink>
              <ButtonLink href="/track" variant="outline">
                Track an order instead
              </ButtonLink>
            </>
          }
        />
      </Container>
    );
  }

  if (customer.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState
          title="We couldn't load your account"
          message={customer.error ?? ""}
          onRetry={customer.reload}
          actions={
            <Button variant="outline" onClick={() => void signOut()}>
              Log in again
            </Button>
          }
        />
      </Container>
    );
  }

  if (customer.status !== "success" || !customer.data) return <LoadingState title="Loading your account…" className="py-24" />;

  const profile = customer.data;

  return (
    <Container className="pb-20 pt-10 sm:pt-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">My account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-ink-950 sm:text-4xl">
            Hi, {profile.name.split(" ")[0]}
          </h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/book">Book a pickup</ButtonLink>
          <Button variant="outline" onClick={() => void signOut()} leadingIcon={<LogOut className="size-4" aria-hidden="true" />}>
            Log out
          </Button>
        </div>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          {orders.status === "loading" || orders.status === "idle" ? (
            <div className="space-y-3" role="status" aria-label="Loading orders">
              <Skeleton className="h-6 w-40" />
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-44 rounded-3xl" />
              ))}
            </div>
          ) : orders.status === "error" ? (
            <ErrorState inline title="Couldn't load your orders" message={orders.error ?? ""} onRetry={orders.reload} />
          ) : orders.data && orders.data.length > 0 ? (
            <OrderHistoryList orders={orders.data} />
          ) : (
            <EmptyState
              className="rounded-3xl border border-dashed border-ink-200 bg-white"
              icon={<ShoppingBasket />}
              title="No orders yet"
              description="Your first pickup is two minutes away. We'll keep every order here so you can track and reorder."
              actions={<ButtonLink href="/book">Book your first pickup</ButtonLink>}
            />
          )}
        </div>

        <aside className="space-y-6" aria-label="Profile and addresses">
          <ProfileCard
            customer={profile}
            onUpdated={(updated) => customer.setData(updated)}
          />
          <AddressList
            addresses={profile.addresses}
            onChange={(addresses) => customer.setData({ ...profile, addresses })}
          />
        </aside>
      </div>
    </Container>
  );
}
