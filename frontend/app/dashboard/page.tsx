"use client";

import Link from "next/link";
import { useState, useMemo, useCallback } from "react";

/* ═══════════════════════════ TYPES ═══════════════════════════ */

interface Advocate {
  id: string;
  name: string;
  email: string;
  bar_council_id: string;
  tshc_cis_code: string | null;
  phone: string | null;
  plan_tier: string;
  is_active: boolean;
  created_at: string | null;
  trial_expires_at: string | null;
}

interface CaseEntry {
  sl_no: string;
  case_no: string;
  court_no: string;
  party_details: string;
  petitioner_name: string;
  respondent_name: string;
  petitioner_advocate: string;
  respondent_advocate: string;
  district_remarks: string;
  status: string;
  district: string;
}

interface DailyResult {
  id: string;
  advocate_id: string;
  hearing_date: string;
  list_type: string;
  court_source: string;
  total_cases: number;
  cases_json: CaseEntry[];
  scraped_at: string;
}

/* ═══════════════════════════ CONSTANTS ═══════════════════════════ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const COURT_SOURCE_LABELS: Record<string, string> = {
  tshc: "Telangana High Court",
  ccc_hyd: "City Civil Court, Hyderabad",
  metro_sessions: "Metro Sessions Court, Nampally",
  rangareddy: "District Court, Ranga Reddy",
  medchal: "District Court, Medchal",
};

const STATUS_COLORS: Record<string, string> = {
  "FOR ORDERS": "bg-green-100 text-green-800",
  "FOR ADMISSION": "bg-amber-100 text-amber-800",
  "FOR ARGUMENTS": "bg-blue-100 text-blue-800",
  "FOR HEARING": "bg-purple-100 text-purple-800",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Trial",
  solo: "Solo",
  professional: "Pro",
  firm: "Firm",
};

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* ═══════════════════════════ MOCK DATA ═══════════════════════════ */

const MOCK_ADVOCATE: Advocate = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  name: "AMBALA RAJU",
  bar_council_id: "TS/315/2017",
  tshc_cis_code: "19941",
  email: "ambalaraju@example.com",
  phone: "+919876543210",
  plan_tier: "trial",
  is_active: true,
  created_at: "2026-03-01T10:00:00Z",
  trial_expires_at: "2026-03-31T23:59:59Z",
};

function getMockDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

