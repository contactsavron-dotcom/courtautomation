"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";

/* ───────────────────────── DATA ───────────────────────── */

const PAIN_POINTS = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
    ),
    text: "Checking 3\u20135 court websites manually",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
    ),
    text: "Scrolling through hundreds of cases to find yours",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3l9.66 16.5H2.34L12 3z" />
      </svg>
    ),
    text: "The fear of missing a listing and facing ex-parte orders",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Register",
    desc: "Enter your name and Bar Council ID. Takes 30 seconds.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zm-4 7c-4.418 0-8 1.79-8 4v1h16v-1c0-2.21-3.582-4-8-4z" />
      </svg>
    ),
  },
  {
    num: "2",
    title: "We Scan",
    desc: "Every evening, our system checks multiple Telangana courts for your cases.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: "3",
    title: "You Get Notified",
    desc: "Receive a detailed email with tomorrow\u2019s hearing list by 8 PM.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const FEATURES = [
  { title: "Multiple Courts Covered", desc: "High Court, District Courts, and more across Telangana" },
  { title: "Daily Email Alerts", desc: "Formatted case list delivered to your inbox every evening" },
  { title: "Case Details Included", desc: "Case number, parties, court/judge, and hearing status" },
  { title: "On-Demand Check", desc: "Check your cause list anytime from the dashboard" },
  { title: "Advance Notifications", desc: "Know about cases days before the hearing" },
  { title: "Reliable & Accurate", desc: "Direct data from court websites, verified before delivery" },
];

const FEATURE_ICONS = [
  <svg key="f1" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-10h4m-4 4h4m6-4v.01M17 15v.01" /></svg>,
  <svg key="f2" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  <svg key="f3" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  <svg key="f4" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>,
  <svg key="f5" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  <svg key="f6" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
];

const TESTIMONIALS = [
  {
    quote: "I used to spend 30 minutes every evening checking cause lists. Now I just check my email.",
    author: "Advocate, TSHC",
  },
  {
    quote: "The advance notification feature helped me prepare for a hearing I would have missed.",
    author: "Advocate, Ranga Reddy",
  },
  {
    quote: "Finally, a tool built for Indian advocates that actually works.",
    author: "Senior Advocate, Hyderabad",
  },
];

const PLANS = [
  {
    name: "Free Trial",
    price: "\u20B90",
    period: "/month",
    sub: "30 days, all features",
    features: ["All courts covered", "Daily email alerts", "Dashboard access", "No credit card required"],
    cta: "Start Free Trial",
  },
  {
    name: "Solo",
    price: "\u20B9199",
    period: "/month",
    sub: "1 advocate",
    features: ["All courts covered", "Daily email alerts", "Dashboard access", "Email support"],
    cta: "Choose Solo",
    highlight: true,
  },
  {
    name: "Professional",
    price: "\u20B9399",
    period: "/month",
    sub: "1 advocate",
    features: ["All courts covered", "Daily email alerts", "Dashboard access", "Priority support", "Advance alerts", "Case history"],
    cta: "Choose Professional",
  },
];

const FAQS = [
  {
    q: "Which courts are covered?",
    a: "We currently cover multiple Telangana courts including the High Court and major district courts in Hyderabad. We\u2019re expanding coverage regularly.",
  },
  {
    q: "How do I receive alerts?",
    a: "Via email to your registered address. WhatsApp notifications coming soon.",
  },
  {
    q: "Is my data safe?",
    a: "Yes. We only access publicly available cause list data. Your personal information is encrypted and never shared.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no lock-in. Cancel from your dashboard.",
  },
  {
    q: "What if the cause list isn\u2019t published yet?",
    a: "Our system retries automatically. If the court hasn\u2019t published by 9 PM, we notify you of the delay.",
  },
];

/* ───────────────────────── HOOKS ───────────────────────── */

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function FadeIn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className={`fade-in-section ${className}`}>
      {children}
    </div>
  );
}

