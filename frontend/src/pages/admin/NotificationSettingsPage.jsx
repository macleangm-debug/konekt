import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Bell, Mail, ToggleLeft, ToggleRight, RefreshCw, Send, FileText,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown, ChevronRight
} from "lucide-react";
import api from "../../utils/api";

const STATUS_BADGE = {
  sent: { cls: "bg-green-100 text-green-700", icon: CheckCircle2, label: "Sent" },
  dry_run: { cls: "bg-blue-100 text-blue-700", icon: Clock, label: "Dry Run" },
  skipped: { cls: "bg-slate-100 text-slate-500", icon: XCircle, label: "Skipped" },
  failed: { cls: "bg-red-100 text-red-700", icon: AlertCircle, label: "Failed" },
};

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState([]);
  const [provider, setProvider] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("triggers");
  const [testEvent, setTestEvent] = useState("customer_order_received");
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        api.get("/api/admin/notifications/settings"),
        api.get("/api/admin/notifications/logs?limit=20"),
      ]);
      setSettings(settingsRes.data?.settings || []);
      setProvider(settingsRes.data?.provider || {});
      setLogs(logsRes.data?.logs || []);
    } catch (e) {
      toast.error("Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleTrigger = async (event_key, currentEnabled) => {
    try {
      await api.put("/api/admin/notifications/settings/trigger", { event_key, enabled: !currentEnabled });
      setSettings(prev => prev.map(s => s.event_key === event_key ? { ...s, enabled: !currentEnabled } : s));
      toast.success(`Trigger ${!currentEnabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update trigger");
    }
  };

  const updateProvider = async (field, value) => {
    const updated = { ...provider, [field]: value };
    try {
      await api.put("/api/admin/notifications/settings/provider", updated);
      setProvider(updated);
      toast.success("Provider settings updated");
    } catch {
      toast.error("Failed to update provider");
    }
  };

  const sendTest = async () => {
    if (!testEmail) return toast.error("Enter a test email");
    setTestSending(true);
    try {
      const res = await api.post("/api/admin/notifications/test", {
        event_key: testEvent,
        recipient_email: testEmail,
      });
      const r = res.data?.dispatch_result || {};
      toast.success(`Test dispatch: ${r.status} — ${r.subject || ""}`);
      fetchAll();
    } catch {
      toast.error("Test dispatch failed");
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notification-settings-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#20364D] flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notification Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage email triggers, templates, and provider configuration.</p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg border hover:bg-slate-50" data-testid="refresh-btn">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: "triggers", label: "Triggers", icon: ToggleLeft },
          { key: "provider", label: "Email Provider", icon: Mail },
          { key: "test", label: "Test Dispatch", icon: Send },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition
              ${tab === t.key ? "border-[#D4A843] text-[#20364D]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
            data-testid={`tab-${t.key}`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Triggers */}
      {tab === "triggers" && (
        <div className="rounded-xl border bg-white divide-y" data-testid="triggers-list">
          {settings.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p>No triggers configured.</p>
              <button onClick={async () => {
                await api.post("/api/admin/notifications/settings/seed");
                fetchAll();
                toast.success("Defaults seeded");
              }} className="mt-3 text-sm font-semibold text-[#D4A843] hover:underline">
                Seed Defaults
              </button>
            </div>
          ) : (
            settings.map(s => (
              <div key={s.event_key} className="flex items-center justify-between px-5 py-4" data-testid={`trigger-${s.event_key}`}>
                <div>
                  <p className="font-medium text-[#20364D] text-sm">{s.label || s.event_key}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className="uppercase tracking-wide">{s.audience}</span> · {s.channel} · <code className="text-[10px]">{s.event_key}</code>
                  </p>
                </div>
                <button onClick={() => toggleTrigger(s.event_key, s.enabled)}
                  className="flex-shrink-0" data-testid={`toggle-${s.event_key}`}>
                  {s.enabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Provider */}
      {tab === "provider" && (
        <div className="rounded-xl border bg-white p-6 space-y-5" data-testid="provider-settings">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${provider.enabled ? "bg-green-500" : "bg-slate-300"}`} />
            <span className="font-medium text-sm text-[#20364D]">Email Provider: <strong className="uppercase">{provider.email_provider || "resend"}</strong></span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sender Name</label>
              <input type="text" value={provider.sender_name || ""} onChange={e => setProvider(p => ({...p, sender_name: e.target.value}))}
                onBlur={e => updateProvider("sender_name", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" data-testid="sender-name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Sender Email</label>
              <input type="email" value={provider.sender_email || ""} onChange={e => setProvider(p => ({...p, sender_email: e.target.value}))}
                onBlur={e => updateProvider("sender_email", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" data-testid="sender-email" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={provider.enabled || false} onChange={e => updateProvider("enabled", e.target.checked)}
                className="rounded" data-testid="provider-enabled" />
              <span className="text-sm font-medium">Enable Email Sending</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={provider.dry_run || false} onChange={e => updateProvider("dry_run", e.target.checked)}
                className="rounded" data-testid="provider-dryrun" />
              <span className="text-sm font-medium">Dry Run Mode</span>
            </label>
          </div>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            <strong>API Key:</strong> {provider.api_key_configured ? "Configured in environment" : "Not set — add RESEND_API_KEY to backend .env"}
          </div>
        </div>
      )}

      {/* Test */}
      {tab === "test" && (
        <div className="rounded-xl border bg-white p-6 space-y-4" data-testid="test-dispatch">
          <h2 className="font-bold text-[#20364D] flex items-center gap-2"><Send className="w-4 h-4" /> Send Test Notification</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Event</label>
              <select value={testEvent} onChange={e => setTestEvent(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" data-testid="test-event">
                {settings.map(s => <option key={s.event_key} value={s.event_key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Recipient Email</label>
              <input type="email" value={testEmail} onChange={e => setTestEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="test@example.com" data-testid="test-email" />
            </div>
          </div>
          <button onClick={sendTest} disabled={testSending}
            className="rounded-lg bg-[#20364D] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#17283c] transition disabled:opacity-50 flex items-center gap-2"
            data-testid="send-test-btn">
            {testSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>
        </div>
      )}

      {/* Logs */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <button onClick={() => setLogsOpen(!logsOpen)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-[#20364D] hover:bg-slate-50"
          data-testid="logs-toggle">
          <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> Recent Notification Logs ({logs.length})</span>
          {logsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {logsOpen && (
          <div className="border-t divide-y max-h-[300px] overflow-y-auto" data-testid="logs-list">
            {logs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">No logs yet. Dispatch a notification to see logs here.</div>
            ) : logs.map((log, i) => {
              const badge = STATUS_BADGE[log.status] || STATUS_BADGE.skipped;
              const Icon = badge.icon;
              return (
                <div key={log.id || i} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                    <Icon className="w-3 h-3" /> {badge.label}
                  </span>
                  <span className="font-medium text-slate-700 truncate flex-1">{log.subject}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{log.recipient}</span>
                  <span className="text-xs text-slate-300 flex-shrink-0">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
