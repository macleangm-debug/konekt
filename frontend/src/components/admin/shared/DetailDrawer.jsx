import React from "react";
import StandardDrawerShell from "../../ui/StandardDrawerShell";

/**
 * DetailDrawer — Thin wrapper around StandardDrawerShell for backwards compatibility.
 * All admin detail drawers that imported this now get canonical behavior.
 */
export default function DetailDrawer({ open, onClose, title, subtitle, width = "xl", children, footer }) {
  const widthMap = {
    "max-w-sm": "sm",
    "max-w-md": "md",
    "max-w-lg": "lg",
    "max-w-xl": "xl",
    "max-w-2xl": "2xl",
  };
  const normalizedWidth = widthMap[width] || width;

  return (
    <StandardDrawerShell
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      width={normalizedWidth}
      footer={footer}
      testId="detail-drawer"
    >
      {children}
    </StandardDrawerShell>
  );
}
