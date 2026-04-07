import React from "react";

/**
 * Konekt Logo Concepts Preview Page
 * Shows 3 logo concepts at multiple sizes for review
 */

/* ─── CONCEPT 1: Connected Triad ─── */
function TriadIcon({ size = 40, color1 = "#20364D", accent = "#D4A843" }) {
  const s = size;
  const r = s * 0.12;
  const rAccent = s * 0.14;
  const sw = Math.max(1.5, s * 0.05);
  // Equilateral triangle vertices
  const cx = s / 2, top = s * 0.15, bot = s * 0.78;
  const left = s * 0.12, right = s * 0.88;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <line x1={cx} y1={top} x2={left} y2={bot} stroke={color1} strokeWidth={sw} strokeLinecap="round" />
      <line x1={cx} y1={top} x2={right} y2={bot} stroke={color1} strokeWidth={sw} strokeLinecap="round" />
      <line x1={left} y1={bot} x2={right} y2={bot} stroke={color1} strokeWidth={sw} strokeLinecap="round" />
      <circle cx={cx} cy={top} r={rAccent} fill={accent} />
      <circle cx={left} cy={bot} r={r} fill={color1} />
      <circle cx={right} cy={bot} r={r} fill={color1} />
    </svg>
  );
}

function TriadFull({ height = 48, dark = false }) {
  const bg = dark ? "#20364D" : "transparent";
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const accent = "#D4A843";
  const iconSize = height * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.2, background: bg, padding: dark ? "8px 16px" : 0, borderRadius: 8 }}>
      <TriadIcon size={iconSize} color1={dark ? "#FFFFFF" : "#20364D"} accent={accent} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: height * 0.42, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Konekt</span>
        <span style={{ fontSize: height * 0.17, fontWeight: 400, color: dark ? "rgba(255,255,255,0.7)" : "#64748b", fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "0.04em", lineHeight: 1.2 }}>Business Procurement Simplified</span>
      </div>
    </div>
  );
}

function TriadSecondary({ height = 40, dark = false }) {
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const iconSize = height * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.2, background: dark ? "#20364D" : "transparent", padding: dark ? "6px 12px" : 0, borderRadius: 8 }}>
      <TriadIcon size={iconSize} color1={dark ? "#FFFFFF" : "#20364D"} accent="#D4A843" />
      <span style={{ fontSize: height * 0.45, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "-0.02em" }}>Konekt</span>
    </div>
  );
}

/* ─── CONCEPT 2: Flow Chain ─── */
function FlowIcon({ size = 40, color1 = "#20364D", accent = "#D4A843" }) {
  const s = size;
  const r = s * 0.1;
  const rCenter = s * 0.14;
  const sw = Math.max(1.5, s * 0.05);
  const cx = s / 2, cy = s / 2;
  const leftX = s * 0.12, rightX = s * 0.88;
  const leftY = s * 0.58, rightY = s * 0.42;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <path d={`M${leftX},${leftY} C${s * 0.3},${s * 0.3} ${s * 0.35},${cy} ${cx},${cy}`} stroke={color1} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <path d={`M${cx},${cy} C${s * 0.65},${cy} ${s * 0.7},${s * 0.7} ${rightX},${rightY}`} stroke={color1} strokeWidth={sw} strokeLinecap="round" fill="none" />
      <circle cx={leftX} cy={leftY} r={r} fill={color1} />
      <circle cx={cx} cy={cy} r={rCenter} fill={accent} />
      <circle cx={rightX} cy={rightY} r={r} fill={color1} />
    </svg>
  );
}

function FlowFull({ height = 48, dark = false }) {
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const iconSize = height * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.2, background: dark ? "#20364D" : "transparent", padding: dark ? "8px 16px" : 0, borderRadius: 8 }}>
      <FlowIcon size={iconSize} color1={dark ? "#FFFFFF" : "#20364D"} accent="#D4A843" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: height * 0.42, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Konekt</span>
        <span style={{ fontSize: height * 0.17, fontWeight: 400, color: dark ? "rgba(255,255,255,0.7)" : "#64748b", fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "0.04em", lineHeight: 1.2 }}>Business Procurement Simplified</span>
      </div>
    </div>
  );
}