const MOCK_DAILY_RESULTS: DailyResult[] = [
  {
    id: "r001",
    advocate_id: MOCK_ADVOCATE.id,
    hearing_date: getMockDate(0),
    list_type: "daily",
    court_source: "tshc",
    total_cases: 3,
    cases_json: [
      {
        sl_no: "1",
        case_no: "WP/4520/2025",
        court_no: "7",
        party_details: "M/S TECHFIN SOLUTIONS PVT LTD vs STATE OF TELANGANA AND OTHERS",
        petitioner_name: "M/S TECHFIN SOLUTIONS PVT LTD",
        respondent_name: "STATE OF TELANGANA AND OTHERS",
        petitioner_advocate: "AMBALA RAJU",
        respondent_advocate: "GP FOR SERVICES-II",
        district_remarks: "HYDERABAD / FOR ORDERS",
        status: "FOR ORDERS",
        district: "HYDERABAD",
      },
      {
        sl_no: "2",
        case_no: "CRLP/1892/2026",
        court_no: "7",
        party_details: "KRISHNA REDDY vs STATE OF TELANGANA",
        petitioner_name: "KRISHNA REDDY",
        respondent_name: "STATE OF TELANGANA",
        petitioner_advocate: "AMBALA RAJU, P. VENKAT RAO",
        respondent_advocate: "ADDITIONAL PUBLIC PROSECUTOR",
        district_remarks: "RANGA REDDY / FOR ADMISSION",
        status: "FOR ADMISSION",
        district: "RANGA REDDY",
      },
      {
        sl_no: "3",
        case_no: "WA/567/2024",
        court_no: "12",
        party_details: "LAKSHMI BAI vs MUNICIPAL CORPORATION OF HYDERABAD",
        petitioner_name: "LAKSHMI BAI",
        respondent_name: "MUNICIPAL CORPORATION OF HYDERABAD",
        petitioner_advocate: "K. SRINIVAS REDDY",
        respondent_advocate: "AMBALA RAJU",
        district_remarks: "HYDERABAD / FOR HEARING",
        status: "FOR HEARING",
        district: "HYDERABAD",
      },
    ],
    scraped_at: "2026-03-23T13:48:00Z",
  },
  {
    id: "r002",
    advocate_id: MOCK_ADVOCATE.id,
    hearing_date: getMockDate(0),
    list_type: "daily",
    court_source: "ccc_hyd",
    total_cases: 1,
    cases_json: [
      {
        sl_no: "1",
        case_no: "OS/2847/2023",
        court_no: "5",
        party_details: "RAMESH KUMAR vs SURESH ENTERPRISES",
        petitioner_name: "RAMESH KUMAR",
        respondent_name: "SURESH ENTERPRISES",
        petitioner_advocate: "AMBALA RAJU",
        respondent_advocate: "M. HARI PRASAD",
        district_remarks: "HYDERABAD",
        status: "",
        district: "HYDERABAD",
      },
    ],
    scraped_at: "2026-03-23T13:52:00Z",
  },
  {
    id: "r003",
    advocate_id: MOCK_ADVOCATE.id,
    hearing_date: getMockDate(2),
    list_type: "advance",
    court_source: "tshc",
    total_cases: 2,
    cases_json: [
      {
        sl_no: "1",
        case_no: "WP/8901/2026",
        court_no: "3",
        party_details: "SRINIVAS RAO vs COMMISSIONER OF POLICE",
        petitioner_name: "SRINIVAS RAO",
        respondent_name: "COMMISSIONER OF POLICE",
        petitioner_advocate: "AMBALA RAJU",
        respondent_advocate: "GP FOR HOME",
        district_remarks: "HYDERABAD / FOR ADMISSION",
        status: "FOR ADMISSION",
        district: "HYDERABAD",
      },
      {
        sl_no: "2",
        case_no: "CRP/456/2025",
        court_no: "3",
        party_details: "PADMA DEVI vs SUB-REGISTRAR SECUNDERABAD",
        petitioner_name: "PADMA DEVI",
        respondent_name: "SUB-REGISTRAR SECUNDERABAD",
        petitioner_advocate: "AMBALA RAJU, N. RAJESH KUMAR",
        respondent_advocate: "GP FOR REGISTRATION",
        district_remarks: "HYDERABAD / FOR ORDERS",
        status: "FOR ORDERS",
        district: "HYDERABAD",
      },
    ],
    scraped_at: "2026-03-23T13:48:00Z",
  },
];

