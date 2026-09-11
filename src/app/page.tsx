"use client";

import { useRouter } from "next/navigation";

const categories = [
  { icon: "🍔", name: "Food", sub: "Save More", tone: "bg-rose-50" },
  { icon: "🛍️", name: "Shopping", sub: "Best Deals", tone: "bg-violet-50" },
  { icon: "🏋️", name: "Fitness", sub: "Stay Healthy", tone: "bg-emerald-50" },
  { icon: "💇", name: "Salon", sub: "Look Great", tone: "bg-pink-50" },
  { icon: "🎓", name: "Education", sub: "Learn More", tone: "bg-blue-50" },
  { icon: "✈️", name: "Travel", sub: "Explore More", tone: "bg-sky-50" },
  { icon: "🎮", name: "Entertainment", sub: "Have Fun", tone: "bg-amber-50" },
  { icon: "•••", name: "More", sub: "Discover", tone: "bg-slate-50" },
];

const offers = [
  { icon: "🍕", name: "Food & Dining", offer: "Exclusive Student Offers", distance: "Near you" },
  { icon: "☕", name: "Cafes & Drinks", offer: "Special Student Savings", distance: "Near you" },
  { icon: "👕", name: "Shopping", offer: "Student-only deals", distance: "Local partners" },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6ef] text-[#07111f]">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-24 h-96 w-96 rounded-full bg-[#d4af37]/15 blur-3xl" />
        <div className="absolute right-[-180px] top-[30%] h-[32rem] w-[32rem] rounded-full bg-[#e9d9a1]/25 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[35%] h-96 w-96 rounded-full bg-[#e8d7ff]/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <header className="flex h-20 items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07111f] via-[#26303b] to-[#b18a16] text-sm font-black text-white shadow-[0_10px_25px_rgba(7,17,31,.18)]">
              SBC
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-black tracking-[.18em]">
                STUDENT BENEFIT CARD
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-[.22em] text-slate-500">
                One Card • More Benefits
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            {["Home", "For Students", "For Businesses", "How It Works", "Offers", "About"].map(
              (item, i) => (
                <button
                  key={item}
                  type="button"
                  className={`text-sm font-bold transition ${
                    i === 0 ? "text-[#8a680c]" : "text-slate-600 hover:text-[#07111f]"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Search"
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/80 text-lg shadow-sm backdrop-blur sm:flex"
            >
              ⌕
            </button>
            <button
              type="button"
              onClick={() => router.push("/student/register")}
              className="rounded-full bg-[#07111f] px-5 py-3 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#101d2e]"
            >
              Get Started <span className="ml-1">→</span>
            </button>
          </div>
        </header>

        {/* HERO */}
        <section className="grid items-center gap-10 pb-10 pt-6 lg:grid-cols-[.95fr_1.05fr] lg:gap-8 lg:pt-12">
          <div className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-white/80 px-4 py-2 text-[11px] font-black uppercase tracking-[.16em] text-[#8a680c] shadow-sm backdrop-blur">
              ✨ Welcome to SBC
            </div>

            <h1 className="max-w-2xl text-[3.25rem] font-black leading-[.96] tracking-[-.045em] sm:text-6xl lg:text-[5rem]">
              Student
              <br />
              Benefit Card.
              <br />
              <span className="bg-gradient-to-r from-[#8a680c] via-[#b18a16] to-[#e0b83f] bg-clip-text text-transparent">
                More Benefits.
              </span>
              <br />
              <span className="bg-gradient-to-r from-[#d29e1a] to-[#f0c85a] bg-clip-text text-transparent">
                More Savings.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-7 text-slate-600 sm:text-lg">
              Discover exclusive student offers and benefits from partner
              businesses — all through one simple platform.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push("/student/login")}
                className="rounded-2xl bg-[#b18a16] px-6 py-4 text-sm font-black text-white shadow-[0_15px_35px_rgba(177,138,22,.25)] transition hover:-translate-y-1"
              >
                Explore Offers <span className="ml-2">→</span>
              </button>
              <button
                type="button"
                className="rounded-2xl border border-black/10 bg-white/80 px-6 py-4 text-sm font-black text-[#07111f] shadow-sm backdrop-blur transition hover:-translate-y-1"
              >
                ◉ &nbsp; How It Works
              </button>
            </div>

            {/* Mobile category grid */}
            <div className="mt-8 grid grid-cols-4 gap-2 sm:hidden">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className={`rounded-2xl ${cat.tone} p-3 text-center shadow-sm`}
                >
                  <div className="text-xl">{cat.icon}</div>
                  <p className="mt-1 text-[10px] font-black">{cat.name}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 hidden grid-cols-4 gap-3 sm:grid">
              {categories.slice(0, 4).map((cat) => (
                <div
                  key={cat.name}
                  className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur"
                >
                  <div className="text-2xl">{cat.icon}</div>
                  <p className="mt-2 text-xs font-black">{cat.name}</p>
                  <p className="text-[10px] text-slate-500">{cat.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* HERO VISUAL / PORTAL */}
          <div className="relative mx-auto w-full max-w-2xl">
            {/* Decorative glow */}
            <div className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e8c75c]/25 blur-3xl" />

            <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_290px]">
              {/* Student visual card — CSS illustration, no external asset required */}
              <div className="relative hidden min-h-[500px] overflow-hidden rounded-[3rem] border border-white/80 bg-gradient-to-b from-[#fffdf8] to-[#f2ead8] shadow-[0_35px_90px_rgba(7,17,31,.14)] sm:block">
                <div className="absolute left-7 top-7 rounded-full border border-[#d4af37]/30 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#8a680c]">
                  Smart Students Choose SBC
                </div>

                <div className="absolute left-1/2 top-28 flex h-64 w-64 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#f7dc76] to-[#fff8dc]">
                  <div className="relative flex h-48 w-40 items-end justify-center">
                    <div className="absolute top-0 h-28 w-28 rounded-full bg-[#c98d62] shadow-inner" />
                    <div className="absolute top-8 h-24 w-32 rounded-[48%] bg-[#5d3c2a]" />
                    <div className="absolute top-14 z-10 h-24 w-20 rounded-[45%] bg-[#dba277]" />
                    <div className="absolute top-24 z-20 h-28 w-32 rounded-t-[55px] bg-[#7891a5]" />
                    <div className="absolute bottom-0 z-30 h-20 w-36 rounded-t-[45px] bg-[#e8a98b]" />
                  </div>
                </div>

                {/* Floating chips */}
                <div className="absolute left-5 top-48 rounded-2xl bg-white px-4 py-3 shadow-xl">
                  <span className="text-lg">🍔</span>
                  <span className="ml-2 text-xs font-black">Food</span>
                </div>
                <div className="absolute right-5 top-40 rounded-2xl bg-white px-4 py-3 shadow-xl">
                  <span className="text-lg">🏋️</span>
                  <span className="ml-2 text-xs font-black">Fitness</span>
                </div>
                <div className="absolute left-7 top-80 rounded-2xl bg-white px-4 py-3 shadow-xl">
                  <span className="text-lg">🛍️</span>
                  <span className="ml-2 text-xs font-black">Shopping</span>
                </div>
                <div className="absolute right-4 top-80 rounded-2xl bg-white px-4 py-3 shadow-xl">
                  <span className="text-lg">💇</span>
                  <span className="ml-2 text-xs font-black">Salon</span>
                </div>

                <div className="absolute bottom-7 left-6 right-6 rounded-3xl border border-white bg-white/90 p-4 shadow-xl backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#dca57c] text-xs">👨</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#8ca4bb] text-xs">👩</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#d7bc8b] text-xs">👨</span>
                    </div>
                    <div>
                      <p className="text-xl font-black">10,000+</p>
                      <p className="text-[10px] text-slate-500">Students are already saving with SBC</p>
                    </div>
                    <span className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      ↗
                    </span>
                  </div>
                </div>
              </div>

              {/* Portal */}
              <div className="relative overflow-hidden rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_30px_80px_rgba(7,17,31,.16)] backdrop-blur-xl sm:p-6">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#d4af37]/15 blur-2xl" />

                <div className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07111f] to-[#b18a16] text-lg font-black text-white shadow-lg">
                    SBC
                  </div>
                  <h2 className="mt-4 text-2xl font-black">SBC Platform</h2>
                  <p className="mt-1 text-xs text-slate-500">Access your account</p>

                  <div className="mt-5 flex rounded-full bg-slate-100 p-1 text-[11px] font-black">
                    <span className="flex-1 rounded-full bg-[#fff8df] px-3 py-2 text-[#8a680c] shadow-sm">
                      Student
                    </span>
                    <span className="flex-1 px-3 py-2 text-slate-500">Business</span>
                    <span className="flex-1 px-3 py-2 text-slate-500">Admin</span>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => router.push("/student/login")}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-[#07111f] p-4 text-left text-white transition hover:-translate-y-0.5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">🎓</span>
                      <span>
                        <span className="block text-xs font-black">Student Login</span>
                        <span className="block text-[10px] text-white/60">Access your SBC benefits</span>
                      </span>
                      <span className="ml-auto text-lg opacity-60">→</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/student/register")}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-[#d4af37]/30 bg-[#fff9e8] p-4 text-left text-[#8a680c] transition hover:-translate-y-0.5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/15 text-lg">📝</span>
                      <span>
                        <span className="block text-xs font-black">Student Registration</span>
                        <span className="block text-[10px] opacity-70">Create your SBC account</span>
                      </span>
                      <span className="ml-auto text-lg opacity-60">→</span>
                    </button>

                    <div className="flex items-center gap-2 py-1">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Business</span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/business/login")}
                      className="group flex w-full items-center gap-3 rounded-2xl bg-[#07111f] p-4 text-left text-white transition hover:-translate-y-0.5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">🏪</span>
                      <span>
                        <span className="block text-xs font-black">Business Login</span>
                        <span className="block text-[10px] text-white/60">Manage your SBC partnership</span>
                      </span>
                      <span className="ml-auto text-lg opacity-60">→</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/business/register")}
                      className="group flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-[#faf9f4] p-4 text-left text-[#8a680c] transition hover:-translate-y-0.5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f]/10 text-lg">🤝</span>
                      <span>
                        <span className="block text-xs font-black">Business Registration</span>
                        <span className="block text-[10px] opacity-70">Become an SBC partner</span>
                      </span>
                      <span className="ml-auto text-lg opacity-60">→</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/admin/login")}
                      className="w-full rounded-2xl border border-black/10 bg-white py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      🔐 Admin Login
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST / STATS */}
        <section className="rounded-[2rem] border border-white bg-white/80 p-3 shadow-sm backdrop-blur">
          <div className="grid grid-cols-2 divide-x divide-y divide-black/5 sm:grid-cols-4 sm:divide-y-0">
            {[
              ["500+", "Partner Businesses"],
              ["10K+", "Students Registered"],
              ["50+", "Colleges Onboard"],
              ["1000+", "Offers Available"],
            ].map(([number, label]) => (
              <div key={label} className="px-4 py-5 text-center">
                <p className="text-2xl font-black text-[#07111f] sm:text-3xl">{number}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="py-14">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">
                Explore
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Benefits for every part of student life.
              </h2>
            </div>
            <button type="button" className="hidden text-sm font-black text-[#8a680c] sm:block">
              View all →
            </button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => router.push("/student/login")}
                className={`rounded-3xl ${cat.tone} p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
              >
                <div className="text-3xl">{cat.icon}</div>
                <p className="mt-4 text-sm font-black">{cat.name}</p>
                <p className="mt-1 text-[10px] text-slate-500">{cat.sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="rounded-[2.5rem] bg-[#07111f] px-5 py-10 text-white shadow-[0_30px_80px_rgba(7,17,31,.18)] sm:px-10 sm:py-12">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e0bd52]">
              Simple by design
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Find it. Redeem it. Enjoy it.
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/60">
              SBC connects students with partner businesses through a simple digital
              offer and redemption experience.
            </p>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Find an Offer", "Explore student-friendly offers from partner businesses."],
              ["02", "Choose & Redeem", "Select an offer and send your redemption request."],
              ["03", "Business Approves", "The business receives the request and approves it."],
              ["04", "Enjoy the Benefit", "Use your approved benefit and save more."],
            ].map(([no, title, text]) => (
              <div key={no} className="rounded-3xl border border-white/10 bg-white/[.06] p-5">
                <span className="text-xs font-black text-[#e0bd52]">{no}</span>
                <h3 className="mt-8 text-base font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-white/50">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* OFFERS PREVIEW */}
        <section className="py-14">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">
                Student Offers
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Something good is always nearby.
              </h2>
            </div>
            <button
              type="button"
              onClick={() => router.push("/student/login")}
              className="text-xs font-black text-[#8a680c]"
            >
              Explore →
            </button>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {offers.map((offer, index) => (
              <button
                key={offer.name}
                type="button"
                onClick={() => router.push("/student/login")}
                className="group overflow-hidden rounded-[2rem] border border-black/5 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`flex h-36 items-center justify-center text-7xl ${
                    index === 0 ? "bg-[#fff0e7]" : index === 1 ? "bg-[#eeeaff]" : "bg-[#eef8ef]"
                  }`}
                >
                  {offer.icon}
                </div>
                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {offer.name}
                  </p>
                  <h3 className="mt-2 text-lg font-black">{offer.offer}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">{offer.distance}</span>
                    <span className="font-black text-[#8a680c] transition group-hover:translate-x-1">
                      View →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* PARTNER CTA */}
        <section className="mb-12 overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#e9ddff] via-[#f4eaff] to-[#fff5d8] p-6 sm:p-10">
          <div className="flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">
                For Businesses
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Partner with SBC.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                Connect your business with students and grow through exclusive
                student offers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/business/register")}
              className="shrink-0 rounded-2xl bg-[#07111f] px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-1"
            >
              Register Your Business →
            </button>
          </div>
        </section>

        {/* SEO CONTENT */}
        <section className="border-t border-black/5 py-12">
          <div className="mx-auto max-w-5xl">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">
              Student Discounts • Offers • Benefits
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Student Discounts and Exclusive Offers
            </h2>
            <div className="mt-5 grid gap-5 text-sm leading-7 text-slate-600 sm:grid-cols-2">
              <p>
                Student Benefit Card (SBC) is a student benefits platform that
                helps students discover exclusive discounts, offers, rewards and
                savings from partner businesses.
              </p>
              <p>
                Students can explore offers from restaurants, cafes, salons,
                shopping stores and other student-friendly businesses, then use
                their SBC account to access eligible benefits.
              </p>
            </div>
            <div className="mt-6 rounded-3xl border border-[#d4af37]/20 bg-[#fff9e8] p-6">
              <h3 className="font-black">Student Offers in Nellore</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                SBC is building a growing network of student offers in Nellore,
                connecting college students with local restaurants, cafes,
                salons, shops and other partner businesses.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-black/5 py-7 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#07111f] text-[10px] font-black text-white">
              SBC
            </span>
            <span className="text-xs font-black tracking-[.14em]">STUDENT BENEFIT CARD</span>
          </div>
          <p className="mt-3 text-[10px] text-slate-400">
            © 2026 SBC Platform • One Card • More Benefits • More Savings
          </p>
        </footer>
      </div>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl border border-white/80 bg-white/90 px-3 py-2 shadow-[0_15px_40px_rgba(7,17,31,.16)] backdrop-blur-xl sm:hidden">
        {[
          ["⌂", "Home"],
          ["◇", "Offers"],
          ["⌾", "Scan"],
          ["▣", "Business"],
          ["♙", "Profile"],
        ].map(([icon, label], i) => (
          <button
            key={label}
            type="button"
            onClick={() =>
              i === 0
                ? router.push("/")
                : i === 1
                ? router.push("/student/login")
                : i === 3
                ? router.push("/business/login")
                : router.push("/student/login")
            }
            className={`flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 ${
              i === 0 ? "bg-[#fff5d5] text-[#8a680c]" : "text-slate-500"
            }`}
          >
            <span className="text-base">{icon}</span>
            <span className="text-[9px] font-black">{label}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
