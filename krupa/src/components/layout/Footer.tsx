import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { siteConfig } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import { locationService } from "@/services";

const columns = [
  {
    title: "Laundry",
    links: [
      { href: "/book", label: "Book a pickup" },
      { href: "/services", label: "Services & pricing" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#service-area", label: "Check your area" },
    ],
  },
  {
    title: "Your orders",
    links: [
      { href: "/track", label: "Track an order" },
      { href: "/account", label: "My account" },
      { href: "/login", label: "Log in" },
    ],
  },
];

export async function Footer() {
  const popularAreas = await locationService.getPopularAreas();

  return (
    <footer className="border-t border-line bg-white">
      <Container className="grid gap-10 py-14 md:grid-cols-12 lg:py-16">
        <div className="md:col-span-4">
          <Logo />
          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-ink-500">
            Doorstep laundry pickup and delivery across {siteConfig.city}, handled by trusted local laundry partners.
          </p>
          <ul className="mt-6 space-y-2.5 text-[15px]">
            <li>
              <a href={`tel:+91${siteConfig.supportPhone}`} className="inline-flex items-center gap-2.5 font-medium text-ink-800 hover:text-brand-700">
                <Phone className="size-4 text-ink-400" aria-hidden="true" />
                {formatPhone(siteConfig.supportPhone)}
              </a>
            </li>
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className="inline-flex items-center gap-2.5 font-medium text-ink-800 hover:text-brand-700">
                <Mail className="size-4 text-ink-400" aria-hidden="true" />
                {siteConfig.supportEmail}
              </a>
            </li>
            <li className="pl-6.5 text-sm text-ink-500">{siteConfig.supportHours}</li>
          </ul>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title} className="md:col-span-2">
            <h2 className="font-mono text-[13px] text-ink-500">{column.title}</h2>
            <ul className="mt-3 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[15px] text-ink-500 transition-colors hover:text-ink-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div className="md:col-span-4">
          <h2 className="font-mono text-[13px] text-ink-500">Popular areas</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {popularAreas.map((area) => (
              <li key={area.id} className="rounded-lg border border-line px-2.5 py-1 text-sm text-ink-600">
                {area.name}
              </li>
            ))}
            <li>
              <Link href="/#service-area" className="inline-block rounded-lg px-2.5 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                + more areas
              </Link>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-line">
        <Container className="flex flex-col gap-3 py-6 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Krupa Laundry. All rights reserved.</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <li>
                <Link href="/privacy" className="transition-colors hover:text-ink-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="transition-colors hover:text-ink-900">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cancellation-and-refunds" className="transition-colors hover:text-ink-900">
                  Cancellation &amp; Refunds
                </Link>
              </li>
            </ul>
          </nav>
        </Container>
      </div>
    </footer>
  );
}
