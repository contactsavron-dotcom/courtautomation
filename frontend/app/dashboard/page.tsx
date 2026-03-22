"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ═══════════════════════════ TYPES ═══════════════════════════ */

interface Advocate {
  id: string;
  name: string;
  email: string;
  bar_council_id: string;
  tshc_cis_code: string | null;
  plan_tier: string;
}

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
  id: string;
  court_source: string;
  hearing_date: string;
  total_cases: number;
  cases_json: CaseEntry[];
  scraped_at: string;
}

/* ═══════════════════════════ CONSTANTS ═══════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COURT_LABELS: Record<string, string> = {
  tshc_daily: "Telangana High Court",
  tshc_advance: "Telangana High Court",
  tshc_supplementary: "Telangana High Court",
  tshc: "Telangana High Court",
  rangareddy: "Ranga Reddy District Court",
  ccc_hyd: "City Civil Court, Hyderabad",
  metro_sessions: "Metropolitan Sessions Court",
  medchal: "Medchal-Malkajgiri District Court",
};

const LIST_TYPE_FROM_SOURCE: Record<string, string> = {
  tshc_daily: "Daily",
  tshc_advance: "Advance",
  tshc_supplementary: "Supplementary",
};

const LIST_TYPE_COLORS: Record<string, string> = {
  Daily: "bg-green-100 text-green-800",
  Advance: "bg-blue-100 text-blue-800",
  Supplementary: "bg-amber-100 text-amber-800",
};

const STATUS_COLORS: Record<string, string> = {
  "FOR ORDERS": "bg-green-100 text-green-800",
  "FOR ADMISSION": "bg-amber-100 text-amber-800",
  "FOR HEARING": "bg-blue-100 text-blue-800",
  "FOR ARGUMENTS": "bg-purple-100 text-purple-800",
  ARGUMENTS: "bg-purple-100 text-purple-800",
};

const ALL_COURT_SOURCES = [
  "tshc_daily",
  "tshc_advance",
  "tshc_supplementary",
  "rangareddy",
  "ccc_hyd",
  "metro_sessions",
  "medchal",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/* ═══════════════════════════ HELPERS ═══════════════════════════ */

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function formatFullDate(ds: string): string {
  const d = new Date(ds + "T00:00:00");
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function getRole(c: CaseEntry, name: string): "petitioner" | "respondent" | "appearing" {
  const n = name.toUpperCase();
  const inPet = c.petitioner_advocate?.toUpperCase().includes(n);
  const inRes = c.respondent_advocate?.toUpperCase().includes(n);
  if (inPet && !inRes) return "petitioner";
  if (inRes && !inPet) return "respondent";
  return "appearing";
}

/* ═══════════════════════════ SUB-COMPONENTS ═══════════════════════════ */

function SkeletonCards() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
            <div className="h-5 w-56 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded-full" />
          </div>
          <div className="p-5 space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="space-y-2">
                <div className="h-4 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-72 bg-gray-50 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string | null }) {
  const s = (status || "").trim().toUpperCase();
  const label = s || "Listed";
  const color = STATUS_COLORS[s] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}

