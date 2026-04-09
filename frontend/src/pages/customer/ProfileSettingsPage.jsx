import React, { useEffect, useState } from "react";
import { User, Mail, Shield } from "lucide-react";
import AppLoader from "../../components/branding/AppLoader";

export default function ProfileSettingsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <AppLoader text="Loading profile..." size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="profile-settings-page">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profile Settings</h1>
        <p className="text-slate-500 mt-1">Review your account details and contact information.</p>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-[#20364D] flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {(user?.name || user?.full_name || "U")[0].toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-xl font-bold text-[#20364D]">
              {user?.name || user?.full_name || "User"}
            </div>
            <div className="text-slate-500 capitalize">{user?.role || "customer"} account</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <User className="w-4 h-4" />
              Full Name
            </div>
            <div className="text-lg font-medium text-[#20364D]">
              {user?.name || user?.full_name || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Mail className="w-4 h-4" />
              Email Address
            </div>
            <div className="text-lg font-medium text-[#20364D]">
              {user?.email || "-"}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              Account Type
            </div>
            <div className="text-lg font-medium text-[#20364D] capitalize">
              {user?.role || "customer"}
            </div>
          </div>

          {user?.phone && (
            <div className="space-y-1">
              <div className="text-sm text-slate-500">Phone</div>
              <div className="text-lg font-medium text-[#20364D]">{user.phone}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-dashed p-6 text-center">
        <p className="text-slate-500">
          Need to update your details? Contact support or your account manager.
        </p>
      </div>
    </div>
  );
}
