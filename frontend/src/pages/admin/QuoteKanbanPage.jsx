import React, { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { adminApi } from "../../lib/adminApi";

const COLUMN_META = {
  draft: {
    title: "Draft",
    description: "Quotes being prepared",
    color: "bg-slate-100 border-slate-200",
    headerColor: "text-slate-700",
  },
  sent: {
    title: "Sent",
    description: "Waiting for customer response",
    color: "bg-blue-50 border-blue-200",
    headerColor: "text-blue-700",
  },
  approved: {
    title: "Approved",
    description: "Ready to convert into orders",
    color: "bg-emerald-50 border-emerald-200",
    headerColor: "text-emerald-700",
  },
  converted: {
    title: "Converted",
    description: "Already turned into orders",
    color: "bg-amber-50 border-amber-200",
    headerColor: "text-amber-700",
  },
};

const STATUS_OPTIONS = ["draft", "sent", "approved", "converted", "rejected", "expired"];
const KANBAN_COLUMNS = ["draft", "sent", "approved", "converted"];

function formatMoney(value, currency = "USD") {
  return `${currency} ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "-";
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case "draft":
      return "bg-slate-100 text-slate-700";
    case "sent":
      return "bg-blue-100 text-blue-700";
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "converted":
      return "bg-amber-100 text-amber-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    case "expired":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function QuoteCard({ quote, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: quote.id,
    data: {
      quote,
      currentStatus: quote.status,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(quote)}
      className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition cursor-grab active:cursor-grabbing"
      data-testid={`quote-card-${quote.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-sm">{quote.quote_number}</div>
          <div className="text-sm text-slate-600 mt-1">
            {quote.customer_name || "Unknown customer"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {quote.customer_company || "No company"}
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(quote.status)}`}>
          {quote.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-slate-500">Total</div>
          <div className="font-semibold">{formatMoney(quote.total, quote.currency)}</div>
        </div>
        <div>
          <div className="text-slate-500">Valid until</div>
          <div className="font-medium">{formatDate(quote.valid_until)}</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Created: {formatDate(quote.created_at)}
      </div>
    </div>
  );
}

function QuoteColumn({ columnKey, quotes, onOpen }) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnKey,
  });

  const meta = COLUMN_META[columnKey];

  return (
    <div
      ref={setNodeRef}
      className={`rounded-3xl border min-h-[640px] p-4 transition ${meta.color} ${
        isOver ? "ring-2 ring-[#D4A843]" : ""
      }`}
      data-testid={`kanban-column-${columnKey}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-bold ${meta.headerColor}`}>{meta.title}</h2>
          <p className="text-xs text-slate-500 mt-1">{meta.description}</p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">
          {quotes.length}
        </div>
      </div>

      <div className="space-y-4 mt-5">
        {quotes.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-5 text-sm text-slate-500">
            Drop quotes here
          </div>
        ) : (
          quotes.map((quote) => (
            <QuoteCard key={quote.id} quote={quote} onOpen={onOpen} />
          ))
        )}
      </div>
    </div>
  );
}

function QuoteDetailsDrawer({
  quote,
  onClose,
  onStatusChange,
  onConvert,
  onExport,
  onSend,
}) {
  if (!quote) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="quote-details-drawer">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl overflow-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-5 z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">{quote.quote_number}</h2>
              <p className="text-slate-600 mt-1">
                {quote.customer_name} - {quote.customer_company || "No company"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-4 py-2 text-sm"
              data-testid="close-drawer-btn"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-2xl border bg-slate-50 p-5">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Customer Name</div>
                <div className="font-medium">{quote.customer_name || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Customer Email</div>
                <div className="font-medium">{quote.customer_email || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Company</div>
                <div className="font-medium">{quote.customer_company || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Phone</div>
                <div className="font-medium">{quote.customer_phone || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="font-medium">{quote.status || "-"}</div>
              </div>
              <div>
                <div className="text-slate-500">Valid Until</div>
                <div className="font-medium">{formatDate(quote.valid_until)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-4">Description</th>
                    <th className="py-3 pr-4">Qty</th>
                    <th className="py-3 pr-4">Unit Price</th>
                    <th className="py-3 pr-4">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(quote.line_items || []).map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-3 pr-4">{item.description}</td>
                      <td className="py-3 pr-4">{item.quantity}</td>
                      <td className="py-3 pr-4">{formatMoney(item.unit_price, quote.currency)}</td>
                      <td className="py-3 pr-4 font-medium">{formatMoney(item.total, quote.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatMoney(quote.subtotal, quote.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span>{formatMoney(quote.tax, quote.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Discount</span>
                <span>{formatMoney(quote.discount, quote.currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatMoney(quote.total, quote.currency)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-5 space-y-4">
            <h3 className="text-lg font-semibold">Actions</h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <select
                className="border rounded-xl px-4 py-3"
                value={quote.status || "draft"}
                onChange={(e) => onStatusChange(quote.id, e.target.value)}
                data-testid="status-select"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => onConvert(quote.id)}
                className="rounded-xl bg-[#D4A843] text-slate-900 px-4 py-3 font-semibold disabled:opacity-50"
                disabled={quote.status === "converted"}
                data-testid="convert-to-order-btn"
              >
                Convert to Order
              </button>

              <button
                type="button"
                onClick={() => onExport(quote.id)}
                className="rounded-xl border px-4 py-3 font-medium"
                data-testid="export-pdf-btn"
              >
                Export PDF
              </button>

              <button
                type="button"
                onClick={() => onSend(quote.id)}
                className="rounded-xl bg-[#2D3E50] text-white px-4 py-3 font-medium"
                data-testid="send-quote-btn"
              >
                Send Quote
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-5">
            <h3 className="text-lg font-semibold">Notes</h3>
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
              {quote.notes || "No notes added."}
            </p>
          </div>

          <div className="rounded-2xl border p-5">
            <h3 className="text-lg font-semibold">Terms</h3>
            <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">
              {quote.terms || "No terms added."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuoteKanbanPage() {
  const [pipeline, setPipeline] = useState({
    columns: {
      draft: [],
      sent: [],
      approved: [],
      converted: [],
      other: [],
    },
    summary: {
      draft: 0,
      sent: 0,
      approved: 0,
      converted: 0,
      other: 0,
      total_value: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [search, setSearch] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getQuotePipeline();
      setPipeline(res.data);

      if (selectedQuote) {
        const all = [
          ...(res.data.columns.draft || []),
          ...(res.data.columns.sent || []),
          ...(res.data.columns.approved || []),
          ...(res.data.columns.converted || []),
          ...(res.data.columns.other || []),
        ];
        const updated = all.find((q) => q.id === selectedQuote.id);
        setSelectedQuote(updated || null);
      }
    } catch (error) {
      console.error("Failed to load quote pipeline", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const allQuotesCount = useMemo(() => {
    return (
      pipeline.summary.draft +
      pipeline.summary.sent +
      pipeline.summary.approved +
      pipeline.summary.converted +
      pipeline.summary.other
    );
  }, [pipeline]);

  const filterQuotes = (quotes) => {
    const q = search.trim().toLowerCase();
    if (!q) return quotes;

    return quotes.filter((quote) =>
      [quote.quote_number, quote.customer_name, quote.customer_email, quote.customer_company]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!active || !over) return;

    const quote = active.data.current?.quote;
    const destinationStatus = over.id;

    if (!quote || !destinationStatus) return;
    if (quote.status === destinationStatus) return;

    try {
      await adminApi.moveQuoteToStage(quote.id, destinationStatus);
      await loadPipeline();
    } catch (error) {
      console.error("Failed to move quote", error);
    }
  };

  const handleStatusChange = async (quoteId, status) => {
    await adminApi.moveQuoteToStage(quoteId, status);
    await loadPipeline();
  };

  const handleConvert = async (quoteId) => {
    try {
      await adminApi.convertQuoteToOrder(quoteId);
      await loadPipeline();
      alert("Quote converted to order");
    } catch (error) {
      console.error("Failed to convert quote", error);
      alert("Failed to convert quote. Make sure the quote is approved.");
    }
  };

  const handleExport = (quoteId) => {
    window.open(adminApi.downloadQuotePdf(quoteId), "_blank");
  };

  const handleSend = async (quoteId) => {
    try {
      await adminApi.sendQuoteDocument(quoteId);
      alert("Quote send action triggered");
    } catch (error) {
      console.error("Failed to send quote", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6" data-testid="kanban-loading">
        <div className="h-10 bg-slate-200 rounded w-72 animate-pulse" />
        <div className="grid xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="rounded-3xl border bg-white p-4 min-h-[500px] animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-24" />
              <div className="h-4 bg-slate-100 rounded w-32 mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quote-kanban-page">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Quote Pipeline</h1>
          <p className="mt-2 text-slate-600">
            Track deals visually from draft to conversion and keep sales moving.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white border p-4 min-w-[140px]">
            <div className="text-sm text-slate-500">All Quotes</div>
            <div className="text-2xl font-bold mt-1" data-testid="total-quotes-count">{allQuotesCount}</div>
          </div>
          <div className="rounded-2xl bg-white border p-4 min-w-[140px]">
            <div className="text-sm text-slate-500">Draft</div>
            <div className="text-2xl font-bold mt-1">{pipeline.summary.draft}</div>
          </div>
          <div className="rounded-2xl bg-white border p-4 min-w-[140px]">
            <div className="text-sm text-slate-500">Approved</div>
            <div className="text-2xl font-bold mt-1">{pipeline.summary.approved}</div>
          </div>
          <div className="rounded-2xl bg-white border p-4 min-w-[160px]">
            <div className="text-sm text-slate-500">Total Value</div>
            <div className="text-2xl font-bold mt-1" data-testid="total-value">{formatMoney(pipeline.summary.total_value)}</div>
          </div>
        </div>
      </div>

      <div className="max-w-md">
        <input
          className="w-full rounded-2xl border bg-white px-4 py-3"
          placeholder="Search by quote number, customer or company"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-testid="kanban-search-input"
        />
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid xl:grid-cols-4 gap-6">
          {KANBAN_COLUMNS.map((columnKey) => (
            <QuoteColumn
              key={columnKey}
              columnKey={columnKey}
              quotes={filterQuotes(pipeline.columns[columnKey] || [])}
              onOpen={setSelectedQuote}
            />
          ))}
        </div>
      </DndContext>

      {(pipeline.columns.other || []).length > 0 && (
        <div className="rounded-3xl border bg-white p-6">
          <h2 className="text-xl font-bold">Other Quote States</h2>
          <p className="text-slate-600 mt-2">
            Quotes marked as rejected, expired, or using non-pipeline statuses.
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
            {filterQuotes(pipeline.columns.other || []).map((quote) => (
              <QuoteCard key={quote.id} quote={quote} onOpen={setSelectedQuote} />
            ))}
          </div>
        </div>
      )}

      <QuoteDetailsDrawer
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        onStatusChange={handleStatusChange}
        onConvert={handleConvert}
        onExport={handleExport}
        onSend={handleSend}
      />
    </div>
  );
}
