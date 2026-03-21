"use client";

import Link from "next/link";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CaseEntry {
  serial_no: string | null;
  case_no: string;
  parties_petitioner: string;
  parties_respondent: string;
  petitioner_advocate: string;
  respondent_advocate: string;
  court_name: string | null;
  district: string | null;
  status: string | null;
}

interface CourtResult {
  court_source: string;
  hearing_date: string;
  total_cases: number;
  cases: CaseEntry[];
}

interface OnDemandResult {
  advocate_id: string;
  advocate_name: string;
  target_date: string;
  total_cases: number;
  courts_checked: number;
  results: Record<string, CourtResult>;
}

interface Advocate {
  id: string;
  name: string;
  email: string;
  bar_council_id: string;
  tshc_computer_code: string | null;
  is_active: boolean;
}

const COURT_NAMES: Record<string, string> = {
  tshc_daily: "TSHC High Court \u2014 Daily List",
  tshc_advance: "TSHC High Court \u2014 Advance List",
  tshc_supplementary: "TSHC High Court \u2014 Supplementary List",
  rangareddy: "Ranga Reddy District Court",
  ccc_hyd: "City Civil Court, Hyderabad",
  metro_sessions: "Metropolitan Sessions Court",
  medchal: "Medchal-Malkajgiri District Court",
};

export default function DashboardPage() {
  const [email, setEmail] = useState("");
  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const [scrapeResult, setScrapeResult] = useState<OnDemandResult | null>(null);
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  async function handleLookup(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email.trim()) return;

    setLookupLoading(true);
    setLookupError("");
    setAdvocate(null);
    setScrapeResult(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase configuration is missing. Please contact support.");
      }

      const lookupRes = await fetch(
        `${supabaseUrl}/rest/v1/advocates?email=eq.${encodeURIComponent(email.trim())}&select=*`,
        {
          headers: {
            apikey: supabaseKey || "",
            Authorization: `Bearer ${supabaseKey}`,
          },
        }
      );

      if (!lookupRes.ok) throw new Error("Lookup failed");

      const data: Advocate[] = await lookupRes.json();
      if (data.length === 0) throw new Error("No advocate found with this email");

      setAdvocate(data[0]);
    } catch (err: unknown) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleCheckNow() {
    if (!advocate) return;

    setScrapeLoading(true);
    setScrapeError("");
    setScrapeResult(null);

    try {
      const res = await fetch(`${API_URL}/api/scrape/ondemand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advocate_id: advocate.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || `Scrape failed (${res.status})`);
      }

      const data: OnDemandResult = await res.json();
      setScrapeResult(data);
    } catch (err: unknown) {
      setScrapeError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScrapeLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-brand-dark px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-brand-gold font-bold text-xl tracking-wide">
          CauseListPro
        </Link>
        <Link href="/register" className="text-gray-300 hover:text-white text-sm">
          Register
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-brand-dark mb-6">Dashboard</h1>

        {/* Lookup */}
        {!advocate && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-lg font-semibold text-brand-dark mb-4">Look Up Your Account</h2>
            <form onSubmit={handleLookup} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="bg-brand-dark text-white px-6 py-2 rounded font-semibold text-sm hover:bg-brand-green transition disabled:opacity-50"
              >
                {lookupLoading ? "Searching..." : "Find"}
              </button>
            </form>
            {lookupError && (
              <p className="text-red-500 text-sm mt-2">{lookupError}</p>
            )}
          </div>
        )}

        {/* Advocate Info */}
        {advocate && (
          <>
            <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-brand-dark">{advocate.name}</h2>
                <button
                  onClick={() => { setAdvocate(null); setScrapeResult(null); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Switch Account
                </button>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Bar Council ID</span>
                  <p className="font-mono font-semibold">{advocate.bar_council_id}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email</span>
                  <p className="font-semibold">{advocate.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Courts Monitored</span>
                  <p className="font-semibold">{advocate.tshc_computer_code ? "5 (incl. TSHC)" : "4 (District only)"}</p>
                </div>
              </div>
            </div>

            {/* Check Now */}
            <div className="bg-white rounded-lg p-6 shadow-sm mb-6 text-center">
              <button
                onClick={handleCheckNow}
                disabled={scrapeLoading}
                className="bg-brand-gold text-brand-dark px-8 py-3 rounded-lg font-bold text-sm hover:bg-brand-gold-light transition disabled:opacity-50"
              >
                {scrapeLoading ? "Checking courts..." : "Check Now"}
              </button>
              {scrapeLoading && (
                <div className="mt-4">
                  <div className="inline-block w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
                  <p className="text-gray-500 text-sm mt-2">
                    Scanning courts for your cases. This may take 30-60 seconds...
                  </p>
                </div>
              )}
              {scrapeError && (
                <p className="text-red-500 text-sm mt-3">{scrapeError}</p>
              )}
            </div>
          </>
        )}

        {/* Results */}
        {scrapeResult && (
          <div className="space-y-4">
            <div className="bg-brand-dark text-white rounded-lg p-4 text-center">
              <span className="text-brand-gold text-3xl font-bold">{scrapeResult.total_cases}</span>
              <span className="text-gray-300 ml-2">case(s) found for {scrapeResult.target_date}</span>
            </div>

            {Object.entries(scrapeResult.results).map(([key, court]) => (
              <div key={key} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-brand-green text-white px-4 py-3 flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{COURT_NAMES[key] || key}</h3>
                  <span className="bg-brand-gold text-brand-dark text-xs font-bold px-2 py-1 rounded">
                    {court.total_cases} case(s)
                  </span>
                </div>

                {court.total_cases === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">No cases listed</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left">
                          <th className="px-4 py-2 font-medium text-gray-600">S.No</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Case Number</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Petitioner</th>
                          <th className="px-4 py-2 font-medium text-gray-600">Respondent</th>
                          <th className="px-4 py-2 font-medium text-gray-600">District</th>
                        </tr>
                      </thead>
                      <tbody>
                        {court.cases.map((c, i) => (
                          <tr key={`${key}-${c.case_no}-${i}`} className="border-t border-gray-100">
                            <td className="px-4 py-2 text-gray-500">{c.serial_no || "-"}</td>
                            <td className="px-4 py-2 font-medium">{c.case_no}</td>
                            <td className="px-4 py-2 text-gray-700">{c.parties_petitioner || "-"}</td>
                            <td className="px-4 py-2 text-gray-700">{c.parties_respondent || "-"}</td>
                            <td className="px-4 py-2 text-gray-500">{c.district || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
