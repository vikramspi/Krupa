import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/AccountDashboard";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

export default function AccountPage() {
  return <AccountDashboard />;
}