function FlowSecondary({ height = 40, dark = false }) {
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const iconSize = height * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.2, background: dark ? "#20364D" : "transparent", padding: dark ? "6px 12px" : 0, borderRadius: 8 }}>
      <FlowIcon size={iconSize} color1={dark ? "#FFFFFF" : "#20364D"} accent="#D4A843" />
      <span style={{ fontSize: height * 0.45, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "-0.02em" }}>Konekt</span>
    </div>
  );
}

/* ─── CONCEPT 3: Hub & Spoke ─── */
function HubIcon({ size = 40, color1 = "#20364D", accent = "#D4A843" }) {
  const s = size;
  const cx = s / 2, cy = s / 2;
  const rHub = s * 0.16;
  const rNode = s * 0.08;
  const sw = Math.max(1.5, s * 0.04);
  const nodes = [
    { x: s * 0.18, y: s * 0.18 },
    { x: s * 0.82, y: s * 0.18 },
    { x: s * 0.15, y: s * 0.78 },
    { x: s * 0.85, y: s * 0.78 },
  ];
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      {nodes.map((n, i) => (
        <line key={i} x1={cx} y1={cy} x2={n.x} y2={n.y} stroke={color1} strokeWidth={sw} strokeLinecap="round" />
      ))}
      <circle cx={cx} cy={cy} r={rHub} fill={accent} />
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={rNode} fill={color1} />
      ))}
    </svg>
  );
}

function HubFull({ height = 48, dark = false }) {
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const iconSize = height * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.2, background: dark ? "#20364D" : "transparent", padding: dark ? "8px 16px" : 0, borderRadius: 8 }}>
      <HubIcon size={iconSize} color1={dark ? "#FFFFFF" : "#20364D"} accent="#D4A843" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: height * 0.42, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.1 }}>Konekt</span>
        <span style={{ fontSize: height * 0.17, fontWeight: 400, color: dark ? "rgba(255,255,255,0.7)" : "#64748b", fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "0.04em", lineHeight: 1.2 }}>Business Procurement Simplified</span>
      </div>
    </div>
  );
}

function HubSecondary({ height = 40, dark = false }) {
  const textColor = dark ? "#FFFFFF" : "#20364D";
  const iconSize = height * 0.85;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: height * 0.2, background: dark ? "#20364D" : "transparent", padding: dark ? "6px 12px" : 0, borderRadius: 8 }}>
      <HubIcon size={iconSize} color1={dark ? "#FFFFFF" : "#20364D"} accent="#D4A843" />
      <span style={{ fontSize: height * 0.45, fontWeight: 700, color: textColor, fontFamily: "'Inter', 'Segoe UI', sans-serif", letterSpacing: "-0.02em" }}>Konekt</span>
    </div>
  );
}

