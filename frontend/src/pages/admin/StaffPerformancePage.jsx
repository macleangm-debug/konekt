import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import api from "../../lib/api";

export default function StaffPerformancePage() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/api/supervisor-team/performance");
      setPerformance(res.data);
    } catch (error) {
      console.error("Failed to load performance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-10 flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen space-y-6" data-testid="staff-performance-page">
      <div>
        <h1 className="text-3xl font-bold text-[#2D3E50]">Staff Performance</h1>
        <p className="mt-2 text-slate-600">
          Detailed performance metrics for all staff members.
        </p>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        {performance?.performance?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="pb-3 font-medium">Rank</th>
                  <th className="pb-3 font-medium">Staff Member</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium text-center">Leads</th>
                  <th className="pb-3 font-medium text-center">Won</th>
                  <th className="pb-3 font-medium text-center">Conversion Rate</th>
                  <th className="pb-3 font-medium text-center">Total Tasks</th>
                  <th className="pb-3 font-medium text-center">Completed</th>
                  <th className="pb-3 font-medium text-right">Pipeline Value</th>
                </tr>
              </thead>
              <tbody>
                {performance.performance.map((staff, idx) => (
                  <tr key={staff.email} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        idx === 0 ? 'bg-[#D4A843]' : 
                        idx === 1 ? 'bg-slate-400' : 
                        idx === 2 ? 'bg-amber-600' : 
                        'bg-slate-300'
                      }`}>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="font-medium">{staff.full_name || staff.email}</div>
                      <div className="text-xs text-slate-500">{staff.email}</div>
                    </td>
                    <td className="py-4">
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 capitalize">
                        {(staff.role || "staff").replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 text-center font-medium">{staff.lead_count}</td>
                    <td className="py-4 text-center font-medium text-green-600">{staff.won_count}</td>
                    <td className="py-4 text-center">
                      <span className={`font-medium ${
                        staff.conversion_rate >= 20 ? 'text-green-600' : 
                        staff.conversion_rate >= 10 ? 'text-amber-600' : 
                        'text-slate-500'
                      }`}>
                        {staff.conversion_rate}%
                      </span>
                    </td>
                    <td className="py-4 text-center">{staff.total_tasks}</td>
                    <td className="py-4 text-center text-green-600">{staff.completed_tasks}</td>
                    <td className="py-4 text-right font-medium">TZS {Number(staff.total_value || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16" data-testid="staff-performance-empty">
            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No data available yet</h3>
            <p className="text-sm text-slate-500 mt-1">Data will appear once activity is recorded</p>
          </div>
        )}
      </div>
    </div>
  );
}
