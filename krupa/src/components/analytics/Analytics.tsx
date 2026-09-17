"use client";

import Script from "next/script";
import { analyticsConfig } from "@/lib/config";

/**
 * Loads GA4 / Google Ads (gtag) and the Meta Pixel — each only when its ID is set,
 * so no third-party script loads in development or in an unconfigured environment.
 */
export function Analytics() {
  const { ga4Id, googleAdsId, metaPixelId } = analyticsConfig;
  const gtagId = ga4Id || googleAdsId;

  return (
    <>
      {gtagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
${ga4Id ? `gtag('config', '${ga4Id}');` : ""}
${googleAdsId ? `gtag('config', '${googleAdsId}');` : ""}`}
          </Script>
        </>
      )}

      {metaPixelId && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaPixelId}');
fbq('track', 'PageView');`}
        </Script>
      )}
    </>
  );
}
