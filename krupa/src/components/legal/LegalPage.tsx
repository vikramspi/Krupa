import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Container } from "@/components/ui/Container";
import { LEGAL_LAST_UPDATED, missingLegalDetails, siteConfig } from "@/lib/config";
import { formatPhone } from "@/lib/format";

/**
 * Inline marker for a fact only the business can supply. Renders visibly so an
 * unfinished policy can never be mistaken for a finished one.
 */
export function Todo({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[0.85em] font-semibold text-amber-900">
      [TO CONFIRM: {children}]
    </mark>
  );
}

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  const missing = missingLegalDetails();

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Legal</p>
      <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.1] tracking-[-0.035em] text-ink-950">{title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-500">{intro}</p>
      <p className="mt-4 text-sm text-ink-500">Last updated: {LEGAL_LAST_UPDATED}</p>

      {missing.length > 0 && (
        <Alert tone="warning" title="Not ready for launch yet" className="mt-8">
          This policy is complete in substance, but still needs the {missing.join(", ")} before it can be published as an
          official policy. Set the matching <code className="font-mono text-[0.9em]">NEXT_PUBLIC_*</code> variables (see
          <code className="font-mono text-[0.9em]"> .env.example</code>) and every highlighted gap below fills in
          automatically. A lawyer should review the final text.
        </Alert>
      )}

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-ink-700 [&_a]:font-semibold [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink-900 [&_li]:leading-relaxed [&_section]:space-y-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-bold text-ink-900">Contact us</h2>
        <p className="mt-2 text-[15px] text-ink-600">
          {siteConfig.legalEntity || <Todo>registered business name</Todo>}
          {", "}
          {siteConfig.legalAddress || <Todo>registered address</Todo>}
        </p>
        <p className="mt-2 text-[15px] text-ink-600">
          <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> ·{" "}
          <a href={`tel:+91${siteConfig.supportPhone}`}>{formatPhone(siteConfig.supportPhone)}</a> · {siteConfig.supportHours}
        </p>
      </div>
    </Container>
  );
}
