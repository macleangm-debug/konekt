import React, { useState } from "react";
import { QrCode, Download, Copy, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "";

/**
 * QrCodeButton — reusable QR trigger with popup modal.
 *
 * Props:
 *   kind: "product" | "group_deal" | "promo_campaign" | "content_post"
 *   id:   entity id
 *   label?: text on the trigger (default "QR")
 *   size?: "sm" | "default"
 */
export default function QrCodeButton({ kind, id, label = "QR", size = "sm", ref = "" }) {
  const [open, setOpen] = useState(false);
  if (!kind || !id) return null;

  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const imageUrl = `${API}/api/qr/${kind}/${id}.png${refQuery}`;
  const targetPath = ({
    product: `/shop/product/${id}`,
    group_deal: `/group-deals/${id}`,
    promo_campaign: `/promo/${id}`,
    content_post: `/content/${id}`,
  }[kind] || "") + (ref ? `?ref=${ref}` : "");

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)} data-testid={`qr-btn-${kind}-${id}`}>
        <QrCode className="w-3.5 h-3.5 mr-1" /> {label}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)} data-testid="qr-modal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#20364D]">QR Code · {kind.replace("_", " ")}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-center">
              <img src={imageUrl} alt="QR" className="w-52 h-52" data-testid="qr-image" />
            </div>
            <div className="mt-3 text-[11px] text-slate-500 break-all" data-testid="qr-target-path">{targetPath}</div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a href={imageUrl} download={`konekt-qr-${kind}-${id}.png`} className="col-span-1" data-testid="qr-download">
                <Button size="sm" variant="outline" className="w-full">
                  <Download className="w-3.5 h-3.5 mr-1" /> PNG
                </Button>
              </a>
              <Button size="sm" variant="outline" onClick={() => copy(imageUrl)} data-testid="qr-copy-image">
                <Copy className="w-3.5 h-3.5 mr-1" /> Image URL
              </Button>
              <Button size="sm" variant="outline" onClick={() => copy(targetPath)} data-testid="qr-copy-target">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Link
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
