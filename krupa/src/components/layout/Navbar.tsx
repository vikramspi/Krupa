"use client";

import { Menu, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { useSession } from "@/state/SessionProvider";
import { MobileNav, type NavLink } from "./MobileNav";

const baseLinks: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/track", label: "Track Order" },
];

function isActive(pathname: string, href: string) {
  if (href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Navbar() {
  const pathname = usePathname();
  const { customer } = useSession();
  const signedIn = !!customer;

  // Menu is "open for a given path", so navigating anywhere closes it without an effect.
  const [openOnPath, setOpenOnPath] = useState<string | null>(null);
  const menuOpen = openOnPath === pathname;
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accountLink: NavLink = signedIn ? { href: "/account", label: "My Account" } : { href: "/login", label: "Login" };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200",
          scrolled || menuOpen ? "border-line bg-canvas/90 backdrop-blur-md" : "border-transparent bg-canvas/0",
        )}
      >
        <Container className="flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <Logo />

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {baseLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(pathname, link.href) ? "page" : undefined}
                    className="rounded-full px-3.5 py-2 text-[15px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 aria-[current=page]:text-ink-900 aria-[current=page]:font-semibold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={accountLink.href}
              aria-current={isActive(pathname, accountLink.href) ? "page" : undefined}
              className="hidden items-center gap-2 rounded-full px-3.5 py-2 text-[15px] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900 lg:inline-flex"
            >
              {signedIn && <UserRound className="size-4" aria-hidden="true" />}
              {signedIn ? (customer?.name?.split(" ")[0] || "Account") : "Login"}
            </Link>
            <ButtonLink href="/book" size="sm">
              Book Pickup
            </ButtonLink>
            <button
              ref={menuButtonRef}
              type="button"
              className="-mr-2 flex size-11 items-center justify-center rounded-full text-ink-800 hover:bg-ink-100 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setOpenOnPath(menuOpen ? null : pathname)}
            >
              {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
            </button>
          </div>
        </Container>
      </header>

      {/* Outside <header>: its backdrop-filter would otherwise become the containing
          block for this fixed panel and squash it to the header's height. */}
      <MobileNav
        id="mobile-nav"
        open={menuOpen}
        links={[...baseLinks, accountLink]}
        isActive={(href) => isActive(pathname, href)}
        onClose={(restoreFocus) => {
          setOpenOnPath(null);
          if (restoreFocus) menuButtonRef.current?.focus();
        }}
      />
    </>
  );
}
