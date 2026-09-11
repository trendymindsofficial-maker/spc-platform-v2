
"use client";
import { useRouter } from "next/navigation";

const categories = [
  ["🍔", "Food", "Save More", "bg-rose-50"],
  ["🛍️", "Shopping", "Best Deals", "bg-violet-50"],
  ["🏋️", "Fitness", "Stay Healthy", "bg-emerald-50"],
  ["💇", "Salon", "Look Great", "bg-pink-50"],
  ["🎓", "Education", "Learn More", "bg-blue-50"],
  ["✈️", "Travel", "Explore More", "bg-sky-50"],
  ["🎮", "Entertainment", "Have Fun", "bg-amber-50"],
  ["•••", "More", "Discover", "bg-slate-50"],
];

const offers = [
  ["🍕", "Food & Dining", "20% OFF", "On selected orders", "2.1 km"],
  ["☕", "Cafes & Drinks", "Flat ₹50 OFF", "On min. ₹200", "2.5 km"],
  ["👕", "Shopping", "15% OFF", "Student exclusive", "1.8 km"],
  ["🍨", "Desserts", "10% OFF", "On all items", "3.2 km"],
];

export default function Home() {
  const router = useRouter();

  const go = (path: string) => router.push(path);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f8f6ef] text-[#07111f]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-20 h-[34rem] w-[34rem] rounded-full bg-[#e7c45a]/15 blur-3xl" />
        <div className="absolute right-[-12rem] top-[18%] h-[32rem] w-[32rem] rounded-full bg-[#ded0ff]/20 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-[30%] h-[30rem] w-[30rem] rounded-full bg-[#ffe4b7]/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* HEADER */}
        <header className="flex h-[76px] items-center justify-between border-b border-black/[.05]">
          <button
            type="button"
            onClick={() => go("/")}
            className="flex items-center gap-3"
          >
            <span className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#07111f] text-sm font-black text-white shadow-[0_10px_30px_rgba(7,17,31,.18)]">
              <span className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-[#d4af37] blur-md" />
              <span className="relative">SBC</span>
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

          <nav className="hidden items-center gap-8 lg:flex">
            {["Home", "For Students", "For Businesses", "Offers", "How It Works", "About"].map(
              (item, index) => (
                <button
                  key={item}
                  type="button"
                  className={`relative text-[13px] font-bold transition ${
                    index === 0
                      ? "text-[#8a680c] after:absolute after:-bottom-5 after:left-1/2 after:h-0.5 after:w-5 after:-translate-x-1/2 after:rounded-full after:bg-[#d4af37]"
                      : "text-slate-600 hover:text-[#07111f]"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur sm:flex">
              <span className="text-red-500">⌖</span> Nellore <span className="text-slate-300">⌄</span>
            </div>
            <button
              type="button"
              onClick={() => go("/student/register")}
              className="rounded-full bg-[#b18a16] px-5 py-3 text-xs font-black text-white shadow-[0_12px_28px_rgba(177,138,22,.22)] transition hover:-translate-y-0.5"
            >
              Get Started <span className="ml-1">→</span>
            </button>
          </div>
        </header>

        {/* HERO */}
        <section className="grid items-center gap-8 py-8 lg:grid-cols-[.9fr_1.35fr_.72fr] lg:py-12">
          {/* Copy */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-white/75 px-4 py-2 text-[10px] font-black uppercase tracking-[.16em] text-[#8a680c] shadow-sm backdrop-blur">
              🎓 Empowering Students
            </div>

            <h1 className="text-[3.35rem] font-black leading-[.94] tracking-[-.055em] sm:text-6xl lg:text-[4.65rem]">
              Your student life
              <br />
              just got more
              <br />
              <span className="bg-gradient-to-r from-[#916d0b] via-[#c09319] to-[#e0b83f] bg-clip-text text-transparent">
                rewarding.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-7 text-slate-600 sm:text-base">
              Exclusive offers, real savings and exciting privileges — all with
              one simple student card.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => go("/student/login")}
                className="rounded-2xl bg-[#b18a16] px-6 py-4 text-sm font-black text-white shadow-[0_16px_35px_rgba(177,138,22,.25)] transition hover:-translate-y-1"
              >
                Explore Offers <span className="ml-2">→</span>
              </button>
              <button
                type="button"
                className="rounded-2xl border border-black/10 bg-white/80 px-5 py-4 text-sm font-black shadow-sm backdrop-blur transition hover:-translate-y-1"
              >
                ◉ &nbsp; Watch Video
              </button>
            </div>

            <div className="mt-8 hidden items-center gap-3 sm:flex">
              <div className="flex -space-x-2">
                {["👨🏻", "👩🏻", "👨🏽"].map((x, i) => (
                  <span
                    key={i}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#f8f6ef] bg-white text-sm shadow-sm"
                  >
                    {x}
                  </span>
                ))}
              </div>
              <div>
                <p className="text-sm font-black">10,000+ Students</p>
                <p className="text-[10px] text-slate-500">are already saving with SBC</p>
              </div>
            </div>
          </div>

          {/* Hero card visual */}
          <div className="relative mx-auto h-[480px] w-full max-w-[570px]">
            <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#f5d66f]/60 via-[#fff4c7]/60 to-transparent blur-xl" />

            {/* Person illustration */}
            <div className="absolute left-1/2 top-9 flex h-[380px] w-[300px] -translate-x-1/2 items-end justify-center">
              <div className="absolute top-0 h-32 w-32 rounded-full bg-[#d69b72] shadow-[inset_-10px_-8px_15px_rgba(0,0,0,.08)]" />
              <div className="absolute top-1 h-28 w-40 rounded-[55%] bg-[#4c3229]" />
              <div className="absolute top-12 z-10 h-28 w-24 rounded-[46%] bg-[#dda27b]" />
              <div className="absolute top-24 z-20 h-44 w-52 rounded-t-[90px] bg-gradient-to-b from-[#7891a5] to-[#526b7f]" />
              <div className="absolute bottom-0 z-30 h-36 w-60 rounded-t-[110px] bg-[#dca07e]" />
              <div className="absolute bottom-10 z-40 h-24 w-48 rotate-[-8deg] rounded-2xl bg-[#e6c39c] shadow-xl" />
            </div>

            {/* Floating category pills */}
            <div className="absolute left-2 top-24 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.12)] backdrop-blur">
              <span className="text-lg">🍔</span>
              <span className="ml-2 text-xs font-black">Food</span>
              <span className="ml-1 text-[9px] text-slate-400">Save More</span>
            </div>
            <div className="absolute right-1 top-16 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.12)] backdrop-blur">
              <span className="text-lg">🏋️</span>
              <span className="ml-2 text-xs font-black">Fitness</span>
            </div>
            <div className="absolute left-0 top-52 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.12)] backdrop-blur">
              <span className="text-lg">🛍️</span>
              <span className="ml-2 text-xs font-black">Shopping</span>
            </div>
            <div className="absolute right-0 top-48 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.12)] backdrop-blur">
              <span className="text-lg">💇</span>
              <span className="ml-2 text-xs font-black">Salon</span>
            </div>
            <div className="absolute bottom-32 left-4 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.12)] backdrop-blur">
              <span className="text-lg">✈️</span>
              <span className="ml-2 text-xs font-black">Travel</span>
            </div>
            <div className="absolute bottom-28 right-1 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.12)] backdrop-blur">
              <span className="text-lg">🎓</span>
              <span className="ml-2 text-xs font-black">Education</span>
            </div>

            {/* Digital SBC card */}
            <div className="absolute bottom-2 left-1/2 z-50 w-[310px] -translate-x-1/2 rotate-[-7deg] overflow-hidden rounded-[25px] bg-gradient-to-br from-[#07111f] via-[#172231] to-[#8e6b13] p-5 text-white shadow-[0_28px_60px_rgba(7,17,31,.35)] sm:w-[350px]">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[25px] border-[#d4af37]/30" />
              <div className="absolute bottom-[-80px] right-[-30px] h-48 w-48 rounded-full bg-[#d4af37]/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-black tracking-wide">SBC</p>
                    <p className="mt-0.5 text-[7px] tracking-[.2em] text-white/55">STUDENT BENEFIT CARD</p>
                  </div>
                  <span className="text-[9px] font-bold tracking-[.18em] text-[#f1cf63]">STUDENT</span>
                </div>
                <div className="mt-7 h-8 w-11 rounded-lg bg-gradient-to-br from-[#f5dc86] to-[#a87b16]" />
                <p className="mt-5 text-sm tracking-[.2em] text-white/85">4821&nbsp; 7110&nbsp; 5678</p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-[8px] uppercase tracking-[.18em] text-white/55">A brighter tomorrow</p>
                  <p className="text-lg font-black">SBC</p>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rotate-[-2deg] text-center text-[15px] font-bold text-[#07111f]">
              <span className="block -rotate-2">More</span>
              <span className="block">Than Just</span>
              <span className="block">a Student Card!</span>
              <span className="text-[#d4af37]">⌁</span>
            </div>
          </div>

          {/* Portal */}
          <div className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_30px_80px_rgba(7,17,31,.13)] backdrop-blur-xl sm:p-6">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#07111f] text-lg font-black text-white shadow-lg">
                SBC
              </div>
              <h2 className="mt-4 text-2xl font-black">Access SBC Platform</h2>
              <p className="mt-1 text-xs text-slate-500">Choose your role to continue</p>

              <div className="mt-5 flex rounded-full bg-slate-100 p-1 text-[10px] font-black">
                <span className="flex-1 rounded-full bg-[#d4af37] px-2 py-2.5 text-white shadow-sm">Student</span>
                <span className="flex-1 px-2 py-2.5 text-slate-500">Business</span>
                <span className="flex-1 px-2 py-2.5 text-slate-500">Admin</span>
              </div>

              <div className="mt-4 space-y-2.5">
                <button
                  type="button"
                  onClick={() => go("/student/login")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#07111f] p-4 text-left text-white transition hover:-translate-y-0.5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">🎓</span>
                  <span>
                    <span className="block text-xs font-black">Student Login</span>
                    <span className="block text-[10px] text-white/55">Access your benefits</span>
                  </span>
                  <span className="ml-auto">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => go("/student/register")}
                  className="flex w-full items-center gap-3 rounded-2xl border border-[#d4af37]/35 bg-[#fff8df] p-4 text-left text-[#8a680c]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d4af37]/15 text-lg">📝</span>
                  <span>
                    <span className="block text-xs font-black">Student Registration</span>
                    <span className="block text-[10px] opacity-65">Create your SBC account</span>
                  </span>
                  <span className="ml-auto">→</span>
                </button>

                <div className="flex items-center gap-2 py-1">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Business</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                  type="button"
                  onClick={() => go("/business/login")}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#07111f] p-4 text-left text-white transition hover:-translate-y-0.5"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg">🏪</span>
                  <span>
                    <span className="block text-xs font-black">Business Login</span>
                    <span className="block text-[10px] text-white/55">Manage your partnership</span>
                  </span>
                  <span className="ml-auto">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => go("/business/register")}
                  className="flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-[#fbfaf6] p-4 text-left text-[#8a680c]"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f]/10 text-lg">🤝</span>
                  <span>
                    <span className="block text-xs font-black">Business Registration</span>
                    <span className="block text-[10px] opacity-65">Become an SBC partner</span>
                  </span>
                  <span className="ml-auto">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => go("/admin/login")}
                  className="w-full rounded-2xl border border-black/10 bg-white py-3 text-xs font-black text-slate-700"
                >
                  🔐 Admin Login
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-black/5 bg-[#faf9f4] p-3 text-left">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">▦</div>
                <div>
                  <p className="text-xs font-black">New to SBC?</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    Join thousands of students and start saving today.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="rounded-[2rem] border border-white bg-white/85 p-3 shadow-[0_15px_45px_rgba(7,17,31,.06)] backdrop-blur">
          <div className="grid grid-cols-2 divide-x divide-y divide-black/5 sm:grid-cols-4 sm:divide-y-0">
            {[
              ["10,000+", "Students Registered", "🎓"],
              ["500+", "Partner Businesses", "🏪"],
              ["50+", "Colleges Onboard", "🏫"],
              ["1000+", "Offers Available", "🎁"],
            ].map(([number, label, icon]) => (
              <div key={label} className="flex items-center justify-center gap-3 px-3 py-5">
                <span className="hidden text-xl sm:block">{icon}</span>
                <div>
                  <p className="text-xl font-black sm:text-2xl">{number}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* OFFERS NEAR YOU */}
        <section className="py-14">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">Discover</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Offers Near You</h2>
              <p className="mt-2 text-sm text-slate-500">Student-friendly savings from SBC partners.</p>
            </div>
            <button
              type="button"
              onClick={() => go("/student/login")}
              className="hidden text-xs font-black text-[#8a680c] sm:block"
            >
              View All →
            </button>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map(([icon, category, discount, detail, distance]) => (
              <button
                key={category}
                type="button"
                onClick={() => go("/student/login")}
                className="group overflow-hidden rounded-[1.8rem] border border-black/[.05] bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(7,17,31,.1)]"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#fff3df] to-[#f6eee3] text-6xl">
                  {icon}
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#fff3cc] px-2.5 py-1 text-[8px] font-black uppercase text-[#8a680c]">
                      SBC Offer
                    </span>
                    <span className="text-slate-300">♡</span>
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-wider text-slate-400">{category}</p>
                  <h3 className="mt-1 text-xl font-black text-[#b18a16]">{discount}</h3>
                  <p className="mt-1 text-xs text-slate-500">{detail}</p>
                  <div className="mt-4 flex justify-between border-t border-black/5 pt-3 text-[10px] font-bold text-slate-500">
                    <span>⌖ {distance}</span>
                    <span className="text-[#8a680c] group-hover:translate-x-1">View →</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="grid gap-5 lg:grid-cols-[1.65fr_.8fr]">
          <div className="rounded-[2.2rem] border border-white bg-white/85 p-6 shadow-sm backdrop-blur sm:p-9">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">Simple & Secure</p>
            <h2 className="mt-2 text-3xl font-black">How SBC Works?</h2>

            <div className="mt-9 grid gap-7 sm:grid-cols-4">
              {[
                ["⌕", "Find an Offer", "Browse offers near you"],
                ["🎁", "Tap Redeem", "Request the offer"],
                ["✓", "Business Approves", "Get real-time approval"],
                ["✦", "Enjoy Savings", "Use the offer & save!"],
              ].map(([icon, title, text], index) => (
                <div key={title} className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff5d8] text-xl">
                    {icon}
                  </div>
                  <p className="mt-4 text-xs font-black">{index + 1}. {title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p>
                  {index < 3 && (
                    <span className="absolute right-[-18px] top-6 hidden text-slate-300 sm:block">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2.2rem] bg-gradient-to-br from-[#fff8df] to-[#eee8ff] p-7 shadow-sm">
            <div className="text-3xl">“</div>
            <p className="mt-3 text-base font-bold leading-6 text-[#07111f]">
              SBC makes student savings simple. One platform, more offers and
              benefits wherever students go.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-sm">👩🏻</span>
              <div>
                <p className="text-xs font-black">SBC Student</p>
                <p className="text-[10px] text-slate-500">Student Community</p>
              </div>
              <span className="ml-auto text-[#d4af37]">★★★★★</span>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="py-14">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#8a680c]">One Card</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Benefits for every student.</h2>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {categories.map(([icon, name, sub, tone]) => (
              <button
                key={name}
                type="button"
                onClick={() => go("/student/login")}
                className={`rounded-3xl ${tone} p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md`}
              >
                <div className="text-3xl">{icon}</div>
                <p className="mt-4 text-xs font-black">{name}</p>
                <p className="mt-1 text-[9px] text-slate-500">{sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* BUSINESS CTA */}
        <section className="relative mb-12 overflow-hidden rounded-[2.5rem] bg-[#07111f] px-6 py-9 text-white sm:px-10 sm:py-11">
          <div className="absolute right-[-80px] top-[-100px] h-72 w-72 rounded-full border-[45px] border-[#d4af37]/15" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e0bd52]">For Businesses</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Partner with SBC.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/55">
                Connect with students, build your brand presence and grow your
                business through exclusive student offers.
              </p>
              <button
                type="button"
                onClick={() => go("/business/register")}
                className="mt-6 rounded-2xl bg-[#d4af37] px-6 py-4 text-sm font-black text-[#07111f] shadow-lg transition hover:-translate-y-1"
              >
                Register Your Business →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["👥", "More Customers"],
                ["🛡️", "Brand Presence"],
                ["⚡", "Easy Redemption"],
                ["♢", "Dedicated Support"],
              ].map(([icon, text]) => (
                <div key={text} className="rounded-2xl border border-white/10 bg-white/[.05] p-4 text-center">
                  <div className="text-xl">{icon}</div>
                  <p className="mt-3 text-[10px] font-black">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEO */}
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
        <footer className="border-t border-black/5 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#07111f] text-[10px] font-black text-white">
                SBC
              </span>
              <div>
                <p className="text-xs font-black tracking-[.14em]">STUDENT BENEFIT CARD</p>
                <p className="text-[9px] text-slate-400">One Card • More Benefits</p>
              </div>
            </div>
            <div className="flex gap-5 text-[10px] font-bold text-slate-500">
              <button type="button">Home</button>
              <button type="button" onClick={() => go("/student/login")}>Students</button>
              <button type="button" onClick={() => go("/business/login")}>Businesses</button>
              <button type="button">Offers</button>
              <button type="button">About</button>
            </div>
            <p className="text-[10px] text-slate-400">© 2026 SBC. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* Mobile app-style bottom navigation */}
      <div className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-20px)] max-w-md -translate-x-1/2 items-center justify-between rounded-[1.4rem] border border-white/80 bg-white/90 px-2 py-2 shadow-[0_18px_50px_rgba(7,17,31,.18)] backdrop-blur-xl sm:hidden">
        {[
          ["⌂", "Home", "/"],
          ["◇", "Offers", "/student/login"],
          ["⌾", "Scan", "/student/login"],
          ["▣", "Business", "/business/login"],
          ["♙", "Profile", "/student/login"],
        ].map(([icon, label, path], i) => (
          <button
            key={label}
            type="button"
            onClick={() => go(path)}
            className={`flex min-w-[52px] flex-col items-center rounded-xl px-2 py-1.5 ${
              i === 0 ? "bg-[#fff4d2] text-[#8a680c]" : "text-slate-500"
            }`}
          >
            <span className="text-base">{icon}</span>
            <span className="mt-0.5 text-[8px] font-black">{label}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
