import Link from "next/link";

const COURTS = [
  "TSHC High Court",
  "Ranga Reddy District Court",
  "City Civil Court, Hyderabad",
  "Metropolitan Sessions Court",
  "Medchal-Malkajgiri District Court",
];

const FEATURES = [
  {
    title: "5 Courts Monitored",
    desc: "We check the Telangana High Court and 4 Hyderabad district courts every single evening.",
  },
  {
    title: "Daily Email by 8 PM",
    desc: "Get tomorrow\u2019s cause list in your inbox before you leave the office. No login required.",
  },
  {
    title: "Zero Manual Work",
    desc: "No more visiting 5 different websites. We handle captchas, retries, and formatting for you.",
  },
];

const STEPS = [
  { num: "1", title: "Register", desc: "Enter your Bar Council ID and email. Takes 30 seconds." },
  { num: "2", title: "We Scan 5 Courts", desc: "Every evening we scrape all 5 court websites for your cases." },
  { num: "3", title: "You Get Email", desc: "A clean summary of tomorrow\u2019s hearings lands in your inbox by 8 PM." },
];

const PLANS = [
  { name: "Free Trial", price: "Free", period: "30 days", features: ["All 5 courts", "Daily email alerts", "No credit card needed"] },
  { name: "Solo", price: "\u20B9199", period: "/month", features: ["All 5 courts", "Daily email alerts", "Priority support", "WhatsApp alerts (soon)"], highlight: true },
  { name: "Professional", price: "\u20B9399", period: "/month", features: ["All 5 courts", "Daily email alerts", "Priority support", "WhatsApp alerts (soon)", "Multiple Bar IDs", "Dashboard access"] },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="bg-brand-dark px-6 py-4 flex items-center justify-between">
        <span className="text-brand-gold font-bold text-xl tracking-wide">CauseListPro</span>
        <div className="flex gap-4 items-center">
          <Link href="/dashboard" className="text-gray-300 hover:text-white text-sm">
            Dashboard
          </Link>
          <Link
            href="/register"
            className="bg-brand-gold text-brand-dark px-4 py-2 rounded font-semibold text-sm hover:bg-brand-gold-light transition"
          >
            Register Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-brand-dark text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Never Miss a <span className="text-brand-gold">Court Hearing</span> Again
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Daily cause list alerts from 5 Hyderabad courts, straight to your email by 8 PM
          </p>
          <Link
            href="/register"
            className="inline-block bg-brand-gold text-brand-dark px-8 py-4 rounded-lg font-bold text-lg hover:bg-brand-gold-light transition"
          >
            Register Free &mdash; 30 Day Trial
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-brand-dark">Why Advocates Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="border border-gray-200 rounded-lg p-6 text-center hover:shadow-lg transition">
                <h3 className="text-xl font-semibold mb-3 text-brand-dark">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-brand-dark">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 bg-brand-gold text-brand-dark rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {s.num}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-brand-dark">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courts Covered */}
      <section className="py-16 px-6 bg-brand-dark text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">
            <span className="text-brand-gold">5 Courts</span> Covered Daily
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {COURTS.map((c) => (
              <div key={c} className="bg-brand-green rounded-lg p-4 text-sm font-medium">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-brand-dark">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-lg p-6 text-center border-2 ${
                  p.highlight ? "border-brand-gold shadow-lg" : "border-gray-200"
                }`}
              >
                {p.highlight && (
                  <span className="inline-block bg-brand-gold text-brand-dark text-xs font-bold px-3 py-1 rounded-full mb-4">
                    MOST POPULAR
                  </span>
                )}
                <h3 className="text-xl font-bold mb-2 text-brand-dark">{p.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-brand-dark">{p.price}</span>
                  <span className="text-gray-500 text-sm">{p.period}</span>
                </div>
                <ul className="text-left text-sm text-gray-600 space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">&#10003;</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block w-full py-2 rounded font-semibold transition ${
                    p.highlight
                      ? "bg-brand-gold text-brand-dark hover:bg-brand-gold-light"
                      : "bg-gray-100 text-brand-dark hover:bg-gray-200"
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-gray-400 py-8 px-6 text-center text-sm">
        <p className="mb-2">Source: tshc.gov.in, eCourts India. CauseListPro is not affiliated with any court.</p>
        <p>&copy; {new Date().getFullYear()} CauseListPro. All rights reserved.</p>
      </footer>
    </main>
  );
}
