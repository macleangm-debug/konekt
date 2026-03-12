import React, { useEffect, useState } from "react";
import { FileText, ShoppingCart, Receipt, ArrowRight, Check, Clock, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/utils/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const stages = [
  { key: "quote", label: "Quote", icon: FileText, color: "blue" },
  { key: "order", label: "Order", icon: ShoppingCart, color: "purple" },
  { key: "invoice", label: "Invoice", icon: Receipt, color: "green" },
];

const stageColors = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700" },
};

export default function DocumentWorkflowPage() {
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [quotesRes, ordersRes, invoicesRes] = await Promise.all([
        api.get("/api/admin/quotes"),
        api.get("/api/admin/orders"),
        api.get("/api/admin/invoices"),
      ]);
      setQuotes(quotesRes.data || []);
      setOrders(ordersRes.data?.orders || ordersRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Build workflow chains - linking quotes to orders to invoices
  const workflowChains = React.useMemo(() => {
    const chains = [];

    // Start from quotes and build forward
    quotes.forEach((quote) => {
      const chain = {
        id: quote.id,
        customer_name: quote.customer_name,
        customer_company: quote.customer_company,
        total: quote.total,
        currency: quote.currency || "TZS",
        stages: {
          quote: {
            exists: true,
            document: quote,
            number: quote.quote_number,
            status: quote.status,
            date: quote.created_at?.split("T")[0],
          },
          order: { exists: false },
          invoice: { exists: false },
        },
      };

      // Find linked order
      if (quote.converted_order_number || quote.status === "converted") {
        const linkedOrder = orders.find(
          (o) => o.order_number === quote.converted_order_number || o.quote_id === quote.id
        );
        if (linkedOrder) {
          chain.stages.order = {
            exists: true,
            document: linkedOrder,
            number: linkedOrder.order_number,
            status: linkedOrder.status,
            date: linkedOrder.created_at?.split("T")[0],
          };

          // Find linked invoice
          const linkedInvoice = invoices.find(
            (i) => i.order_id === linkedOrder.id || i.order_number === linkedOrder.order_number
          );
          if (linkedInvoice) {
            chain.stages.invoice = {
              exists: true,
              document: linkedInvoice,
              number: linkedInvoice.invoice_number,
              status: linkedInvoice.status,
              date: linkedInvoice.created_at?.split("T")[0],
            };
          }
        }
      }

      chains.push(chain);
    });

    // Add standalone orders not linked to quotes
    orders.forEach((order) => {
      const hasQuote = chains.some((c) => c.stages.order.document?.id === order.id);
      if (!hasQuote && order.order_type !== "quote_converted") {
        const chain = {
          id: order.id,
          customer_name: order.customer_name || order.shipping_address?.name,
          customer_company: order.customer_company,
          total: order.total,
          currency: order.currency || "TZS",
          stages: {
            quote: { exists: false },
            order: {
              exists: true,
              document: order,
              number: order.order_number,
              status: order.status,
              date: order.created_at?.split("T")[0],
            },
            invoice: { exists: false },
          },
        };

        // Find linked invoice
        const linkedInvoice = invoices.find(
          (i) => i.order_id === order.id || i.order_number === order.order_number
        );
        if (linkedInvoice) {
          chain.stages.invoice = {
            exists: true,
            document: linkedInvoice,
            number: linkedInvoice.invoice_number,
            status: linkedInvoice.status,
            date: linkedInvoice.created_at?.split("T")[0],
          };
        }

        chains.push(chain);
      }
    });

    return chains;
  }, [quotes, orders, invoices]);

  const filteredChains = workflowChains.filter((chain) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      chain.customer_name?.toLowerCase().includes(term) ||
      chain.customer_company?.toLowerCase().includes(term) ||
      chain.stages.quote.number?.toLowerCase().includes(term) ||
      chain.stages.order.number?.toLowerCase().includes(term) ||
      chain.stages.invoice.number?.toLowerCase().includes(term)
    );
  });

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusIcon = (status) => {
    if (["approved", "completed", "paid", "converted", "ready_for_dispatch"].includes(status)) {
      return <Check className="w-4 h-4 text-green-600" />;
    }
    if (["pending", "draft", "sent", "in_production", "processing"].includes(status)) {
      return <Clock className="w-4 h-4 text-amber-600" />;
    }
    if (["rejected", "cancelled", "overdue"].includes(status)) {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const stats = React.useMemo(() => {
    const totalQuotes = quotes.length;
    const convertedQuotes = quotes.filter((q) => q.status === "converted").length;
    const totalOrders = orders.length;
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i) => i.status === "paid").length;
    return { totalQuotes, convertedQuotes, totalOrders, totalInvoices, paidInvoices };
  }, [quotes, orders, invoices]);

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen" data-testid="workflow-page">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="flex items-center">
              <FileText className="w-7 h-7 text-blue-600" />
              <ArrowRight className="w-5 h-5 text-slate-400 mx-1" />
              <ShoppingCart className="w-7 h-7 text-purple-600" />
              <ArrowRight className="w-5 h-5 text-slate-400 mx-1" />
              <Receipt className="w-7 h-7 text-green-600" />
            </div>
            <span className="ml-2">Document Workflow</span>
          </h1>
          <p className="text-slate-600 mt-1">
            Track the journey of documents from Quote → Order → Invoice
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4">
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4" data-testid="stat-quotes">
            <p className="text-sm text-blue-600">Quotes</p>
            <p className="text-2xl font-bold text-blue-700">{stats.totalQuotes}</p>
            <p className="text-xs text-blue-500 mt-1">{stats.convertedQuotes} converted</p>
          </div>
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-4" data-testid="stat-orders">
            <p className="text-sm text-purple-600">Orders</p>
            <p className="text-2xl font-bold text-purple-700">{stats.totalOrders}</p>
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-4" data-testid="stat-invoices">
            <p className="text-sm text-green-600">Invoices</p>
            <p className="text-2xl font-bold text-green-700">{stats.totalInvoices}</p>
            <p className="text-xs text-green-500 mt-1">{stats.paidInvoices} paid</p>
          </div>
          <div className="rounded-xl bg-white border p-4" data-testid="stat-conversion-rate">
            <p className="text-sm text-slate-500">Conversion Rate</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalQuotes > 0 ? Math.round((stats.convertedQuotes / stats.totalQuotes) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Quote → Order</p>
          </div>
          <div className="rounded-xl bg-white border p-4" data-testid="stat-payment-rate">
            <p className="text-sm text-slate-500">Payment Rate</p>
            <p className="text-2xl font-bold text-slate-900">
              {stats.totalInvoices > 0 ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100) : 0}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Invoice → Paid</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search by customer, quote #, order #, or invoice #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-md border border-slate-300 rounded-xl px-4 py-3"
            data-testid="search-workflow"
          />
        </div>

        {/* Workflow Legend */}
        <div className="flex items-center gap-6 px-4 py-3 bg-white rounded-xl border text-sm">
          <span className="text-slate-500 font-medium">Legend:</span>
          {stages.map((stage) => {
            const Icon = stage.icon;
            const colors = stageColors[stage.color];
            return (
              <div key={stage.key} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className={colors.text}>{stage.label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 ml-auto text-slate-400">
            <div className="w-8 h-1 bg-slate-300 rounded" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <div className="w-8 h-1 bg-green-500 rounded" />
            <span>Completed</span>
          </div>
        </div>

        {/* Workflow Chains */}
        <div className="space-y-4" data-testid="workflow-chains">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Loading workflow data...</div>
          ) : filteredChains.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No workflow chains found</div>
          ) : (
            filteredChains.map((chain) => {
              const isExpanded = expandedItems[chain.id];
              const completedStages = Object.values(chain.stages).filter((s) => s.exists).length;

              return (
                <div
                  key={chain.id}
                  className="rounded-2xl border bg-white overflow-hidden hover:shadow-md transition-shadow"
                  data-testid={`workflow-chain-${chain.id}`}
                >
                  {/* Chain Header */}
                  <div
                    className="p-5 cursor-pointer flex items-center gap-4"
                    onClick={() => toggleExpand(chain.id)}
                  >
                    {/* Progress Indicator */}
                    <div className="flex items-center gap-1">
                      {stages.map((stage, idx) => {
                        const stageData = chain.stages[stage.key];
                        const colors = stageColors[stage.color];
                        const Icon = stage.icon;
                        return (
                          <React.Fragment key={stage.key}>
                            <div
                              className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                                stageData.exists
                                  ? `${colors.bg} ${colors.border}`
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <Icon className={`w-5 h-5 ${stageData.exists ? colors.text : "text-slate-300"}`} />
                            </div>
                            {idx < stages.length - 1 && (
                              <div
                                className={`w-8 h-1 rounded ${
                                  stageData.exists && chain.stages[stages[idx + 1]?.key]?.exists
                                    ? "bg-green-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-lg truncate">{chain.customer_name}</div>
                      <div className="text-sm text-slate-500 truncate">{chain.customer_company || "—"}</div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="font-bold text-lg">{formatMoney(chain.total, chain.currency)}</div>
                      <div className="text-xs text-slate-400">{completedStages}/3 stages</div>
                    </div>

                    {/* Expand Icon */}
                    <Button variant="ghost" size="sm">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t">
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        {stages.map((stage) => {
                          const stageData = chain.stages[stage.key];
                          const colors = stageColors[stage.color];
                          const Icon = stage.icon;

                          return (
                            <div
                              key={stage.key}
                              className={`rounded-xl border-2 p-4 ${
                                stageData.exists ? `${colors.bg} ${colors.border}` : "bg-slate-50 border-slate-200 border-dashed"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-3">
                                <Icon className={`w-5 h-5 ${stageData.exists ? colors.text : "text-slate-400"}`} />
                                <span className={`font-semibold ${stageData.exists ? colors.text : "text-slate-400"}`}>
                                  {stage.label}
                                </span>
                              </div>

                              {stageData.exists ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <code className="text-sm font-mono">{stageData.number}</code>
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(stageData.status)}
                                      <Badge className={colors.badge}>{stageData.status}</Badge>
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-500">Created: {stageData.date}</div>
                                  <a
                                    href={`/admin/${stage.key === "quote" ? "quotes" : stage.key === "order" ? "orders" : "invoices"}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium hover:underline mt-2"
                                    style={{ color: colors.text.replace("text-", "") }}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View {stage.label}
                                  </a>
                                </div>
                              ) : (
                                <div className="text-center py-4 text-slate-400 text-sm">
                                  No {stage.label.toLowerCase()} yet
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