/* ───────────────────────── COMPONENT ───────────────────────── */

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <main className="min-h-screen bg-brand-bg">
      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "nav-scrolled py-3" : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-white tracking-wide">
            CauseListPro
          </Link>
          <div className="flex gap-3 items-center">
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="bg-brand-gold text-brand-navy px-5 py-2 rounded font-semibold text-sm hover:bg-brand-gold-light transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── SECTION 1: HERO ─── */}
      <section className="relative bg-brand-navy hero-pattern pt-32 pb-24 md:pt-40 md:pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Know Your Court Schedule{" "}
            <span className="text-brand-gold">Before Anyone Else</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            CauseListPro scans Telangana court websites every evening and delivers your
            personalized cause list &mdash; so you never miss a hearing.
          </p>
          <Link
            href="/register"
            className="inline-block bg-brand-gold text-brand-navy px-10 py-4 rounded-lg font-bold text-lg hover:bg-brand-gold-light transition-colors shadow-lg"
          >
            Start Free Trial
          </Link>
          <p className="text-gray-400 text-sm mt-4">
            No credit card required &middot; 30-day free trial
          </p>
        </div>
      </section>

      {/* ─── SECTION 2: PAIN POINT ─── */}
      <section className="py-20 md:py-28 px-6 bg-brand-bg">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-brand-charcoal mb-14">
              Every Evening, the Same Routine
            </h2>
            <div className="grid md:grid-cols-3 gap-8 mb-14">
              {PAIN_POINTS.map((p, i) => (
                <div
                  key={i}
                  className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-brand-gold mb-5 flex justify-center">{p.icon}</div>
                  <p className="text-brand-charcoal font-medium text-lg leading-snug">{p.text}</p>
                </div>
              ))}
            </div>
            <p className="text-xl md:text-2xl text-brand-gray font-light italic">
              What if all of this was done for you, automatically?
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── SECTION 3: HOW IT WORKS ─── */}
      <section className="py-20 md:py-28 px-6 bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              Three Steps. Zero Effort.
            </h2>
            <p className="text-brand-gray mb-14 text-lg">From registration to notification in under a minute.</p>
            <div className="grid md:grid-cols-3 gap-10 relative steps-connector">
              {STEPS.map((s) => (
                <div key={s.num} className="relative z-10">
                  <div className="w-14 h-14 bg-brand-navy text-brand-gold rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-5 shadow-md">
                    {s.num}
                  </div>
                  <div className="text-brand-gold mb-3 flex justify-center">{s.icon}</div>
                  <h3 className="font-heading text-xl font-semibold mb-2 text-brand-charcoal">
                    {s.title}
                  </h3>
                  <p className="text-brand-gray leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── SECTION 4: FEATURES ─── */}
      <section className="py-20 md:py-28 px-6 bg-brand-bg">
        <FadeIn>
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-brand-charcoal mb-14">
              Everything You Need to Stay Prepared
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="bg-white border border-gray-100 rounded-xl p-7 hover:shadow-md transition-shadow"
                >
                  <div className="text-brand-gold mb-4">{FEATURE_ICONS[i]}</div>
                  <h3 className="font-heading text-lg font-semibold mb-2 text-brand-charcoal">
                    {f.title}
                  </h3>
                  <p className="text-brand-gray text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── SECTION 5: SOCIAL PROOF ─── */}
      <section className="py-20 md:py-28 px-6 bg-white">
        <FadeIn>
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-brand-charcoal mb-14">
              Trusted by Advocates Across Telangana
            </h2>
            {/* Placeholder testimonials — replace with real ones */}
            <div className="grid md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="bg-brand-bg border border-gray-100 rounded-xl p-8 text-left"
                >
                  <svg className="w-8 h-8 text-brand-gold mb-4 opacity-40" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-brand-charcoal mb-5 leading-relaxed italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="text-brand-gray text-sm font-medium">&mdash; {t.author}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── SECTION 6: PRICING ─── */}
      <section className="py-20 md:py-28 px-6 bg-brand-bg">
        <FadeIn>
          <div className="max-w-5xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-brand-charcoal mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-brand-gray text-center mb-14 text-lg">
              Start free. Upgrade when you&rsquo;re ready.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {PLANS.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-xl p-8 text-center border-2 transition-shadow ${
                    p.highlight
                      ? "border-brand-gold shadow-lg bg-white relative"
                      : "border-gray-200 bg-white hover:shadow-md"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-gold text-brand-navy text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  )}
                  <h3 className="font-heading text-xl font-bold mb-1 text-brand-charcoal">
                    {p.name}
                  </h3>
                  <p className="text-brand-gray text-sm mb-4">{p.sub}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-brand-charcoal">{p.price}</span>
                    <span className="text-brand-gray text-sm">{p.period}</span>
                  </div>
                  <ul className="text-left text-sm text-brand-gray space-y-3 mb-8">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-brand-green mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={`block w-full py-3 rounded-lg font-semibold transition-colors ${
                      p.highlight
                        ? "bg-brand-gold text-brand-navy hover:bg-brand-gold-light"
                        : "bg-brand-navy text-white hover:bg-opacity-90"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── SECTION 7: FAQ ─── */}
      <section className="py-20 md:py-28 px-6 bg-white">
        <FadeIn>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-center text-brand-charcoal mb-14">
              Common Questions
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq, i) => (
                <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-brand-charcoal pr-4">{faq.q}</span>
                    <svg
                      className={`w-5 h-5 text-brand-gray flex-shrink-0 transition-transform duration-300 ${
                        openFaq === i ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`faq-answer ${openFaq === i ? "open" : ""}`}>
                    <p className="px-6 pb-5 text-brand-gray leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ─── SECTION 8: FINAL CTA ─── */}
      <section className="py-24 md:py-32 px-6 bg-brand-navy hero-pattern text-center">
        <FadeIn>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
              Stop Checking. <span className="text-brand-gold">Start Knowing.</span>
            </h2>
            <p className="text-gray-300 text-lg mb-10 font-light">
              Join advocates across Telangana who never miss a hearing.
            </p>
            <Link
              href="/register"
              className="inline-block bg-brand-gold text-brand-navy px-10 py-4 rounded-lg font-bold text-lg hover:bg-brand-gold-light transition-colors shadow-lg"
            >
              Register Now &mdash; It&rsquo;s Free
            </Link>
            <p className="text-gray-500 text-xs mt-6">
              Source: tshc.gov.in, eCourts India. CauseListPro is not affiliated with any court.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-brand-navy border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <span className="font-heading text-lg font-bold text-white">CauseListPro</span>
              <p className="text-gray-400 text-sm mt-2">
                Daily court cause list alerts for Indian advocates.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link>
              <Link href="/register" className="text-gray-400 hover:text-white transition-colors">Register</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-500">
            <p>&copy; 2026 CauseListPro. All rights reserved.</p>
            <p>
              Contact:{" "}
              <a href="mailto:contactsavron@gmail.com" className="text-gray-400 hover:text-white transition-colors">
                contactsavron@gmail.com
              </a>
            </p>
          </div>
          <p className="text-gray-600 text-xs mt-4">
            Source: tshc.gov.in, eCourts India. CauseListPro is not affiliated with any court.
          </p>
        </div>
      </footer>
    </main>
  );
}
