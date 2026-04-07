import React from "react";

/**
 * Refined Konekt Triad Logo — Final Concept
 * Asymmetric connected triad with intentional color hierarchy
 */

/* ─── REFINED TRIAD ICON ─── */
function KonektIcon({ size = 40, variant = "light" }) {
  const s = size;
  const dark = variant === "dark" || variant === "white";
  const nodeColor = dark ? "#FFFFFF" : "#20364D";
  const accentColor = "#D4A843";
  const connColor = dark ? "rgba(255,255,255,0.6)" : "rgba(32,54,77,0.45)";

  // Asymmetric node positions (NOT equilateral — intentionally offset)
  const topX = s * 0.54;     // Slightly right of center
  const topY = s * 0.13;
  const leftX = s * 0.12;
  const leftY = s * 0.82;
  const rightX = s * 0.90;
  const rightY = s * 0.72;   // Slightly higher than left — breaks symmetry

  // Node sizes — gold node is larger (visual anchor)
  const accentR = Math.max(2.5, s * 0.135);
  const nodeR = Math.max(2, s * 0.105);

  // Connector thickness — stays visible at 16px
  const sw = Math.max(1.8, s * 0.055);

  // Right connector has subtle outward curve for micro-distinction
  const rightMidX = (topX + rightX) / 2 + s * 0.06;
  const rightMidY = (topY + rightY) / 2 - s * 0.04;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Connectors (drawn first, behind nodes) */}
      {/* Left connector — straight */}
      <line x1={topX} y1={topY} x2={leftX} y2={leftY} stroke={connColor} strokeWidth={sw} strokeLinecap="round" />
      {/* Right connector — subtle curve */}
      <path d={`M${topX},${topY} Q${rightMidX},${rightMidY} ${rightX},${rightY}`} stroke={connColor} strokeWidth={sw} strokeLinecap="round" fill="none" />
      {/* Bottom connector — straight */}
      <line x1={leftX} y1={leftY} x2={rightX} y2={rightY} stroke={connColor} strokeWidth={sw} strokeLinecap="round" />

      {/* Nodes (drawn on top) */}
      <circle cx={topX} cy={topY} r={accentR} fill={accentColor} />
      <circle cx={leftX} cy={leftY} r={nodeR} fill={nodeColor} />
      <circle cx={rightX} cy={rightY} r={nodeR} fill={nodeColor} />
    </svg>
  );
}

/* ─── FULL LOGO (icon + Konekt + tagline) ─── */
function KonektLogoFull({ height = 48, variant = "light", tagline = "Business Procurement Simplified" }) {
  const dark = variant === "dark";
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const tagColor = dark ? "rgba(255,255,255,0.6)" : "#94a3b8";
  const iconSize = height * 0.88;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: height * 0.22, background: dark ? "#20364D" : "transparent", padding: dark ? `${height * 0.15}px ${height * 0.3}px` : 0, borderRadius: height * 0.16 }}>
      <KonektIcon size={iconSize} variant={variant} />
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <span style={{ fontSize: height * 0.4, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", letterSpacing: "-0.025em", lineHeight: 1.15 }}>Konekt</span>
        <span style={{ fontSize: Math.max(9, height * 0.165), fontWeight: 500, color: tagColor, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", letterSpacing: "0.02em", lineHeight: 1.3, marginTop: 1 }}>{tagline}</span>
      </div>
    </div>
  );
}

/* ─── SECONDARY LOGO (icon + Konekt) ─── */
function KonektLogoSecondary({ height = 40, variant = "light" }) {
  const dark = variant === "dark";
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const iconSize = height * 0.88;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: height * 0.2, background: dark ? "#20364D" : "transparent", padding: dark ? `${height * 0.12}px ${height * 0.25}px` : 0, borderRadius: height * 0.14 }}>
      <KonektIcon size={iconSize} variant={variant} />
      <span style={{ fontSize: height * 0.44, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", letterSpacing: "-0.025em" }}>Konekt</span>
    </div>
  );
}

/* ─── SIZE TEST STRIP ─── */
function SizeStrip({ variant = "light" }) {
  const sizes = [16, 24, 32, 40, 48, 64];
  const dark = variant === "dark";
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 28, padding: "12px 16px", background: dark ? "#20364D" : "transparent", borderRadius: 10 }}>
      {sizes.map(s => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <KonektIcon size={s} variant={variant} />
          <span style={{ fontSize: 10, color: dark ? "rgba(255,255,255,0.5)" : "#94a3b8", fontFamily: "monospace" }}>{s}px</span>
        </div>
      ))}
    </div>
  );
}

