import type { Metadata } from "next";
import { BookingLayout } from "@/components/layout/BookingLayout";

export const metadata: Metadata = {
  title: "Book a pickup",
  robots: { index: false },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return <BookingLayout>{children}</BookingLayout>;
}