/* ─── SIZE TEST STRIP ─── */
function SizeStrip({ Icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, padding: "8px 0" }}>
      <span style={{ width: 60, fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{label}</span>
      {[16, 24, 32, 40, 48, 64].map(s => (
        <div key={s} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <Icon size={s} />
          <span style={{ fontSize: 9, color: "#94a3b8" }}>{s}px</span>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN PREVIEW PAGE ─── */
export default function LogoPreviewPage() {
  const sectionStyle = { marginBottom: 48, padding: "24px 32px", background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0" };
  const headingStyle = { fontSize: 18, fontWeight: 700, color: "#20364D", marginBottom: 16, fontFamily: "'Inter', sans-serif" };
  const subheadStyle = { fontSize: 13, fontWeight: 600, color: "#94a3b8", marginBottom: 8, fontFamily: "'Inter', sans-serif", textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "32px 48px", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "#20364D", marginBottom: 8 }}>Konekt Logo System — Concept Review</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>3 concepts × 3 versions (Full, Secondary, Icon) × 2 backgrounds (light, dark) × scale test</p>

      {/* ─── CONCEPT 1: CONNECTED TRIAD ─── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Concept 1 — Connected Triad</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Three nodes connected in a triangle. Top node (gold) = Konekt platform. Bottom nodes = Buyer + Supplier. Symbolizes triangular trust and interconnection.</p>

        <div style={subheadStyle}>Full Logo (icon + name + tagline)</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 20 }}>
          <TriadFull height={56} />
          <TriadFull height={56} dark />
        </div>

        <div style={subheadStyle}>Secondary Logo (icon + name)</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 20 }}>
          <TriadSecondary height={44} />
          <TriadSecondary height={44} dark />
        </div>

        <div style={subheadStyle}>Icon Only — Scale Test</div>
        <SizeStrip Icon={TriadIcon} label="Light" />
        <div style={{ background: "#20364D", borderRadius: 8, padding: "8px 0", marginBottom: 12 }}>
          <SizeStrip Icon={(props) => <TriadIcon {...props} color1="#FFFFFF" />} label="Dark" />
        </div>
      </div>

      {/* ─── CONCEPT 2: FLOW CHAIN ─── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Concept 2 — Flow Chain</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Three nodes in a flowing curve. Left = Order, Center (gold) = Konekt processes, Right = Fulfillment. Symbolizes movement and pipeline.</p>

        <div style={subheadStyle}>Full Logo (icon + name + tagline)</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 20 }}>
          <FlowFull height={56} />
          <FlowFull height={56} dark />
        </div>

        <div style={subheadStyle}>Secondary Logo (icon + name)</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 20 }}>
          <FlowSecondary height={44} />
          <FlowSecondary height={44} dark />
        </div>

        <div style={subheadStyle}>Icon Only — Scale Test</div>
        <SizeStrip Icon={FlowIcon} label="Light" />
        <div style={{ background: "#20364D", borderRadius: 8, padding: "8px 0", marginBottom: 12 }}>
          <SizeStrip Icon={(props) => <FlowIcon {...props} color1="#FFFFFF" />} label="Dark" />
        </div>
      </div>

      {/* ─── CONCEPT 3: HUB & SPOKE ─── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Concept 3 — Hub & Spoke</div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Central hub (gold) = Konekt. Four satellite nodes = Buyers, Suppliers, Partners, Sales. Symbolizes Konekt as the central commerce platform connecting all parties.</p>

        <div style={subheadStyle}>Full Logo (icon + name + tagline)</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 20 }}>
          <HubFull height={56} />
          <HubFull height={56} dark />
        </div>

        <div style={subheadStyle}>Secondary Logo (icon + name)</div>
        <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 20 }}>
          <HubSecondary height={44} />
          <HubSecondary height={44} dark />
        </div>

        <div style={subheadStyle}>Icon Only — Scale Test</div>
        <SizeStrip Icon={HubIcon} label="Light" />
        <div style={{ background: "#20364D", borderRadius: 8, padding: "8px 0", marginBottom: 12 }}>
          <SizeStrip Icon={(props) => <HubIcon {...props} color1="#FFFFFF" />} label="Dark" />
        </div>
      </div>

      {/* ─── NAVBAR SIMULATION ─── */}
      <div style={sectionStyle}>
        <div style={headingStyle}>Navbar Context Test</div>
        <div style={subheadStyle}>How each concept looks in a 64px navbar</div>

        {[["Triad", TriadSecondary], ["Flow", FlowSecondary], ["Hub", HubSecondary]].map(([label, Comp]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", height: 64, background: "#fff", borderBottom: "1px solid #e2e8f0", paddingLeft: 24, marginBottom: 8 }}>
            <Comp height={38} />
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 24, paddingRight: 24 }}>
              {["Products", "Services", "About"].map(t => (
                <span key={t} style={{ fontSize: 14, color: "#64748b", fontFamily: "'Inter', sans-serif" }}>{t}</span>
              ))}
            </div>
          </div>
        ))}

        <div style={subheadStyle}>Dark navbar variant</div>
        {[["Triad", TriadSecondary], ["Flow", FlowSecondary], ["Hub", HubSecondary]].map(([label, Comp]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", height: 64, background: "#20364D", paddingLeft: 24, marginBottom: 8, borderRadius: 8 }}>
            <Comp height={38} dark />
            <div style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 24, paddingRight: 24 }}>
              {["Products", "Services", "About"].map(t => (
                <span key={t} style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", fontFamily: "'Inter', sans-serif" }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
