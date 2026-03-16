import React, { useEffect, useState } from "react";
import api from "../../lib/api";

export default function CrmSettingsPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/api/admin/crm-settings");
      setForm(res.data);
    } catch (error) {
      console.error("Failed to load CRM settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await api.put("/api/admin/crm-settings", {
        pipeline_stages: form.pipeline_stages,
        lost_reasons: form.lost_reasons,
        win_reasons: form.win_reasons,
        default_follow_up_days: Number(form.default_follow_up_days || 3),
        stale_lead_days: Number(form.stale_lead_days || 7),
        industries: form.industries,
        sources: form.sources,
      });
      alert("CRM settings updated");
      await load();
    } catch (error) {
      console.error(error);
      alert("Failed to save CRM settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10" data-testid="loading-state">Loading CRM settings...</div>;
  if (!form) return <div className="p-10">Failed to load settings</div>;

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="crm-settings-page">
      <div className="text-left">
        <h1 className="text-4xl font-bold">CRM Settings</h1>
        <p className="mt-2 text-slate-600">
          Configure pipeline stages, win/loss reasons, and follow-up rules.
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Panel title="Pipeline Stages">
          <p className="text-sm text-slate-500 mb-2">Comma-separated list of pipeline stages</p>
          <TagEditor
            value={form.pipeline_stages || []}
            onChange={(value) => setForm({ ...form, pipeline_stages: value })}
            testId="pipeline-stages-input"
          />
        </Panel>

        <Panel title="Lost Reasons">
          <p className="text-sm text-slate-500 mb-2">Reasons for marking leads as lost</p>
          <TagEditor
            value={form.lost_reasons || []}
            onChange={(value) => setForm({ ...form, lost_reasons: value })}
            testId="lost-reasons-input"
          />
        </Panel>

        <Panel title="Win Reasons">
          <p className="text-sm text-slate-500 mb-2">Reasons for marking leads as won</p>
          <TagEditor
            value={form.win_reasons || []}
            onChange={(value) => setForm({ ...form, win_reasons: value })}
            testId="win-reasons-input"
          />
        </Panel>

        <Panel title="Reminder Rules">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-600">Default follow-up days</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                type="number"
                placeholder="3"
                value={form.default_follow_up_days || ""}
                onChange={(e) => setForm({ ...form, default_follow_up_days: e.target.value })}
                data-testid="follow-up-days-input"
              />
            </div>
            <div>
              <label className="text-sm text-slate-600">Stale lead days (no activity)</label>
              <input
                className="w-full border rounded-xl px-4 py-3 mt-1"
                type="number"
                placeholder="7"
                value={form.stale_lead_days || ""}
                onChange={(e) => setForm({ ...form, stale_lead_days: e.target.value })}
                data-testid="stale-days-input"
              />
            </div>
          </div>
        </Panel>

        <Panel title="Industries">
          <p className="text-sm text-slate-500 mb-2">Available industries for leads</p>
          <TagEditor
            value={form.industries || []}
            onChange={(value) => setForm({ ...form, industries: value })}
            testId="industries-input"
          />
        </Panel>

        <Panel title="Lead Sources">
          <p className="text-sm text-slate-500 mb-2">Where leads come from</p>
          <TagEditor
            value={form.sources || []}
            onChange={(value) => setForm({ ...form, sources: value })}
            testId="sources-input"
          />
        </Panel>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-xl bg-[#2D3E50] text-white px-6 py-3 font-semibold"
        data-testid="save-crm-settings-btn"
      >
        {saving ? "Saving..." : "Save CRM Settings"}
      </button>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-3xl border bg-white p-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function TagEditor({ value, onChange, testId }) {
  const text = Array.isArray(value) ? value.join(", ") : "";
  return (
    <textarea
      className="w-full border rounded-xl px-4 py-3 min-h-[120px]"
      value={text}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        )
      }
      data-testid={testId}
    />
  );
}
