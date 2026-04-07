import React from "react";
import BrandLogo, { KonektTriadIcon } from "../components/branding/BrandLogo";

function SizeStrip({ variant = "dark" }) {
  const sizes = [16, 24, 32, 40, 48, 64];
  const isDark = variant === "light";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 28,
        padding: "12px 16px",
        background: isDark ? "#20364D" : "transparent",
        borderRadius: 10,
      }}
    >
      {sizes.map((s) => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <KonektTriadIcon size={s} variant={variant} />
          <span style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.5)" : "#94a3b8", fontFamily: "monospace" }}>{s}px</span>
        </div>
      ))}
    </div>
  );
}

function NavbarSim({ variant = "dark", logoSize = "lg" }) {
  const isDark = variant === "light";
  const bg = isDark ? "#20364D" : "#FFFFFF";
  const linkColor = isDark ? "rgba(255,255,255,0.7)" : "#64748b";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 64,
        background: bg,
        borderBottom: isDark ? "none" : "1px solid #e2e8f0",
        paddingLeft: 28,
        paddingRight: 28,
        borderRadius: isDark ? 10 : 0,
      }}
    >
      <BrandLogo size={logoSize} variant={variant} type="secondary" />
      <div style={{ flex: 1 }} />
      <div style={{ display: "flex", gap: 28 }}>
        {["Products", "Services", "About", "Contact"].map((t) => (
          <span key={t} style={{ fontSize: 14, fontWeight: 500, color: linkColor, fontFamily: "'Inter', sans-serif" }}>{t}</span>
        ))}
      </div>
      <div
        style={{
          marginLeft: 28,
          background: isDark ? "#D4A843" : "#20364D",
          color: isDark ? "#20364D" : "#fff",
          padding: "8px 20px",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Login
      </div>
    </div>
  );
}

function AuthSim() {
  return (
    <div style={{ display: "flex", height: 400, borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0" }}>
      <div style={{ flex: "0 0 45%", background: "#0E1A2B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <BrandLogo size="xl" variant="light" type="full" />
        <div style={{ marginTop: 32, padding: "12px 20px", background: "rgba(255,255,255,0.08)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Inter', sans-serif" }}>Trusted by 200+ businesses across East Africa</span>
        </div>
      </div>
      <div style={{ flex: 1, background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 48px" }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#20364D", fontFamily: "'Inter', sans-serif" }}>Sign in to your account</span>
        <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "'Inter', sans-serif", marginTop: 6 }}>Enter your credentials below</span>
        {["Email", "Password"].map((f) => (
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

export default function LogoPreviewPage() {
  const section = { marginBottom: 40, padding: "28px 36px", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" };
  const heading = { fontSize: 17, fontWeight: 700, color: "#20364D", marginBottom: 14, fontFamily: "'Inter', sans-serif" };
  const label = { fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 10, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "36px 48px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#20364D", marginBottom: 4 }}>Konekt Logo — Refined Connected Triad</h1>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 32 }}>Final: thicker connectors, stronger asymmetry, brighter dark-mode connectors, increased spacing</p>

      <div style={section}>
        <div style={heading}>Full Logo (icon + Konekt + tagline)</div>
        <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={label}>Light Background</div><BrandLogo size="xl" type="full" /></div>
          <div><div style={label}>Dark Background</div><div style={{ background: "#0E1A2B", padding: "16px 24px", borderRadius: 12 }}><BrandLogo size="xl" variant="light" type="full" /></div></div>
          <div><div style={label}>Alt Tagline</div><BrandLogo size="xl" type="full" tagline="Order. Quote. Pay. Fulfill." /></div>
        </div>
      </div>

      <div style={section}>
        <div style={heading}>Secondary Logo (icon + Konekt) — Navbar / Footer / Sidebar</div>
        <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
          <div><div style={label}>Light (md)</div><BrandLogo size="md" /></div>
          <div><div style={label}>Dark (md)</div><div style={{ background: "#20364D", padding: "12px 20px", borderRadius: 10 }}><BrandLogo size="md" variant="light" /></div></div>
          <div><div style={label}>Small (sm)</div><BrandLogo size="sm" /></div>
          <div><div style={label}>Large (lg)</div><BrandLogo size="lg" /></div>
          <div><div style={label}>XL</div><BrandLogo size="xl" /></div>
        </div>
      </div>

      <div style={section}>
        <div style={heading}>Icon Only — Scale Test (16px to 64px)</div>
        <div style={label}>Light Background</div>
        <SizeStrip variant="dark" />
        <div style={{ height: 16 }} />
        <div style={label}>Dark Background</div>
        <SizeStrip variant="light" />
      </div>

      <div style={section}>
        <div style={heading}>Navbar Context (64px height)</div>
        <div style={label}>Light Navbar</div>
        <NavbarSim variant="dark" />
        <div style={{ height: 12 }} />
        <div style={label}>Dark Navbar</div>
        <NavbarSim variant="light" />
      </div>

      <div style={section}>
        <div style={heading}>Auth Page Context (Login)</div>
        <AuthSim />
      </div>
    </div>
  );
}
