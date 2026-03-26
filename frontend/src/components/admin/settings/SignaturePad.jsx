import React, { useRef, useEffect, useState, useCallback } from "react";

export default function SignaturePad({ onSave, existingUrl }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [savedUrl, setSavedUrl] = useState(existingUrl || null);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  useEffect(() => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";
  }, [getCtx]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    setDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasStrokes(false);
    setSavedUrl(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    setSavedUrl(url);
    if (onSave) onSave(url);
  };

  return (
    <div data-testid="signature-pad-container">
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          data-testid="signature-pad-canvas"
          className="w-full cursor-crosshair touch-none"
          style={{ height: "140px" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Draw your signature above</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearCanvas}
              data-testid="signature-pad-clear"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={saveSignature}
              disabled={!hasStrokes}
              data-testid="signature-pad-save"
              className="rounded-lg bg-[#20364D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1a2d40] disabled:opacity-40"
            >
              Save Signature
            </button>
          </div>
        </div>
      </div>
      {savedUrl && (
        <div className="mt-3 rounded-lg border border-dashed border-green-300 bg-green-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-green-600 mb-2">Saved Signature Preview</p>
          <img src={savedUrl} alt="Saved signature" className="h-12 object-contain" />
        </div>
      )}
    </div>
  );
}
