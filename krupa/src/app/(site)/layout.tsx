import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { BubbleField } from "@/components/marketing/BubbleField";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* Drifts across every page, above the content but untouchable, so a
          bubble can cross a card and still pop under the pointer. */}
      <BubbleField />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
