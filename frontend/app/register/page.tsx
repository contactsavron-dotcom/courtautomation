"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BAR_ID_REGEX = /^[A-Z]{2}\/\d{1,5}\/\d{4}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    bar_council_id: "",
    tshc_computer_code: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    if (!form.bar_council_id.trim()) e.bar_council_id = "Bar Council ID is required";
    else if (!BAR_ID_REGEX.test(form.bar_council_id))
      e.bar_council_id = "Format: XX/DIGITS/YYYY (e.g. TS/315/2017)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;

    setStatus("loading");
    setApiError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || null,
          bar_council_id: form.bar_council_id.trim(),
          tshc_computer_code: form.tshc_computer_code.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `Registration failed (${res.status})`);
      }

      setStatus("success");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  // Redirect to login after success
  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => router.push("/login"), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  if (status === "success") {
    return (
      <main className="min-h-screen bg-brand-navy flex items-center justify-center px-6">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold text-brand-charcoal mb-2">Registration Successful!</h1>
          <p className="text-brand-gray mb-4">
            Redirecting to login...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-navy">
      {/* Nav */}
      <nav className="px-6 py-4">
        <Link href="/" className="font-heading text-xl font-bold text-brand-gold tracking-wide">
          CauseListPro
        </Link>
      </nav>

      <div className="flex items-center justify-center px-6 pb-16">
        <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg">
          <h1 className="font-heading text-2xl font-bold text-brand-charcoal mb-1">Register for Free Trial</h1>
          <p className="text-brand-gray text-sm mb-6">30-day free trial. No credit card required.</p>

          {status === "error" && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="e.g. Ambala Raju"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="Minimum 8 characters"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Confirm Password *</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="Re-enter your password"
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Bar Council ID */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">Bar Council ID *</label>
              <input
                type="text"
                value={form.bar_council_id}
                onChange={(e) => setForm({ ...form, bar_council_id: e.target.value.toUpperCase() })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="TS/315/2017"
              />
              {errors.bar_council_id && (
                <p className="text-red-500 text-xs mt-1">{errors.bar_council_id}</p>
              )}
            </div>

            {/* TSHC Computer Code */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                TSHC Computer Code (optional)
              </label>
              <input
                type="text"
                value={form.tshc_computer_code}
                onChange={(e) => setForm({ ...form, tshc_computer_code: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                placeholder="NB/TS/2019/01390"
              />
              <p className="text-brand-gray text-xs mt-1">
                Found on TSHC website. Enables High Court cause list alerts.
              </p>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-brand-gold text-brand-navy py-3 rounded-lg font-bold text-sm hover:bg-brand-gold-light transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Creating account..." : "Register Free"}
            </button>
          </form>

          <p className="text-brand-gray text-sm mt-5 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-gold font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