/* ─── NAVBAR SIMULATION ─── */
function NavbarSim({ variant = "light", logoHeight = 36 }) {
  const dark = variant === "dark";
  const bg = dark ? "#20364D" : "#FFFFFF";
  const linkColor = dark ? "rgba(255,255,255,0.7)" : "#64748b";
  return (
    <div style={{ display: "flex", alignItems: "center", height: 64, background: bg, borderBottom: dark ? "none" : "1px solid #e2e8f0", paddingLeft: 28, paddingRight: 28, borderRadius: dark ? 10 : 0 }}>
      <KonektLogoSecondary height={logoHeight} variant={variant} />
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 28 }}>
        {["Products", "Services", "About", "Contact"].map(t => (
          <span key={t} style={{ fontSize: 14, fontWeight: 500, color: linkColor, fontFamily: "'Inter', sans-serif" }}>{t}</span>
        ))}
      </div>
      <div style={{ marginLeft: 28, background: dark ? "#D4A843" : "#20364D", color: dark ? "#20364D" : "#fff", padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Login</div>
    </div>
  );
}

/* ─── AUTH PAGE SIMULATION ─── */
function AuthSim() {
  return (
    <div style={{ display: "flex", height: 400, borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      {/* Left branding panel */}
      <div style={{ flex: "0 0 45%", background: "#20364D", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <KonektIcon size={64} variant="dark" />
        <span style={{ fontSize: 28, fontWeight: 700, color: "#fff", fontFamily: "'Inter', sans-serif", marginTop: 16 }}>Konekt</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "'Inter', sans-serif", marginTop: 6 }}>Business Procurement Simplified</span>
        <div style={{ marginTop: 32, padding: "12px 20px", background: "rgba(255,255,255,0.08)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Trusted by 200+ businesses across East Africa</span>
        </div>
      </div>
      {/* Right form panel */}
      <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 48px" }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#20364D", fontFamily: "'Inter', sans-serif" }}>Sign in to your account</span>
        <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'Inter', sans-serif", marginTop: 6 }}>Enter your credentials below</span>
        {["Email", "Password"].map(f => (
          <div key={f} style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#64748b", marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>{f}</div>
            <div style={{ height: 44, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }} />
          </div>
        ))}
        <div style={{ marginTop: 20, height: 44, background: "#20364D", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "'Inter', sans-serif" }}>Sign In</span>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PREVIEW ─── */
export default function LogoPreviewPage() {
  const section = { marginBottom: 40, padding: "28px 36px", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" };
  const heading = { fontSize: 17, fontWeight: 700, color: "#20364D", marginBottom: 14, fontFamily: "'Inter', sans-serif" };
  const label = { fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 10, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "36px 48px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#20364D", marginBottom: 4 }}>Konekt Logo — Refined Connected Triad</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 32 }}>Asymmetric triangle + intentional color hierarchy + micro-distinction on right connector</p>

      {/* Full Logo */}
      <div style={section}>
        <div style={heading}>Full Logo (icon + Konekt + tagline)</div>
        <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={label}>Light Background</div><KonektLogoFull height={56} /></div>
          <div><div style={label}>Dark Background</div><KonektLogoFull height={56} variant="dark" /></div>
          <div><div style={label}>Alt Tagline</div><KonektLogoFull height={56} tagline="Order. Quote. Pay. Fulfill." /></div>
        </div>
      </div>

      {/* Secondary Logo */}
      <div style={section}>
        <div style={heading}>Secondary Logo (icon + Konekt)</div>
        <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={label}>Light</div><KonektLogoSecondary height={44} /></div>
          <div><div style={label}>Dark</div><KonektLogoSecondary height={44} variant="dark" /></div>
          <div><div style={label}>Small (32px)</div><KonektLogoSecondary height={32} /></div>
          <div><div style={label}>Large (56px)</div><KonektLogoSecondary height={56} /></div>
        </div>
      </div>

      {/* Icon Scale Test */}
      <div style={section}>
        <div style={heading}>Icon Only — Scale Test (16px → 64px)</div>
        <div style={label}>Light Background</div>
        <SizeStrip variant="light" />
        <div style={{ height: 16 }} />
        <div style={label}>Dark Background</div>
        <SizeStrip variant="dark" />
      </div>

      {/* Navbar Context */}
      <div style={section}>
        <div style={heading}>Navbar Context (64px height)</div>
        <div style={label}>Light Navbar</div>
        <NavbarSim variant="light" />
        <div style={{ height: 12 }} />
        <div style={label}>Dark Navbar</div>
        <NavbarSim variant="dark" />
      </div>

      {/* Auth Page Context */}
      <div style={section}>
        <div style={heading}>Auth Page Context (Login)</div>
        <AuthSim />
      </div>
    </div>
  );
}
