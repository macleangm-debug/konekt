import React, { useEffect, useState, useCallback } from "react";
import api from "../../../lib/api";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { toast } from "sonner";
import { Bell, Mail, MessageCircle, AlertCircle, CheckCircle2, Send, Loader2, Users, RefreshCw } from "lucide-react";

/**
 * Global (system-wide) notification + email channel kill-switches, grouped by category.
 * Uses backend /api/admin/notification-system/config — one doc per event_key in
 * db.system_notification_config with in_app_enabled / email_enabled / whatsapp_enabled.
 * These gate every outgoing notification on top of the per-user preferences.
 */

function ChannelCheckbox({ enabled, available, onChange, testId }) {
  return (
    <label className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 cursor-pointer transition ${
      !available ? "opacity-30 cursor-not-allowed border-slate-200" :
      enabled ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
    }`}>
      <input
        type="checkbox"
        checked={enabled}
        disabled={!available}
        onChange={(e) => available && onChange(e.target.checked)}
        className="sr-only"
        data-testid={testId}
      />
      {enabled && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
    </label>
  );
}

export default function SystemNotificationControlPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState({});
  const [channels, setChannels] = useState({ in_app: true, email: false, whatsapp: false, resend_from_email: "" });
  const [dirty, setDirty] = useState({}); // key: `${event_key}:${channel}` → bool
  const [openGroup, setOpenGroup] = useState("");
  // Resend test
  const [resendTo, setResendTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [resendStatus, setResendStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, rs] = await Promise.all([
        api.get("/api/admin/notification-system/config"),
        api.get("/api/admin/notification-system/resend-status").catch(() => ({ data: null })),
      ]);
      setGroups(cfg.data.groups || {});
      setChannels(cfg.data.channels || {});
      setResendStatus(rs.data);
      // Open the first group by default
      const first = Object.keys(cfg.data.groups || {})[0];
      if (first && !openGroup) setOpenGroup(first);
    } catch {
      toast.error("Failed to load notification config");
    }
    setLoading(false);
  }, [openGroup]);

  useEffect(() => { load(); }, [load]);

  const toggle = (group, evKey, channel, current) => {
    const next = !current;
    setGroups((g) => ({
      ...g,
      [group]: g[group].map((e) => e.event_key === evKey ? { ...e, [`${channel}_enabled`]: next } : e),
    }));
    setDirty((d) => ({ ...d, [`${evKey}:${channel}`]: next }));
  };

  const save = async () => {
    const toggles = Object.entries(dirty).map(([k, enabled]) => {
      const [event_key, channel] = k.split(":");
      return { event_key, channel, enabled };
    });
    if (!toggles.length) { toast.info("Nothing to save"); return; }
    setSaving(true);
    try {
      await api.put("/api/admin/notification-system/config", { toggles });
      toast.success(`Saved ${toggles.length} toggle${toggles.length === 1 ? "" : "s"}`);
      setDirty({});
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    }
    setSaving(false);
  };

  const sendTest = async () => {
    if (!resendTo.trim()) { toast.error("Enter a destination email"); return; }
    setTesting(true);
    try {
      await api.post("/api/admin/notification-system/resend-test", { to: resendTo });
      toast.success(`Test email sent to ${resendTo}. Check inbox (and spam).`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test failed");
    }
    setTesting(false);
  };

  const bulkFlip = (group, channel, turnOn) => {
    const evs = groups[group] || [];
    const nextGroups = { ...groups, [group]: evs.map((e) => ({ ...e, [`${channel}_enabled`]: turnOn })) };
    setGroups(nextGroups);
    const nextDirty = { ...dirty };
    evs.forEach((e) => { nextDirty[`${e.event_key}:${channel}`] = turnOn; });
    setDirty(nextDirty);
  };

  const dirtyCount = Object.keys(dirty).length;

  return (
    <div className="space-y-4">
      {/* Resend status + test */}
      <div className={`rounded-2xl border p-4 ${resendStatus?.is_default_domain ? "bg-amber-50 border-amber-200" : resendStatus?.configured ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`} data-testid="resend-status-card">
        <div className="flex items-start gap-3">
          <Mail className={`w-5 h-5 mt-0.5 ${resendStatus?.is_default_domain ? "text-amber-600" : resendStatus?.configured ? "text-emerald-600" : "text-rose-600"}`} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#20364D]">Resend email delivery</h3>
              {resendStatus?.configured
                ? <Badge className="bg-emerald-100 text-emerald-700">Configured</Badge>
                : <Badge className="bg-rose-100 text-rose-700">Not configured</Badge>}
              {resendStatus?.is_default_domain && <Badge className="bg-amber-100 text-amber-800">Default domain</Badge>}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Sending from <b>{resendStatus?.from_email || "—"}</b> · Domain <code>{resendStatus?.domain || "—"}</code> · Key <code>…{resendStatus?.api_key_suffix || "—"}</code>
            </p>
            {resendStatus?.advice && <p className="text-xs text-amber-900 mt-2">💡 {resendStatus.advice}</p>}
            <div className="flex gap-2 mt-3">
              <Input
                type="email"
                placeholder="Send test email to…"
                value={resendTo}
                onChange={(e) => setResendTo(e.target.value)}
                className="max-w-xs h-8 text-xs"
                data-testid="resend-test-to"
              />
              <Button size="sm" onClick={sendTest} disabled={testing || !resendStatus?.configured} data-testid="resend-test-btn">
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Send test</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Event grid */}
      <div className="bg-white rounded-2xl border" data-testid="notif-system-config">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#20364D] flex items-center gap-2"><Bell className="w-4 h-4" /> System-wide event channels</h3>
            <p className="text-xs text-slate-500 mt-0.5">Global kill-switches. Turning a channel off here disables it for every user. Individual users can still turn channels off for themselves in their own account preferences.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} data-testid="reload-config"><RefreshCw className="w-3.5 h-3.5 mr-1" /> Reload</Button>
            <Button size="sm" onClick={save} disabled={!dirtyCount || saving} className="bg-[#20364D] hover:bg-[#1a2d40]" data-testid="save-notif-config">
              {saving ? "Saving…" : `Save${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : (
          <div className="divide-y">
            {Object.entries(groups).map(([groupName, events]) => (
              <div key={groupName} data-testid={`notif-group-${groupName.toLowerCase().replace(/\s+/g, "-")}`}>
                <button
                  onClick={() => setOpenGroup(openGroup === groupName ? "" : groupName)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
                  data-testid={`toggle-group-${groupName.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{groupName}</span>
                    <Badge variant="outline" className="text-[10px]">{events.length} events</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] uppercase font-semibold text-slate-400">
                    <div className="flex items-center gap-1"><Bell className="w-3 h-3" /> In-app</div>
                    <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</div>
                    <div className="flex items-center gap-1 opacity-50"><MessageCircle className="w-3 h-3" /> WhatsApp</div>
                    <span className="text-[11px] text-slate-500 normal-case font-normal ml-2">{openGroup === groupName ? "▲" : "▼"}</span>
                  </div>
                </button>

                {openGroup === groupName && (
                  <div>
                    {/* Group-level bulk row */}
                    <div className="px-4 py-2 bg-slate-50/60 text-[11px] flex items-center gap-2 border-t border-b border-slate-100">
                      <span className="text-slate-500 mr-2">Bulk:</span>
                      {["in_app", "email", "whatsapp"].map((ch) => (
                        <div key={ch} className="flex items-center gap-1">
                          <span className="capitalize text-slate-500">{ch.replace("_", "-")}</span>
                          <button className="text-emerald-600 hover:underline" onClick={() => bulkFlip(groupName, ch, true)} data-testid={`bulk-on-${groupName.toLowerCase().replace(/\s+/g, "-")}-${ch}`}>on</button>
                          <span className="text-slate-300">/</span>
                          <button className="text-rose-600 hover:underline" onClick={() => bulkFlip(groupName, ch, false)} data-testid={`bulk-off-${groupName.toLowerCase().replace(/\s+/g, "-")}-${ch}`}>off</button>
                        </div>
                      ))}
                    </div>
                    {events.map((ev) => (
                      <div key={ev.event_key} className="px-4 py-2.5 flex items-center justify-between border-t hover:bg-slate-50/40" data-testid={`event-row-${ev.event_key}`}>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-900">{ev.label}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <code className="font-mono">{ev.event_key}</code>
                            <span className="mx-1">·</span>
                            <Users className="w-3 h-3" />
                            <span>{(ev.roles || []).join(", ")}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ChannelCheckbox
                            enabled={ev.in_app_enabled}
                            available={channels.in_app}
                            onChange={() => toggle(groupName, ev.event_key, "in_app", ev.in_app_enabled)}
                            testId={`toggle-inapp-${ev.event_key}`}
                          />
                          <ChannelCheckbox
                            enabled={ev.email_enabled}
                            available={channels.email}
                            onChange={() => toggle(groupName, ev.event_key, "email", ev.email_enabled)}
                            testId={`toggle-email-${ev.event_key}`}
                          />
                          <ChannelCheckbox
                            enabled={ev.whatsapp_enabled}
                            available={channels.whatsapp}
                            onChange={() => toggle(groupName, ev.event_key, "whatsapp", ev.whatsapp_enabled)}
                            testId={`toggle-whatsapp-${ev.event_key}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {!channels.whatsapp && !loading && (
          <div className="px-4 py-2 text-[11px] bg-slate-50 text-slate-500 flex items-center gap-1 border-t">
            <AlertCircle className="w-3 h-3" /> WhatsApp is not configured — set TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM to enable those checkboxes.
          </div>
        )}
      </div>
    </div>
  );
}
