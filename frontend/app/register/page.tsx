"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const BAR_ID_REGEX = /^[A-Z]{2}\/\d{1,5}\/\d{4}$/;

const COURTS = [
  { value: "tshc", label: "Telangana High Court (TSHC)" },
  { value: "rangareddy", label: "Ranga Reddy District Court" },
  { value: "ccc_hyd", label: "City Civil Court, Hyderabad" },
  { value: "metro_sessions", label: "Metropolitan Sessions Court" },
  { value: "medchal", label: "Medchal-Malkajgiri District Court" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    bar_council_id: "",
    tshc_computer_code: "",
    courts_selected: COURTS.map((c) => c.value),
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  function toggleCourt(value: string) {
    setForm((prev) => ({
      ...prev,
      courts_selected: prev.courts_selected.includes(value)
        ? prev.courts_selected.filter((c) => c !== value)
        : [...prev.courts_selected, value],
    }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email address";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (!form.bar_council_id.trim()) e.bar_council_id = "Bar Council ID is required";
    else if (!BAR_ID_REGEX.test(form.bar_council_id))
      e.bar_council_id = "Format: STATE/NUMBER/YEAR (e.g. TS/315/2017)";
    if (form.courts_selected.length === 0)
      e.courts_selected = "Select at least one court";
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
          courts_selected: form.courts_selected,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `Registration failed (${res.status})`);
      }

      setStatus("success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setApiError(msg);
      setStatus("error");
    }
  }

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => router.push("/login"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  /* ─── SUCCESS STATE ─── */
  if (status === "success") {
    return (
      <main className="min-h-screen bg-brand-navy flex items-center justify-center px-6">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-lg">
          <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-bold text-brand-charcoal mb-2">
            Account Created Successfully!
          </h1>
          <p className="text-brand-gray text-sm mb-2">
            Welcome to CauseListPro. You can now sign in with your email and password.
          </p>
          <p className="text-brand-gold text-sm font-medium">
            Redirecting to login in 3 seconds...
          </p>
        </div>
      </main>
    );
  }

  /* ─── FORM ─── */
  return (
    <main className="min-h-screen bg-brand-navy">
      {/* Nav */}
      <nav className="px-6 py-4 text-center">
        <Link href="/" className="font-heading text-xl font-bold text-brand-gold tracking-wide">
          CauseListPro
        </Link>
      </nav>

      <div className="flex justify-center px-4 pb-16">
        <div className="bg-white rounded-xl p-6 sm:p-8 w-full max-w-[480px] shadow-lg">
          <h1 className="font-heading text-2xl font-bold text-brand-charcoal mb-1">
            Create Your Account
          </h1>
          <p className="text-brand-gray text-sm mb-6">
            Start your 30-day free trial. No credit card required.
          </p>

          {status === "error" && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="As it appears in court records (e.g. AMBALA RAJU)"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
              <p className="text-brand-gray text-xs mt-1">
                Use ALL CAPS exactly as your name appears on cause lists
              </p>
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="yourname@gmail.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Phone Number <span className="text-brand-gray font-normal">(optional)</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-charcoal transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-enter your password"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-charcoal transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Bar Council ID */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Bar Council Enrollment Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.bar_council_id}
                onChange={(e) =>
                  setForm({ ...form, bar_council_id: e.target.value.toUpperCase() })
                }
                placeholder="TS/315/2017"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
              <p className="text-brand-gray text-xs mt-1">
                Format: STATE/NUMBER/YEAR (e.g. TS/315/2017)
              </p>
              {errors.bar_council_id && (
                <p className="text-red-500 text-xs mt-1">{errors.bar_council_id}</p>
              )}
            </div>

            {/* TSHC Advocate Code */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                TSHC Advocate Code{" "}
                <span className="text-brand-gray font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.tshc_computer_code}
                onChange={(e) =>
                  setForm({ ...form, tshc_computer_code: e.target.value })
                }
                placeholder="5-digit code e.g. 19941"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
              <p className="text-brand-gray text-xs mt-1">
                Your internal TSHC computer code. Leave blank if unknown &mdash; we&rsquo;ll
                find your cases by name.
              </p>
            </div>

            {/* Courts Selection */}
            <div>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Courts You Practice In <span className="text-red-500">*</span>
              </label>
              <p className="text-brand-gray text-xs mb-3">
                Select all courts where you appear. We&rsquo;ll only check these courts
                daily.
              </p>
              <div className="space-y-2.5">
                {COURTS.map((court) => (
                  <label
                    key={court.value}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        form.courts_selected.includes(court.value)
                          ? "bg-brand-gold border-brand-gold"
                          : "border-gray-300 group-hover:border-brand-gold/50"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggleCourt(court.value);
                      }}
                    >
                      {form.courts_selected.includes(court.value) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={form.courts_selected.includes(court.value)}
                      onChange={() => toggleCourt(court.value)}
                      className="sr-only"
                    />
                    <span className="text-sm text-brand-charcoal">{court.label}</span>
                  </label>
                ))}
              </div>
              {errors.courts_selected && (
                <p className="text-red-500 text-xs mt-2">{errors.courts_selected}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-brand-gold text-brand-navy py-3.5 rounded-lg font-bold text-sm hover:bg-brand-gold-light transition-colors disabled:opacity-50"
            >
              {status === "loading"
                ? "Creating your account..."
                : "Create Account & Start Free Trial"}
            </button>
          </form>

          <div className="mt-5 text-center space-y-2">
            <p className="text-brand-gray text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-brand-gold font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
            <p className="text-brand-gray text-xs">
              By registering you agree to our{" "}
              <Link href="/terms" className="underline hover:text-brand-charcoal">
                Terms of Service
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
