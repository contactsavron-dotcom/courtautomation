"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ── Court type from Supabase ── */
interface Court {
  id: string;
  name: string;
  court_type?: string;
  location?: string;
  court_count?: number;
  icon?: string;
}

/* ── Icon per court type ── */
function courtIcon(type?: string) {
  if (type?.toLowerCase().includes("high")) {
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  /* ── Form state ── */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [barState, setBarState] = useState("TS");
  const [barNumber, setBarNumber] = useState("");
  const [barYear, setBarYear] = useState("");

  /* ── Courts ── */
  const [courts, setCourts] = useState<Court[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [courtsLoading, setCourtsLoading] = useState(true);

  /* ── UI state ── */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [apiError, setApiError] = useState("");

  /* ── Fetch courts from Supabase ── */
  useEffect(() => {
    async function fetchCourts() {
      const { data, error } = await supabase
        .from("courts")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (!error && data) {
        setCourts(data);
        setSelected(data.map((c: Court) => c.id));
      }
      setCourtsLoading(false);
    }
    fetchCourts();
  }, []);

  /* ── Mobile: strip to digits only, max 10 ── */
  function handleMobile(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    setMobile(digits);
  }

  /* ── Validate step 1 ── */
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (mobile && mobile.length !== 10) e.mobile = "Enter 10-digit mobile number";
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Minimum 6 characters";
    if (!barNumber.trim()) e.barNumber = "Number is required";
    if (!barYear.trim()) e.barYear = "Year is required";
    else if (!/^\d{4}$/.test(barYear)) e.barYear = "4-digit year";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ── Toggle court selection ── */
  function toggleCourt(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  /* ── Submit registration ── */
  async function handleSubmit() {
    if (selected.length === 0) {
      setErrors({ courts: "Select at least one court" });
      return;
    }

    setStatus("loading");
    setApiError("");

    const barCouncilId = `${barState.trim()}/${barNumber.trim()}/${barYear.trim()}`;

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: mobile ? `+91${mobile}` : null,
          bar_council_id: barCouncilId,
          courts_selected: selected,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail = data?.detail || `Registration failed (${res.status})`;
        if (res.status === 409) {
          throw new Error("An account with this email already exists. Please sign in instead.");
        }
        throw new Error(detail);
      }

      setStatus("success");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  /* ── Auto-redirect on success ── */
  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => router.push("/login"), 3000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  /* ═══════════════════════════════════
     SUCCESS SCREEN
     ═══════════════════════════════════ */
  if (status === "success") {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#f7f8fa", fontFamily: "'DM Sans', sans-serif" }}
      >
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-[560px] w-full text-center">
          {/* Green accent bar */}
          <div className="h-1 rounded-t-2xl -mt-8 -mx-8 mb-8" style={{ background: "#0b6b37" }} />

          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "#0b6b3715" }}
          >
            <svg className="w-8 h-8" style={{ color: "#0b6b37" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Playfair Display', serif", color: "#1a1a1a" }}
          >
            You&rsquo;re All Set!
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Your account has been created. You&rsquo;ll receive daily cause list alerts at your registered email.
          </p>
          <div
            className="rounded-lg p-3 mb-4 text-sm"
            style={{ background: "#0b6b3710", color: "#0b6b37" }}
          >
            <strong>Important:</strong> Save <span className="font-mono">alerts@avronai.com</span> in your contacts so alerts don&rsquo;t land in spam.
          </div>
          <p className="text-gray-400 text-xs">Redirecting to login in 3 seconds...</p>
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════════
     WIZARD
     ═══════════════════════════════════ */
  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: "#f7f8fa", fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="text-xl font-bold tracking-wide mb-6"
        style={{ fontFamily: "'Playfair Display', serif", color: "#0b6b37" }}
      >
        CauseListPro
      </Link>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-[560px] overflow-hidden">
        {/* Green accent bar */}
        <div className="h-1" style={{ background: "#0b6b37" }} />

        <div className="p-6 sm:p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full transition-colors"
                  style={{
                    background: step >= s ? "#0b6b37" : "#d1d5db",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: step >= s ? "#0b6b37" : "#9ca3af" }}
                >
                  {s === 1 ? "Personal Details" : "Select Courts"}
                </span>
                {s === 1 && <div className="w-8 h-px bg-gray-300 mx-1" />}
              </div>
            ))}
          </div>

          {/* Error banner */}
          {status === "error" && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-5 text-sm">
              {apiError}
            </div>
          )}

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2
                  className="text-xl font-bold mb-1"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#1a1a1a" }}
                >
                  Personal Details
                </h2>
                <p className="text-gray-500 text-sm">Start your 30-day free trial. No credit card required.</p>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. APOORVA BANTULA"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email + Mobile side by side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Mobile
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 rounded-l-lg bg-gray-50 text-gray-500 text-sm">
                      +91
                    </span>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => handleMobile(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 min-w-0 border border-gray-200 rounded-r-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 transition"
                      style={{ "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                    />
                  </div>
                  {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                </div>
              </div>

              {/* Create Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Create Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 transition"
                  style={{ "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Bar Council Enrollment: 3 fields in a row */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Bar Council Enrollment <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barState}
                    onChange={(e) => setBarState(e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="TS"
                    className="border border-gray-200 rounded-lg px-3 py-3 text-sm text-center font-mono focus:outline-none focus:ring-2 transition"
                    style={{ width: 72, "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                  />
                  <input
                    type="text"
                    value={barNumber}
                    onChange={(e) => setBarNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="02775"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 transition"
                    style={{ "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                  />
                  <input
                    type="text"
                    value={barYear}
                    onChange={(e) => setBarYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="2009"
                    className="border border-gray-200 rounded-lg px-3 py-3 text-sm text-center font-mono focus:outline-none focus:ring-2 transition"
                    style={{ width: 84, "--tw-ring-color": "#0b6b3740" } as React.CSSProperties}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1.5">
                  State / Number / Year &mdash; e.g. TS / 02775 / 2009
                </p>
                {errors.barNumber && <p className="text-red-500 text-xs mt-1">{errors.barNumber}</p>}
                {errors.barYear && <p className="text-red-500 text-xs mt-1">{errors.barYear}</p>}
              </div>

              {/* Next button */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="w-full py-3.5 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90"
                style={{ background: "#0b6b37" }}
              >
                Next &rarr;
              </button>

              <p className="text-center text-gray-500 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold hover:underline" style={{ color: "#0b6b37" }}>
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2
                  className="text-xl font-bold mb-1"
                  style={{ fontFamily: "'Playfair Display', serif", color: "#1a1a1a" }}
                >
                  Select Your Courts
                </h2>
                <p className="text-gray-500 text-sm">
                  We&rsquo;ll check these courts daily and email your cause list.
                </p>
              </div>

              {/* Counter badge */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ background: "#0b6b37" }}
                >
                  {selected.length} of {courts.length}
                </span>
                <span className="text-gray-400 text-xs">courts selected</span>
              </div>

              {/* Court cards grid */}
              {courtsLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Loading courts...</div>
              ) : courts.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No courts available</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courts.map((court) => {
                    const isSelected = selected.includes(court.id);
                    return (
                      <button
                        key={court.id}
                        type="button"
                        onClick={() => toggleCourt(court.id)}
                        className="relative text-left rounded-xl p-4 border-2 transition-all"
                        style={{
                          borderColor: isSelected ? "#0b6b37" : "#e5e7eb",
                          background: isSelected ? "#0b6b3708" : "#fff",
                        }}
                      >
                        {/* Checkmark */}
                        {isSelected && (
                          <div
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: "#0b6b37" }}
                          >
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        {/* Icon */}
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                          style={{
                            background: isSelected ? "#0b6b3720" : "#f3f4f6",
                            color: isSelected ? "#0b6b37" : "#9ca3af",
                          }}
                        >
                          {courtIcon(court.court_type)}
                        </div>

                        {/* Type badge */}
                        {court.court_type && (
                          <span
                            className="inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5"
                            style={{
                              background: isSelected ? "#0b6b3715" : "#f3f4f6",
                              color: isSelected ? "#0b6b37" : "#9ca3af",
                            }}
                          >
                            {court.court_type}
                          </span>
                        )}

                        {/* Court name */}
                        <p
                          className="text-sm font-semibold leading-tight mb-1"
                          style={{ color: isSelected ? "#1a1a1a" : "#6b7280" }}
                        >
                          {court.name}
                        </p>

                        {/* Location + count */}
                        <p
                          className="text-xs"
                          style={{ color: isSelected ? "#6b7280" : "#9ca3af" }}
                        >
                          {court.court_count != null && <>{court.court_count} &middot; </>}
                          {court.location || "Telangana"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {errors.courts && (
                <p className="text-red-500 text-xs">{errors.courts}</p>
              )}

              <p className="text-gray-400 text-xs text-center">
                You can change your court selection anytime from your dashboard.
              </p>

              {/* Back + Submit buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setStatus("idle");
                    setApiError("");
                  }}
                  className="px-5 py-3.5 rounded-lg font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === "loading"}
                  className="flex-1 py-3.5 rounded-lg font-semibold text-sm text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#0b6b37" }}
                >
                  {status === "loading" ? "Creating account..." : "Complete Registration \u2713"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-xs mt-6 text-center">
        By registering you agree to our{" "}
        <Link href="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
      </p>
    </main>
  );
}