/* ═══════════════════════════ HELPERS ═══════════════════════════ */

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_ABBR[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${DAY_ABBR[d.getDay()]} ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function getWeekDates(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - ((day + 6) % 7));
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getAdvocateRole(
  c: CaseEntry,
  advocateName: string
): "petitioner" | "respondent" | null {
  const name = advocateName.toUpperCase();
  if (c.petitioner_advocate?.toUpperCase().includes(name)) return "petitioner";
  if (c.respondent_advocate?.toUpperCase().includes(name)) return "respondent";
  return null;
}

function getStatusStyle(status: string): string {
  const key = status.trim().toUpperCase();
  return STATUS_COLORS[key] || "bg-gray-100 text-gray-600";
}

function getStatusLabel(status: string): string {
  const s = status.trim();
  return s || "Listed";
}

function formatScrapedAt(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  return `${h}:${minutes} ${ampm}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/* ═══════════════════════════ SUB-COMPONENTS ═══════════════════════════ */

/* ---- Skeleton loader ---- */
function SkeletonCards() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-6 w-8 bg-gray-200 rounded-full" />
          </div>
          {[1, 2].map((j) => (
            <div key={j} className="border-t border-gray-50 py-4">
              <div className="h-4 w-36 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-64 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---- Empty state ---- */
function EmptyState({ dateStr }: { dateStr: string }) {
  const today = toDateStr(new Date());
  const isFuture =
    dateStr > today &&
    dateStr !==
      toDateStr(
        new Date(new Date().setDate(new Date().getDate() + 1))
      );

  return (
    <div className="text-center py-16">
      {/* Gavel SVG illustration */}
      <svg
        className="w-24 h-24 mx-auto mb-6 text-brand-navy opacity-20"
        fill="none"
        viewBox="0 0 96 96"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M24 72l12-12m0 0l24-24m-24 24L24 48m12 12l12 12M60 36l12-12m-12 12l-8-8m8 8l8 8M72 24l-4-4m4 4l4 4"
        />
        <rect x="16" y="76" width="40" height="6" rx="2" />
      </svg>
      <h3 className="font-heading text-xl font-semibold text-brand-charcoal mb-2">
        No cause list data for {formatFullDate(dateStr)}
      </h3>
      <p className="text-brand-gray max-w-md mx-auto text-sm leading-relaxed">
        {isFuture
          ? "Cause list for this date has not been published yet."
          : "This could mean: no cases are listed for you, or the court hasn\u2019t published the cause list yet. Data is refreshed daily at 7:15 PM IST."}
      </p>
    </div>
  );
}

/* ---- Status pill ---- */
function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${getStatusStyle(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

/* ---- Role pill ---- */
function RolePill({ role }: { role: "petitioner" | "respondent" | null }) {
  if (!role) return null;
  const isPet = role === "petitioner";
  return (
    <span
      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
        isPet ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
      }`}
    >
      {isPet ? "For Petitioner" : "For Respondent"}
    </span>
  );
}

/* ---- Case row (desktop) ---- */
function CaseRow({
  c,
  advocateName,
}: {
  c: CaseEntry;
  advocateName: string;
}) {
  const role = getAdvocateRole(c, advocateName);
  return (
    <div className="border-t border-gray-100 py-4 px-5">
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-12 md:gap-4 md:items-start">
        {/* Serial */}
        <div className="col-span-1 text-brand-gray text-sm">{c.sl_no}</div>
        {/* Case + status + role */}
        <div className="col-span-3">
          <p className="font-semibold text-brand-charcoal">{c.case_no}</p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <StatusPill status={c.status} />
            <RolePill role={role} />
          </div>
        </div>
        {/* Parties */}
        <div className="col-span-4">
          <p className="text-sm text-brand-charcoal leading-snug">
            {titleCase(c.petitioner_name)}{" "}
            <span className="text-brand-gold font-semibold">vs</span>{" "}
            {titleCase(c.respondent_name)}
          </p>
        </div>
        {/* Advocates */}
        <div className="col-span-3 text-xs text-brand-gray leading-relaxed">
          <p>
            <span className="font-medium text-brand-charcoal">Pet:</span>{" "}
            {c.petitioner_advocate}
          </p>
          <p>
            <span className="font-medium text-brand-charcoal">Res:</span>{" "}
            {c.respondent_advocate}
          </p>
        </div>
        {/* District */}
        <div className="col-span-1 text-xs text-brand-gray">{c.district}</div>
      </div>

      {/* Mobile layout — expandable */}
      <MobileCaseCard c={c} role={role} />
    </div>
  );
}

