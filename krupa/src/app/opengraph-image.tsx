import { ImageResponse } from "next/og";

export const alt = "Krupa Laundry — laundry pickup and delivery in Mumbai";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social share card. Rendered at build time by next/og — no external image asset needed. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f7f6f2",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: "#117064" }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 800, color: "#141b27", letterSpacing: -1.5 }}>krupa</span>
            <span style={{ fontSize: 22, fontWeight: 600, color: "#117064", letterSpacing: 6 }}>LAUNDRY</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 68, fontWeight: 800, color: "#0b1019", lineHeight: 1.05, letterSpacing: -2.5 }}>
            Laundry picked up from
          </span>
          <span style={{ fontSize: 68, fontWeight: 800, color: "#0b1019", lineHeight: 1.05, letterSpacing: -2.5 }}>
            your doorstep.
          </span>
          <span style={{ fontSize: 30, color: "#435063", marginTop: 24 }}>
            Trusted local laundry partners across Mumbai · Transparent pricing · Track every step
          </span>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Wash & Fold", "Dry Cleaning", "Bedsheets & Linen", "24–48 hrs"].map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: 22,
                color: "#115a52",
                backgroundColor: "#d0eee8",
                padding: "10px 22px",
                borderRadius: 999,
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