function RolePill({ role }: { role: "petitioner" | "respondent" | "appearing" }) {
  const config = {
    petitioner: { label: "Petitioner Side", cls: "bg-green-100 text-green-800" },
    respondent: { label: "Respondent Side", cls: "bg-amber-100 text-amber-800" },
    appearing: { label: "Appearing", cls: "bg-gray-100 text-gray-600" },
  };
  const { label, cls } = config[role];
  return (
    <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function ListTypeBadge({ source }: { source: string }) {
  const type = LIST_TYPE_FROM_SOURCE[source];
  if (!type) return null;
  const color = LIST_TYPE_COLORS[type] || "bg-gray-100 text-gray-600";
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${color}`}>
      {type}
    </span>
  );
}

function CourtCard({
  courtSource,
  result,
  advocateName,
}: {
  courtSource: string;
  result: CourtResult;
  advocateName: string;
}) {
  const label = COURT_LABELS[courtSource] || courtSource;
  const cases = result.cases_json || [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-brand-navy/[0.03] border-b border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-heading font-semibold text-brand-charcoal">{label}</h3>
          <ListTypeBadge source={courtSource} />
        </div>
        <span className="bg-brand-gold text-white text-xs font-bold min-w-[28px] h-7 rounded-full flex items-center justify-center px-2">
          {result.total_cases}
        </span>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80 text-left text-xs text-brand-gray">
              <th className="px-4 py-2.5 font-medium w-12">S.No</th>
              <th className="px-4 py-2.5 font-medium">Case Number</th>
              <th className="px-4 py-2.5 font-medium">Petitioner vs Respondent</th>
              <th className="px-4 py-2.5 font-medium w-20">Court No.</th>
              <th className="px-4 py-2.5 font-medium w-28">Status</th>
              <th className="px-4 py-2.5 font-medium w-32">Your Role</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => {
              const role = getRole(c, advocateName);
              return (
                <tr key={`${c.case_no}-${i}`} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-brand-gray">{c.serial_no || i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-brand-charcoal">{c.case_no}</td>
                  <td className="px-4 py-3 text-brand-charcoal">
                    {titleCase(c.parties_petitioner || "")}{" "}
                    <span className="text-brand-gold font-semibold">vs</span>{" "}
                    {titleCase(c.parties_respondent || "")}
                  </td>
                  <td className="px-4 py-3 text-brand-gray">{c.court_name || "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-3"><RolePill role={role} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="md:hidden divide-y divide-gray-50">
        {cases.map((c, i) => {
          const role = getRole(c, advocateName);
          return (
            <div key={`${c.case_no}-${i}`} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-brand-charcoal text-sm">{c.case_no}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <StatusPill status={c.status} />
                  <RolePill role={role} />
                </div>
              </div>
              <p className="text-xs text-brand-charcoal">
                {titleCase(c.parties_petitioner || "")}{" "}
                <span className="text-brand-gold font-semibold">vs</span>{" "}
                {titleCase(c.parties_respondent || "")}
              </p>
              {c.court_name && (
                <p className="text-[11px] text-brand-gray mt-1">Court No. {c.court_name}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ZeroCourt({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2.5 text-sm text-brand-gray">
      <svg className="w-4 h-4 text-brand-green/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {label} — No cases listed
    </div>
  );
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */

export default function DashboardPage() {
  const router = useRouter();

  /* ── Auth ── */
  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("clp_token");
    const stored = localStorage.getItem("clp_advocate");
    if (!token || !stored) {
      router.replace("/login");
      return;
    }
    try {
      setAdvocate(JSON.parse(stored));
    } catch {
      router.replace("/login");
      return;
    }
    setAuthChecked(true);
  }, [router]);

  /* ── Date state ── */
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateStr(today), [today]);
  const tomorrowStr = useMemo(() => toDateStr(addDays(today, 1)), [today]);

  const [selectedDate, setSelectedDate] = useState(todayStr);

  // 7-day strip: 3 back, today, 3 forward
  const dateStrip = useMemo(() => {
    const dates: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      dates.push(addDays(today, i));
    }
    return dates;
  }, [today]);

  /* ── Data ── */
  const [results, setResults] = useState<CourtResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [tomorrowResults, setTomorrowResults] = useState<CourtResult[]>([]);

  const fetchResults = useCallback(
    async (date: string) => {
      if (!advocate) return;
      setLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/api/advocates/${advocate.id}/results?date=${date}`
        );
        if (res.ok) {
          const data = await res.json();
          return (data.results || []) as CourtResult[];
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
      return [] as CourtResult[];
    },
    [advocate]
  );

  // Fetch on date change
  useEffect(() => {
    if (!advocate) return;
    fetchResults(selectedDate).then((r) => {
      if (r) setResults(r);
    });
  }, [advocate, selectedDate, fetchResults]);

  // Fetch tomorrow for summary card
  useEffect(() => {
    if (!advocate) return;
    fetchResults(tomorrowStr).then((r) => {
      if (r) setTomorrowResults(r);
    });
  }, [advocate, tomorrowStr, fetchResults]);

  /* ── On-demand scrape ── */
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");

  async function handleCheckNow() {
    if (!advocate) return;
    setScraping(true);
    setScrapeError("");
    try {
      const res = await fetch(`${API_URL}/api/scrape/ondemand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advocate_id: advocate.id }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.detail || "Scrape failed");
      }
      // Refresh results
      const fresh = await fetchResults(selectedDate);
      if (fresh) setResults(fresh);
      const freshTmrw = await fetchResults(tomorrowStr);
      if (freshTmrw) setTomorrowResults(freshTmrw);
    } catch (err: unknown) {
      setScrapeError(err instanceof Error ? err.message : "Failed");
    } finally {
      setScraping(false);
    }
  }

  /* ── Derived ── */
  const totalCases = results.reduce((s, r) => s + r.total_cases, 0);
  const courtsWithCases = results.filter((r) => r.total_cases > 0).length;
  const tomorrowTotal = tomorrowResults.reduce((s, r) => s + r.total_cases, 0);
  const tomorrowCourts = tomorrowResults.filter((r) => r.total_cases > 0).length;

  const latestScraped = useMemo(() => {
    if (results.length === 0) return null;
    return results.reduce((a, b) => (a.scraped_at > b.scraped_at ? a : b)).scraped_at;
  }, [results]);

  // Courts with data vs without
  const activeSources = useMemo(() => new Set(results.map((r) => r.court_source)), [results]);
  const zeroCourts = ALL_COURT_SOURCES.filter((s) => !activeSources.has(s));

  /* ── Logout ── */
  function handleLogout() {
    localStorage.removeItem("clp_token");
    localStorage.removeItem("clp_advocate");
    router.replace("/login");
  }

  /* ── Not authenticated yet ── */
  if (!authChecked || !advocate) {
    return (
      <main className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="animate-pulse text-brand-gray">Loading...</div>
      </main>
    );
  }

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <main className="min-h-screen bg-brand-bg">
      {/* ─── TOP NAV ─── */}
      <nav className="sticky top-0 z-50 bg-brand-navy border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-heading text-lg font-bold text-brand-gold tracking-wide">
            CauseListPro
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium hidden sm:inline">
              {titleCase(advocate.name)}
            </span>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 space-y-5">
        {/* ─── SUMMARY CARDS ─── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`rounded-xl p-4 text-left transition-all ${
              selectedDate === todayStr
                ? "bg-brand-navy ring-2 ring-brand-gold"
                : "bg-brand-navy"
            }`}
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Today</p>
            <p className="text-brand-gold text-3xl font-bold">{totalCases > 0 || selectedDate === todayStr ? totalCases : "—"}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {courtsWithCases > 0
                ? `across ${courtsWithCases} court${courtsWithCases !== 1 ? "s" : ""}`
                : "no cases"}
            </p>
          </button>
          <button
            onClick={() => setSelectedDate(tomorrowStr)}
            className={`rounded-xl p-4 text-left transition-all ${
              selectedDate === tomorrowStr
                ? "bg-brand-navy ring-2 ring-brand-gold"
                : "bg-brand-navy"
            }`}
          >
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Tomorrow</p>
            <p className="text-brand-gold text-3xl font-bold">{tomorrowTotal > 0 ? tomorrowTotal : "—"}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              {tomorrowCourts > 0
                ? `across ${tomorrowCourts} court${tomorrowCourts !== 1 ? "s" : ""}`
                : "no cases"}
            </p>
          </button>
        </div>

        {/* ─── DATE STRIP ─── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {dateStrip.map((d) => {
            const ds = toDateStr(d);
            const isSelected = ds === selectedDate;
            const isToday = ds === todayStr;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;

            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(ds)}
                className={`flex flex-col items-center px-3.5 py-2 rounded-xl text-xs font-medium transition-all min-w-[52px] relative ${
                  isSelected
                    ? "bg-brand-gold text-white shadow-sm"
                    : isWeekend
                    ? "text-gray-400 hover:bg-gray-100 line-through"
                    : "text-brand-charcoal hover:bg-gray-100"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide">
                  {DAY_NAMES[d.getDay()]}
                </span>
                <span className="text-base font-semibold leading-tight">
                  {d.getDate()}
                </span>
                {isToday && !isSelected && (
                  <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-brand-gold" />
                )}
              </button>
            );
          })}
        </div>

        {/* ─── CAUSE LIST HEADER ─── */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-brand-charcoal">
              Cause List &mdash; {formatFullDate(selectedDate)}
            </h1>
            {latestScraped && (
              <p className="text-brand-gray text-xs mt-1">
                Last updated: {formatTime(latestScraped)}
              </p>
            )}
          </div>
          <button
            onClick={handleCheckNow}
            disabled={scraping}
            className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-navy/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {scraping ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {scraping && (
          <div className="bg-brand-navy/5 border border-brand-navy/10 rounded-xl p-4 text-center">
            <div className="w-8 h-8 border-3 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-brand-charcoal text-sm font-medium">Scanning 5 courts...</p>
            <p className="text-brand-gray text-xs">This takes 30-60 seconds</p>
          </div>
        )}

        {scrapeError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {scrapeError}
          </div>
        )}

        {/* ─── COURT CARDS ─── */}
        {loading && !scraping ? (
          <SkeletonCards />
        ) : results.length > 0 || zeroCourts.length < ALL_COURT_SOURCES.length ? (
          <div className="space-y-4">
            {/* Courts with cases */}
            {results
              .filter((r) => r.total_cases > 0)
              .map((r) => (
                <CourtCard
                  key={`${r.court_source}-${r.id}`}
                  courtSource={r.court_source}
                  result={r}
                  advocateName={advocate.name}
                />
              ))}

            {/* Courts with zero cases */}
            {zeroCourts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 border-dashed divide-y divide-gray-50">
                {zeroCourts.map((s) => (
                  <ZeroCourt key={s} label={COURT_LABELS[s] || s} />
                ))}
              </div>
            )}

            {/* Also show results with 0 cases explicitly returned */}
            {results
              .filter((r) => r.total_cases === 0)
              .map((r) => (
                <div
                  key={`zero-${r.court_source}-${r.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm text-brand-gray bg-white rounded-xl border border-gray-100 border-dashed"
                >
                  <svg className="w-4 h-4 text-brand-green/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {COURT_LABELS[r.court_source] || r.court_source} — No cases listed
                </div>
              ))}
          </div>
        ) : (
          /* ─── EMPTY STATE ─── */
          <div className="text-center py-16">
            <svg
              className="w-20 h-20 mx-auto mb-5 text-brand-navy opacity-15"
              fill="none"
              viewBox="0 0 96 96"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M24 72l12-12m0 0l24-24m-24 24L24 48m12 12l12 12M60 36l12-12" />
              <rect x="16" y="76" width="40" height="6" rx="2" />
            </svg>
            <h3 className="font-heading text-lg font-semibold text-brand-charcoal mb-2">
              No cause list data for this date
            </h3>
            <p className="text-brand-gray text-sm max-w-md mx-auto mb-6">
              Data is fetched daily at 7:15 PM IST. You can also trigger a manual check below.
            </p>
            <button
              onClick={handleCheckNow}
              disabled={scraping}
              className="bg-brand-gold text-brand-navy px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-brand-gold-light transition-colors disabled:opacity-50"
            >
              {scraping ? "Scanning..." : "Check Now"}
            </button>
          </div>
        )}

        {/* ─── SOURCE ATTRIBUTION ─── */}
        <p className="text-[11px] text-brand-gray text-center pt-4 pb-2">
          Source: tshc.gov.in, eCourts India. CauseListPro is not affiliated with any court.
        </p>
      </div>
    </main>
  );
}
