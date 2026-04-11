import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * StandardDrawerShell — Konekt canonical drawer component.
 * ALL drawers must use this shell for consistent UX.
 *
 * Renders via React Portal to break out of any parent overflow/transform constraints.
 * Full-viewport overlay. Full-height panel. Scrollable body. Sticky header + footer.
 *
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - title: string
 *  - subtitle?: string
 *  - badge?: ReactNode
 *  - width?: "sm" | "md" | "lg" | "xl" | "2xl" (default "lg")
 *  - children: ReactNode (scrollable body)
 *  - footer?: ReactNode (sticky footer with action buttons)
 *  - testId?: string
 */
export default function StandardDrawerShell({
  open,
  onClose,
  title,
  subtitle,
  badge,
  width = "lg",
  children,
  footer,
  testId = "standard-drawer",
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const widthMap = {
    sm: "384px",
    md: "448px",
    lg: "512px",
    xl: "576px",
    "2xl": "672px",
  };
  const panelWidth = widthMap[width] || widthMap.lg;

  const drawer = (
    <>
      {/* Backdrop — true full-viewport overlay */}
      <div
        className="k-backdrop-fade"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          backgroundColor: "rgba(32, 54, 77, 0.35)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
        onClick={onClose}
        data-testid={`${testId}-backdrop`}
      />
      {/* Panel — full viewport height, right-aligned */}
      <div
        className="k-drawer-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          width: "100%",
          maxWidth: panelWidth,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fff",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.12)",
        }}
        data-testid={testId}
      >
        {/* Header — fixed at top */}
        <div
          style={{
            flexShrink: 0,
            borderBottom: "1px solid #e2e8f0",
            padding: "16px 24px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            backgroundColor: "#fff",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            {subtitle && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", margin: 0 }}>{subtitle}</p>
                {badge}
              </div>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#20364D", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`${testId}-title`}>{title}</h2>
            {!subtitle && badge && <div style={{ marginTop: 4 }}>{badge}</div>}
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 12,
              flexShrink: 0,
              padding: 6,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#94a3b8",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f1f5f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            data-testid={`${testId}-close`}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Scrollable body — fills remaining space */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: 24,
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {/* Sticky footer — always visible at bottom */}
        {footer && (
          <div
            style={{
              flexShrink: 0,
              borderTop: "1px solid #e2e8f0",
              padding: "12px 24px",
              backgroundColor: "#fff",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );

  return createPortal(drawer, document.body);
}
