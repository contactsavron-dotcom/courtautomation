"use client";

import Link from "next/link";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BAR_ID_REGEX = /^[A-Z]{2}\/\d{1,5}\/\d{4}$/;

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
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
      const res = await fetch(`${API_URL}/api/advocates/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
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

  if (status === "success") {
    return (
      <main className="min-h-screen bg-brand-dark flex items-center justify-center px-6">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h1 className="text-2xl font-bold text-brand-dark mb-4">Registration Complete!</h1>
          <p className="text-gray-600 mb-6">
            You&apos;ll receive your first cause list email tomorrow evening. Check your inbox (and spam folder) around 8 PM.
          </p>
          <Link href="/" className="text-brand-gold font-semibold hover:underline">
            &larr; Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-dark">
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-brand-gold font-bold text-xl tracking-wide">
          CauseListPro
        </Link>
      </nav>

      <div className="flex items-center justify-center px-6 pb-16">
        <div className="bg-white rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-brand-dark mb-2">Register for Free Trial</h1>
          <p className="text-gray-500 text-sm mb-6">30-day free trial. No credit card required.</p>

          {status === "error" && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="e.g. Ambala Raju"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="you@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Bar Council ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bar Council ID *</label>
              <input
                type="text"
                value={form.bar_council_id}
                onChange={(e) => setForm({ ...form, bar_council_id: e.target.value.toUpperCase() })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="TS/315/2017"
              />
              {errors.bar_council_id && (
                <p className="text-red-500 text-xs mt-1">{errors.bar_council_id}</p>
              )}
            </div>

            {/* TSHC Computer Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TSHC Computer Code (optional)
              </label>
              <input
                type="text"
                value={form.tshc_computer_code}
                onChange={(e) => setForm({ ...form, tshc_computer_code: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold"
                placeholder="NB/TS/2019/01390"
              />
              <p className="text-gray-400 text-xs mt-1">
                Found on TSHC website. Enables High Court cause list alerts.
              </p>
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-brand-gold text-brand-dark py-3 rounded font-bold text-sm hover:bg-brand-gold-light transition disabled:opacity-50"
            >
              {status === "loading" ? "Registering..." : "Register Free"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