/* ---- Mobile case card ---- */
function MobileCaseCard({
  c,
  role,
}: {
  c: CaseEntry;
  role: "petitioner" | "respondent" | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-brand-charcoal">{c.case_no}</p>
            <p className="text-sm text-brand-gray truncate mt-0.5">
              {titleCase(c.petitioner_name)}{" "}
              <span className="text-brand-gold font-semibold">vs</span>{" "}
              {titleCase(c.respondent_name)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <StatusPill status={c.status} />
            <RolePill role={role} />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="mt-3 pl-2 border-l-2 border-brand-gold/30 text-xs text-brand-gray space-y-1.5">
          <p>
            <span className="font-medium text-brand-charcoal">S.No:</span>{" "}
            {c.sl_no}
          </p>
          <p>
            <span className="font-medium text-brand-charcoal">Pet Adv:</span>{" "}
            {c.petitioner_advocate}
          </p>
          <p>
            <span className="font-medium text-brand-charcoal">Res Adv:</span>{" "}
            {c.respondent_advocate}
          </p>
          <p>
            <span className="font-medium text-brand-charcoal">District:</span>{" "}
            {c.district}
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- Court card ---- */
function CourtCard({
  courtNo,
  courtSource,
  cases,
  advocateName,
}: {
  courtNo: string;
  courtSource: string;
  cases: CaseEntry[];
  advocateName: string;
}) {
  const label = COURT_SOURCE_LABELS[courtSource] || courtSource;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-brand-navy/[0.03] border-b border-gray-100">
        <h4 className="font-heading font-semibold text-brand-charcoal">
          Court No. {courtNo}{" "}
          <span className="text-brand-gray font-body font-normal text-sm">
            &mdash; {label}
          </span>
        </h4>
        <span className="bg-brand-gold text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
          {cases.length}
        </span>
      </div>
      {/* Cases */}
      {cases.map((c, i) => (
        <CaseRow key={`${c.case_no}-${i}`} c={c} advocateName={advocateName} />
      ))}
    </div>
  );
}

/* ---- Weekly bar chart (sidebar) ---- */
function WeeklyBarChart({
  weekDates,
  caseCountByDate,
}: {
  weekDates: Date[];
  caseCountByDate: Record<string, number>;
}) {
  const counts = weekDates.map((d) => caseCountByDate[toDateStr(d)] || 0);
  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-2 h-20">
      {weekDates.map((d, i) => {
        const ds = toDateStr(d);
        const count = counts[i];
        const pct = (count / max) * 100;
        return (
          <div key={ds} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-brand-gray font-medium">
              {count || ""}
            </span>
            <div className="w-full bg-gray-100 rounded-t relative" style={{ height: "60px" }}>
              <div
                className="absolute bottom-0 left-0 right-0 bg-brand-gold/80 rounded-t transition-all duration-300"
                style={{ height: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-brand-gray">
              {DAY_ABBR[d.getDay()].charAt(0)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════ MAIN COMPONENT ═══════════════════════════ */

export default function DashboardPage() {
  /* ── Auth state (email lookup) ── */
  const [email, setEmail] = useState("");
  const [advocate, setAdvocate] = useState<Advocate | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  /* ── Data state ── */
  const [allResults, setAllResults] = useState<DailyResult[]>(MOCK_DAILY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [useMock, setUseMock] = useState(true);

  /* ── Date state ── */
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);

  const weekBase = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(weekBase), [weekBase]);

  /* ── Active advocate (mock or real) ── */
  const activeAdvocate = useMock ? MOCK_ADVOCATE : advocate;

  /* ── Filter results for selected date ── */
  const dateResults = useMemo(
    () => allResults.filter((r) => r.hearing_date === selectedDate),
    [allResults, selectedDate]
  );

  /* ── Group by list_type ── */
  const resultsByListType = useMemo(() => {
    const groups: Record<string, DailyResult[]> = {};
    for (const r of dateResults) {
      const key = r.list_type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    }
    return groups;
  }, [dateResults]);

  /* ── Advance list for "day after tomorrow" hint ── */
  const advanceResults = useMemo(() => {
    return allResults.filter(
      (r) => r.list_type === "advance" && r.hearing_date !== selectedDate
    );
  }, [allResults, selectedDate]);

  const advanceTotalCases = advanceResults.reduce(
    (sum, r) => sum + r.total_cases,
    0
  );
  const advanceDate =
    advanceResults.length > 0 ? advanceResults[0].hearing_date : null;

  /* ── Tab state ── */
  const availableTabs = useMemo(() => {
    const tabs: { key: string; label: string; badge?: string }[] = [];
    if (resultsByListType["daily"])
      tabs.push({ key: "daily", label: "Daily List" });
    if (resultsByListType["advance"])
      tabs.push({ key: "advance", label: "Advance List", badge: "Exclusive" });
    if (resultsByListType["supplementary"])
      tabs.push({ key: "supplementary", label: "Supplementary" });

    // District courts as a combined tab
    const districtTypes = dateResults.filter(
      (r) => r.court_source !== "tshc" && r.list_type === "daily"
    );
    if (districtTypes.length > 0)
      tabs.push({ key: "district", label: "District Courts" });

    if (tabs.length === 0) tabs.push({ key: "daily", label: "Daily List" });
    return tabs;
  }, [resultsByListType, dateResults]);

  const [activeTab, setActiveTab] = useState("daily");

  /* ── Cases for current tab, grouped by court ── */
  const courtGroups = useMemo(() => {
    let filtered: DailyResult[];

    if (activeTab === "district") {
      filtered = dateResults.filter(
        (r) => r.court_source !== "tshc" && r.list_type === "daily"
      );
    } else {
      filtered = dateResults.filter((r) => {
        if (activeTab === "daily") {
          return r.list_type === "daily" && r.court_source === "tshc";
        }
        return r.list_type === activeTab;
      });
    }

    // Flatten cases and group by court_source + court_no
    const groups: Record<
      string,
      { courtNo: string; courtSource: string; cases: CaseEntry[] }
    > = {};

    for (const r of filtered) {
      for (const c of r.cases_json) {
        const key = `${r.court_source}::${c.court_no}`;
        if (!groups[key]) {
          groups[key] = {
            courtNo: c.court_no,
            courtSource: r.court_source,
            cases: [],
          };
        }
        groups[key].cases.push(c);
      }
    }

    return Object.values(groups);
  }, [dateResults, activeTab]);

  /* ── Stats ── */
  const totalCasesToday = dateResults
    .filter((r) => r.list_type === "daily")
    .reduce((sum, r) => sum + r.total_cases, 0);

  const uniqueCourts = useMemo(() => {
    const courts = new Set<string>();
    for (const r of dateResults.filter((r) => r.list_type === "daily")) {
      for (const c of r.cases_json) {
        courts.add(`${r.court_source}::${c.court_no}`);
      }
    }
    return courts.size;
  }, [dateResults]);

  /* ── Weekly case counts for bar chart ── */
  const caseCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of allResults) {
      counts[r.hearing_date] = (counts[r.hearing_date] || 0) + r.total_cases;
    }
    return counts;
  }, [allResults]);

  /* ── Latest scraped_at ── */
  const lastScraped = useMemo(() => {
    if (dateResults.length === 0) return null;
    return dateResults.reduce((latest, r) =>
      r.scraped_at > latest.scraped_at ? r : latest
    ).scraped_at;
  }, [dateResults]);

  /* ── Courts monitored with status ── */
  const monitoredCourts = useMemo(() => {
    const all = Object.keys(COURT_SOURCE_LABELS);
    const active = new Set(dateResults.map((r) => r.court_source));
    return all.map((key) => ({
      key,
      label: COURT_SOURCE_LABELS[key],
      hasData: active.has(key),
    }));
  }, [dateResults]);

  /* ── Courts with zero cases ── */
  const zeroCourts = useMemo(() => {
    const activeCourts = new Set(
      dateResults
        .filter((r) => r.total_cases > 0)
        .map((r) => r.court_source)
    );
    return Object.entries(COURT_SOURCE_LABELS)
      .filter(([key]) => !activeCourts.has(key))
      .map(([, label]) => label);
  }, [dateResults]);

  /* ── Auth: email lookup ── */
  const handleLookup = useCallback(
    async (ev: React.FormEvent) => {
      ev.preventDefault();
      if (!email.trim()) return;
      setLookupLoading(true);
      setLookupError("");
      try {
        const res = await fetch(
          `${API_URL}/api/advocates/lookup?email=${encodeURIComponent(email.trim())}`
        );
        if (!res.ok) throw new Error("Lookup failed");
        const data = await res.json();
        if (!data.success)
          throw new Error(
            "No advocate found with this email. Please register first."
          );
        setAdvocate(data.advocate);
        setUseMock(false);
        // Fetch real data
        fetchResults(data.advocate.id, selectedDate);
      } catch (err: unknown) {
        setLookupError(err instanceof Error ? err.message : "Lookup failed");
      } finally {
        setLookupLoading(false);
      }
    },
    [email, selectedDate]
  );

  async function fetchResults(advocateId: string, date: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/results?advocate_id=${advocateId}&hearing_date=${date}`
      );
      if (res.ok) {
        const data = await res.json();
        setAllResults(data.results || []);
      }
    } catch {
      // Fall back to current data
    } finally {
      setLoading(false);
    }
  }

  function handleDateSelect(dateStr: string) {
    setSelectedDate(dateStr);
    setActiveTab("daily");
    if (!useMock && advocate) {
      fetchResults(advocate.id, dateStr);
    }
  }

  /* ═══════════════════════════ RENDER ═══════════════════════════ */

  /* ── Login gate ── */
  if (!activeAdvocate) {
    return (
      <main className="min-h-screen bg-brand-bg">
        <nav className="bg-brand-navy px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-white">
            CauseListPro
          </Link>
          <Link
            href="/register"
            className="bg-brand-gold text-brand-navy px-5 py-2 rounded font-semibold text-sm hover:bg-brand-gold-light transition-colors"
          >
            Register
          </Link>
        </nav>
        <div className="max-w-md mx-auto px-6 pt-24">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
            <h1 className="font-heading text-2xl font-bold text-brand-charcoal mb-2">
              Welcome Back
            </h1>
            <p className="text-brand-gray text-sm mb-6">
              Enter your registered email to access your dashboard.
            </p>
            <form onSubmit={handleLookup}>
              <label className="block text-sm font-medium text-brand-charcoal mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold transition"
              />
              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full mt-4 bg-brand-navy text-white py-3 rounded-lg font-semibold text-sm hover:bg-brand-navy/90 transition disabled:opacity-50"
              >
                {lookupLoading ? "Finding your account..." : "Access Dashboard"}
              </button>
            </form>
            {lookupError && (
              <p className="text-red-600 text-sm mt-3">{lookupError}</p>
            )}
            <p className="text-brand-gray text-xs mt-4 text-center">
              Don&rsquo;t have an account?{" "}
              <Link
                href="/register"
                className="text-brand-gold font-medium hover:underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      {/* ─── TOP BAR ─── */}
      <nav className="sticky top-0 z-50 bg-brand-navy shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-heading text-lg font-bold text-white tracking-wide">
            CauseListPro
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium hidden sm:inline">
              {titleCase(activeAdvocate.name)}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                activeAdvocate.plan_tier === "trial"
                  ? "bg-brand-gold/20 text-brand-gold"
                  : "bg-brand-green/20 text-green-400"
              }`}
            >
              {PLAN_LABELS[activeAdvocate.plan_tier] || activeAdvocate.plan_tier}
            </span>
            <button
              onClick={() => {
                setAdvocate(null);
                setUseMock(false);
                setAllResults([]);
              }}
              className="text-gray-400 hover:text-white text-sm transition-colors ml-2"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* ─── WEEK STRIP ─── */}
      <div className="bg-white border-b border-gray-100 sticky top-[52px] z-40">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center gap-2">
            {/* Prev week */}
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-brand-gray transition-colors flex-shrink-0"
              aria-label="Previous week"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Date pills */}
            <div className="flex gap-1.5 overflow-x-auto flex-1 justify-center scrollbar-hide">
              {weekDates.map((d) => {
                const ds = toDateStr(d);
                const isSelected = ds === selectedDate;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = ds === toDateStr(new Date());

                return (
                  <button
                    key={ds}
                    onClick={() => handleDateSelect(ds)}
                    className={`flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all min-w-[52px] ${
                      isSelected
                        ? "bg-brand-gold text-white shadow-sm"
                        : isWeekend
                        ? "text-gray-400 hover:bg-gray-50"
                        : "text-brand-charcoal hover:bg-gray-50"
                    } ${isToday && !isSelected ? "ring-1 ring-brand-gold/40" : ""}`}
                  >
                    <span className="text-[10px] uppercase tracking-wide">
                      {DAY_ABBR[d.getDay()]}
                    </span>
                    <span className="text-base font-semibold leading-tight">
                      {d.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Next week */}
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-brand-gray transition-colors flex-shrink-0"
              aria-label="Next week"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
        <div className="flex gap-6">
          {/* ─── LEFT: Main area ─── */}
          <div className="flex-1 min-w-0">
            {/* Summary headline */}
            <div className="mb-6">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-brand-charcoal">
                {loading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : totalCasesToday > 0 ? (
                  <>
                    {totalCasesToday} case{totalCasesToday !== 1 ? "s" : ""} across{" "}
                    {uniqueCourts} court{uniqueCourts !== 1 ? "s" : ""}
                  </>
                ) : (
                  "No cases listed"
                )}
              </h1>
              <p className="text-brand-gray mt-1">{formatFullDate(selectedDate)}</p>
              {advanceTotalCases > 0 && advanceDate && advanceDate !== selectedDate && (
                <p className="text-sm text-brand-gold mt-1.5 font-medium">
                  Also: {advanceTotalCases} case{advanceTotalCases !== 1 ? "s" : ""}{" "}
                  on {formatShortDate(advanceDate)} (advance list)
                </p>
              )}
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-brand-navy rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{totalCasesToday}</p>
                <p className="text-gray-400 text-xs mt-0.5">Total Cases</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-brand-charcoal">{uniqueCourts}</p>
                <p className="text-brand-gray text-xs mt-0.5">Courts</p>
              </div>
            </div>

            {/* List type tabs */}
            <div className="flex gap-1 mb-6 overflow-x-auto border-b border-gray-200">
              {availableTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? "border-brand-gold text-brand-charcoal"
                      : "border-transparent text-brand-gray hover:text-brand-charcoal"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1.5 text-[10px] bg-brand-gold/15 text-brand-gold px-1.5 py-0.5 rounded-full font-semibold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Court-grouped cards */}
            {loading ? (
              <SkeletonCards />
            ) : courtGroups.length > 0 ? (
              <div className="space-y-4">
                {courtGroups.map((g) => (
                  <CourtCard
                    key={`${g.courtSource}::${g.courtNo}`}
                    courtNo={g.courtNo}
                    courtSource={g.courtSource}
                    cases={g.cases}
                    advocateName={activeAdvocate.name}
                  />
                ))}

                {/* Zero-case courts */}
                {zeroCourts.length > 0 && activeTab === "daily" && (
                  <div className="text-sm text-brand-gray border border-dashed border-gray-200 rounded-xl px-5 py-3 text-center">
                    {zeroCourts.join(", ")} &mdash; no cases
                  </div>
                )}
              </div>
            ) : (
              <EmptyState dateStr={selectedDate} />
            )}

            {/* Mobile-only: source attribution + account info */}
            <div className="lg:hidden mt-8 space-y-4">
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-heading text-sm font-semibold text-brand-charcoal mb-3">
                  Account
                </h3>
                <div className="text-xs text-brand-gray space-y-1.5">
                  <p>
                    <span className="font-medium text-brand-charcoal">Bar Council ID:</span>{" "}
                    {activeAdvocate.bar_council_id}
                  </p>
                  <p>
                    <span className="font-medium text-brand-charcoal">CIS Code:</span>{" "}
                    {activeAdvocate.tshc_cis_code
                      ? `\u2022\u2022\u2022${activeAdvocate.tshc_cis_code.slice(-2)}`
                      : "N/A"}
                  </p>
                  <p>
                    <span className="font-medium text-brand-charcoal">Email:</span>{" "}
                    {activeAdvocate.email}
                  </p>
                  <p>
                    <span className="font-medium text-brand-charcoal">Plan:</span>{" "}
                    {PLAN_LABELS[activeAdvocate.plan_tier] || activeAdvocate.plan_tier}
                    {activeAdvocate.plan_tier === "trial" &&
                      activeAdvocate.trial_expires_at && (
                        <span className="text-brand-gold ml-1">
                          (expires{" "}
                          {new Date(activeAdvocate.trial_expires_at).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" }
                          )}
                          )
                        </span>
                      )}
                  </p>
                </div>
              </div>
              {lastScraped && (
                <p className="text-[11px] text-brand-gray text-center">
                  Data as of {formatScrapedAt(lastScraped)}
                </p>
              )}
              <p className="text-[11px] text-brand-gray text-center">
                Source: High Court for the State of Telangana (tshc.gov.in)
              </p>
            </div>
          </div>

          {/* ─── RIGHT SIDEBAR (desktop only) ─── */}
          <aside className="hidden lg:block w-72 flex-shrink-0 space-y-4">
            {/* Weekly overview */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-heading text-sm font-semibold text-brand-charcoal mb-3">
                Weekly Overview
              </h3>
              <WeeklyBarChart
                weekDates={weekDates}
                caseCountByDate={caseCountByDate}
              />
            </div>

            {/* Courts monitored */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-heading text-sm font-semibold text-brand-charcoal mb-3">
                Courts Monitored
              </h3>
              <ul className="space-y-2">
                {monitoredCourts.map((c) => (
                  <li
                    key={c.key}
                    className="flex items-center gap-2 text-xs text-brand-gray"
                  >
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        c.hasData ? "bg-brand-green" : "bg-gray-300"
                      }`}
                    />
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* Account info */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-heading text-sm font-semibold text-brand-charcoal mb-3">
                Account
              </h3>
              <div className="text-xs text-brand-gray space-y-2">
                <div className="flex justify-between">
                  <span>Plan</span>
                  <span className="font-medium text-brand-charcoal">
                    {PLAN_LABELS[activeAdvocate.plan_tier] || activeAdvocate.plan_tier}
                  </span>
                </div>
                {activeAdvocate.plan_tier === "trial" &&
                  activeAdvocate.trial_expires_at && (
                    <div className="flex justify-between">
                      <span>Trial Expires</span>
                      <span className="font-medium text-brand-gold">
                        {new Date(activeAdvocate.trial_expires_at).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between">
                  <span>Bar Council ID</span>
                  <span className="font-medium text-brand-charcoal">
                    {activeAdvocate.bar_council_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>CIS Code</span>
                  <span className="font-medium text-brand-charcoal">
                    {activeAdvocate.tshc_cis_code
                      ? `\u2022\u2022\u2022${activeAdvocate.tshc_cis_code.slice(-2)}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="font-medium text-brand-charcoal truncate ml-2">
                    {activeAdvocate.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Last updated */}
            {lastScraped && (
              <div className="text-[11px] text-brand-gray px-1">
                <span className="font-medium">Last Updated:</span>{" "}
                {formatScrapedAt(lastScraped)}
              </div>
            )}

            {/* Source attribution */}
            <div className="text-[11px] text-brand-gray px-1 leading-relaxed">
              Source: High Court for the State of Telangana (tshc.gov.in)
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
