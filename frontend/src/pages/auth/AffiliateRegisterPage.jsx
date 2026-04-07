import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PhoneNumberField from "../../components/forms/PhoneNumberField";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AffiliateRegisterPage() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_prefix: "+255",
    phone: "",
    country: "Tanzania",
    password: "",
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/affiliates/public/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || "Unable to create affiliate account");
      }
      
      setResult(data);
      toast.success("Affiliate account created!");
    } catch (err) {
      setError(err.message || "Unable to create affiliate account");
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12 flex items-center justify-center" data-testid="affiliate-register-page">
      <div className="w-full max-w-2xl rounded-3xl border bg-white p-8">
        <div className="text-4xl font-bold text-[#20364D]">Join as Affiliate</div>
        <p className="text-slate-600 mt-3">
          Create your affiliate account, get your referral code, and start sharing Konekt offers.
        </p>

        {!result ? (
          <form className="grid gap-4 mt-8" onSubmit={submit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <input
                className="w-full border rounded-xl px-4 py-3"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                data-testid="input-full-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
              <PhoneNumberField
                label=""
                prefix={form.phone_prefix}
                number={form.phone}
                onPrefixChange={(v) => setForm({ ...form, phone_prefix: v })}
                onNumberChange={(v) => setForm({ ...form, phone: v })}
                testIdPrefix="affiliate-reg-phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
              <select
                className="w-full border rounded-xl px-4 py-3"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                data-testid="input-country"
              >
                <option value="Tanzania">Tanzania</option>
                <option value="Kenya">Kenya</option>
                <option value="Uganda">Uganda</option>
                <option value="Rwanda">Rwanda</option>
                <option value="Nigeria">Nigeria</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
              <input
                type="password"
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Choose a strong password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                data-testid="input-password"
              />
            </div>

            {error ? (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#D4A843] px-5 py-3 font-semibold text-[#17283C] flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="submit-btn"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Create Affiliate Account
            </button>
          </form>
        ) : (
          <div className="mt-8 rounded-2xl bg-slate-50 border p-6" data-testid="success-message">
            <div className="text-2xl font-bold text-[#20364D]">Affiliate account created</div>
            <p className="text-slate-600 mt-3">{result.message}</p>
            <div className="mt-4 text-lg">
              <strong>Your Code:</strong> <span data-testid="affiliate-code">{result.affiliate_code}</span>
            </div>
            <Link
              to="/login"
              className="inline-block mt-6 rounded-xl bg-[#20364D] text-white px-5 py-3 font-semibold"
              data-testid="proceed-login-btn"
            >
              Proceed to Login
            </Link>
          </div>
        )}
        
        <div className="text-center mt-6">
          <Link to="/earn" className="text-slate-600 hover:underline">
            ← Back to Affiliate Program
          </Link>
        </div>
      </div>
    </div>
  );
}
