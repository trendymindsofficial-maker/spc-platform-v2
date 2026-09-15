"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  ["🍔", "Food & Dining", "Save More"],
  ["🛍️", "Shopping", "Best Deals"],
  ["✈️", "Travel", "Explore More"],
  ["❤️", "Health & Wellness", "Stay Healthy"],
  ["🎓", "Education", "Learn More"],
  ["🎬", "Entertainment", "Have Fun"],
  ["🏋️", "Fitness", "Stay Fit"],
  ["💇", "Salon & Beauty", "Look Great"],
];

const slides = [
  {
    eyebrow: "FOR A BRIGHTER TOMORROW",
    title: "Student Benefit Card",
    highlight: "More Benefits. More Savings.",
    text: "Exclusive student discounts at your favourite brands, shops, restaurants, travel and more.",
    primary: "Get Your SBC Now",
    primaryPath: "/student/register",
    secondary: "Explore Offers",
    secondaryPath: "/student/login",
    image: "/images/sbc-student.png",
    sideTitle: "Students",
    sideText: "Save More\nDo More\nBe More",
  },
  {
    eyebrow: "EXCLUSIVE STUDENT OFFERS",
    title: "Save on the things",
    highlight: "students love.",
    text: "Discover offers across food, shopping, fitness, salons, entertainment and more.",
    primary: "Explore Offers",
    primaryPath: "/student/login",
    secondary: "Get Your SBC",
    secondaryPath: "/student/register",
    image: "/images/sbc-student.png",
    sideTitle: "One Card",
    sideText: "More Choices\nMore Savings",
  },
  {
    eyebrow: "REWARDS THAT KEEP GROWING",
    title: "Every benefit",
    highlight: "feels better with SBC.",
    text: "Use your SBC at partner businesses and enjoy a smarter, simpler student savings experience.",
    primary: "Join SBC",
    primaryPath: "/student/register",
    secondary: "How It Works",
    secondaryPath: "#how-it-works",
    image: "/images/sbc-card.png",
    sideTitle: "SBC",
    sideText: "Benefits\nRewards\nSavings",
  },
];

export default function Home() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [portalRole, setPortalRole] = useState<"student" | "business">("student");

  const go = (path: string) => {
    if (path.startsWith("#")) {
      document.querySelector(path)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    router.push(path);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  const active = slides[slide];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#07111f]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/[.06] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <button type="button" onClick={() => go("/")} className="flex items-center gap-3">
            <span className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#07111f] text-sm font-black text-white shadow-lg">
              <span className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-[#d4af37] blur-md" />
              <span className="relative">SBC</span>
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-black tracking-[.12em] sm:text-[14px]">
                STUDENT BENEFIT CARD
              </span>
              <span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-slate-500">
                More Benefits. More Savings.
              </span>
            </span>
          </button>

          <nav className="hidden items-center gap-7 lg:flex">
            {[
              ["Home", "/"],
              ["For Students", "/student/login"],
              ["For Businesses", "/business/login"],
              ["Offers", "/student/login"],
              ["How It Works", "#how-it-works"],
              ["About", "#about"],
              ["Admin Login", "/admin/login"],
            ].map(([label, path], index) => (
              <button
                key={label}
                type="button"
                onClick={() => go(path)}
                className={`text-[13px] font-bold transition ${
                  index === 0
                    ? "text-[#1557d6]"
                    : "text-slate-600 hover:text-[#07111f]"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => go("/student/register")}
              className="rounded-lg bg-[#1557d6] px-2.5 py-2.5 text-[9px] font-black text-white shadow-[0_8px_20px_rgba(21,87,214,.18)] transition hover:-translate-y-0.5 sm:rounded-xl sm:px-5 sm:py-3 sm:text-xs"
            >
              Student Register
            </button>
            <button
              type="button"
              onClick={() => go("/student/login")}
              className="rounded-lg border border-[#1557d6] bg-white px-2.5 py-2.5 text-[9px] font-black text-[#1557d6] transition hover:bg-blue-50 sm:rounded-xl sm:px-5 sm:py-3 sm:text-xs"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => go("/admin/login")}
              className="rounded-lg border border-black/10 bg-[#07111f] px-2.5 py-2.5 text-[9px] font-black text-white transition hover:bg-[#122033] sm:rounded-xl sm:px-4 sm:py-3"
            >
              Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* HERO SLIDER */}
      <section className="relative overflow-hidden border-b border-black/[.04] bg-[#f7faff]">
        <div className="mx-auto max-w-[1500px]">
          <div className="relative min-h-[570px] overflow-hidden lg:min-h-[555px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(180,211,255,.55),transparent_36%),linear-gradient(90deg,#f7faff_0%,#eef5ff_46%,#dceaff_100%)]" />

            <div
              key={slide}
              className="relative grid min-h-[570px] items-center gap-5 px-5 py-10 sm:px-10 lg:min-h-[555px] lg:grid-cols-[.95fr_1.35fr] lg:px-16"
            >
              <div className="relative z-20 max-w-[570px]">
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#1557d6]">
                  {active.eyebrow}
                </p>

                <h1 className="mt-4 text-[3rem] font-black leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-[4.4rem]">
                  {active.title}
                  <br />
                  <span className="text-[#1557d6]">{active.highlight}</span>
                </h1>

                <p className="mt-6 max-w-lg text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                  {active.text}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => go(active.primaryPath)}
                    className="rounded-2xl bg-[#1557d6] px-6 py-4 text-sm font-black text-white shadow-[0_15px_35px_rgba(21,87,214,.24)] transition hover:-translate-y-1"
                  >
                    {active.primary} <span className="ml-2">→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => go(active.secondaryPath)}
                    className="rounded-2xl border border-[#1557d6]/25 bg-white px-6 py-4 text-sm font-black text-[#1557d6] shadow-sm transition hover:-translate-y-1"
                  >
                    {active.secondary}
                  </button>
                </div>

                <div className="mt-8 flex flex-wrap gap-5 text-xs font-bold text-slate-600">
                  <span>✓ Exclusive Discounts</span>
                  <span>✓ Reward Points</span>
                  <span>✓ Trusted Partners</span>
                </div>
              </div>

              <div className="relative mx-auto h-[440px] w-full max-w-[760px] lg:h-[500px]">
                <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70 blur-2xl" />

                <div className="absolute right-[2%] top-[6%] z-30 hidden rounded-2xl border border-white bg-white/90 px-5 py-4 shadow-[0_18px_45px_rgba(7,17,31,.12)] backdrop-blur sm:block">
                  <p className="whitespace-pre-line text-right text-[19px] font-black leading-6 text-[#07111f]">
                    {active.sideText}
                  </p>
                  <p className="mt-1 text-right text-[9px] font-black uppercase tracking-widest text-[#1557d6]">
                    {active.sideTitle}
                  </p>
                </div>

                <div className="absolute left-[4%] top-[26%] z-30 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.1)]">
                  <span className="text-xl">🎁</span>
                  <span className="ml-2 text-xs font-black">Exclusive Offers</span>
                </div>

                <div className="absolute right-[8%] top-[40%] z-30 rounded-2xl border border-white bg-white/90 px-4 py-3 shadow-[0_15px_35px_rgba(7,17,31,.1)]">
                  <span className="text-xl">⭐</span>
                  <span className="ml-2 text-xs font-black">Reward Points</span>
                </div>

                <img
                  src={active.image}
                  alt="SBC student and Student Benefit Card"
                  className={`absolute left-1/2 top-1/2 z-20 max-h-[470px] w-[88%] -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_30px_45px_rgba(7,17,31,.2)] ${
                    active.image.includes("card") ? "rotate-[-5deg] max-w-[570px]" : "max-w-[610px]"
                  }`}
                />

                <div className="absolute bottom-[4%] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-white bg-white/90 px-5 py-2 text-xs font-black shadow-lg">
                  🎓 Made for students
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => setSlide((slide - 1 + slides.length) % slides.length)}
              className="absolute left-4 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#07111f] text-xl font-black text-white shadow-lg transition hover:scale-105"
            >
              ‹
            </button>

            <button
              type="button"
              aria-label="Next slide"
              onClick={() => setSlide((slide + 1) % slides.length)}
              className="absolute right-4 top-1/2 z-40 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#07111f] text-xl font-black text-white shadow-lg transition hover:scale-105"
            >
              ›
            </button>

            <div className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 gap-2">
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  onClick={() => setSlide(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    slide === index ? "w-8 bg-[#1557d6]" : "w-2.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="border-b border-black/[.05] bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map(([icon, name, sub]) => (
            <button
              key={name}
              type="button"
              onClick={() => go("/student/login")}
              className="group rounded-2xl border border-black/[.06] bg-white p-4 text-center shadow-[0_8px_25px_rgba(7,17,31,.05)] transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-lg"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f6ff] text-2xl transition group-hover:scale-105">
                {icon}
              </div>
              <p className="mt-3 text-xs font-black">{name}</p>
              <p className="mt-1 text-[9px] font-medium text-slate-400">{sub}</p>
            </button>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 overflow-hidden rounded-3xl border border-[#dce7f7] bg-[#f7faff] sm:grid-cols-4">
          {[
            ["10,000+", "Students Registered", "👥"],
            ["500+", "Partner Businesses", "🏪"],
            ["50+", "Colleges Onboard", "🎓"],
            ["1000+", "Exclusive Offers", "🏷️"],
          ].map(([number, label, icon]) => (
            <div key={label} className="flex items-center justify-center gap-3 border-black/[.06] px-4 py-6 sm:border-r last:border-r-0">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-2xl font-black">{number}</p>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* OFFERS */}
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#1557d6]">
                FEATURED OFFERS
              </p>
              <h2 className="mt-2 text-3xl font-black sm:text-4xl">Popular Student Deals</h2>
              <p className="mt-2 text-sm text-slate-500">Save more at brands and businesses loved by students.</p>
            </div>
            <button
              type="button"
              onClick={() => go("/student/login")}
              className="rounded-xl border border-[#1557d6] px-5 py-3 text-xs font-black text-[#1557d6] transition hover:bg-blue-50"
            >
              View All Offers →
            </button>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["10% OFF", "Food & Dining", "🍔", "Enjoy student savings on meals and cafes."],
              ["20% OFF", "Shopping", "🛍️", "Exclusive deals on your favourite stores."],
              ["15% OFF", "Travel", "✈️", "Travel smarter with student benefits."],
              ["BUY 1 GET 1", "Entertainment", "🎬", "Make your free time more rewarding."],
            ].map(([discount, category, icon, text]) => (
              <button
                key={category}
                type="button"
                onClick={() => go("/student/login")}
                className="group overflow-hidden rounded-3xl border border-black/[.06] bg-white text-left shadow-[0_12px_35px_rgba(7,17,31,.07)] transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-[#eaf2ff] to-[#f8fbff] text-7xl">
                  {icon}
                  <span className="absolute left-4 top-4 rounded-full bg-[#1557d6] px-3 py-1.5 text-[10px] font-black text-white">
                    {discount}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-[#1557d6]">{category}</p>
                  <h3 className="mt-2 text-lg font-black">Student Exclusive</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
                  <p className="mt-4 text-xs font-black text-[#1557d6]">Explore Offer →</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="bg-[#f7faff] px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1200px] text-center">
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#1557d6]">SIMPLE & SECURE</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">How SBC Works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            One simple flow from discovering a deal to enjoying your student benefit.
          </p>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Find an Offer", "Browse exclusive student offers from partner businesses.", "🔎"],
              ["02", "Tap Redeem", "Choose the offer you want and send a redemption request.", "🎁"],
              ["03", "Business Approves", "Get real-time approval from the partner business.", "✅"],
              ["04", "Enjoy & Save", "Show your approved redemption and enjoy the benefit.", "⭐"],
            ].map(([number, title, text, icon]) => (
              <div key={number} className="rounded-3xl bg-white p-7 shadow-[0_10px_30px_rgba(7,17,31,.06)]">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf2ff] text-2xl">
                  {icon}
                </div>
                <p className="mt-5 text-[9px] font-black tracking-widest text-[#1557d6]">{number}</p>
                <h3 className="mt-1 text-base font-black">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT / STUDENT VALUE */}
      <section id="about" className="px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#1557d6]">
              ONE CARD. MANY BENEFITS.
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              Built around the way students live.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
              Student Benefit Card helps students discover exclusive discounts,
              offers, rewards and savings from partner businesses — all through
              one simple digital platform.
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                ["💰", "Real Savings", "Exclusive benefits made for students."],
                ["⚡", "Simple Redemption", "Request and get approval digitally."],
                ["🎁", "Reward Points", "Get more value from eligible activity."],
                ["🛡️", "Trusted Partners", "A growing network of businesses."],
              ].map(([icon, title, text]) => (
                <div key={title} className="rounded-2xl border border-black/[.06] p-4">
                  <span className="text-xl">{icon}</span>
                  <p className="mt-2 text-xs font-black">{title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex min-h-[390px] items-center justify-center overflow-hidden rounded-[2.5rem] bg-[#07111f] p-8">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[35px] border-[#d4af37]/20" />
            <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full border-[35px] border-blue-400/10" />
            <img
              src="/images/sbc-card.png"
              alt="Student Benefit Card"
              className="relative z-10 w-full max-w-[500px] rotate-[-5deg] object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,.4)]"
            />
          </div>
        </div>
      </section>

      {/* BUSINESS CTA */}
      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[2.5rem] bg-[#07111f] px-6 py-10 text-white sm:px-10 lg:px-14 lg:py-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#e1c04e]">FOR BUSINESSES</p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">Partner with SBC.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/60">
                Connect with students, promote exclusive offers and grow your
                business through a simple digital student benefits platform.
              </p>
              <button
                type="button"
                onClick={() => go("/business/register")}
                className="mt-6 rounded-2xl bg-[#d4af37] px-6 py-4 text-sm font-black text-[#07111f] transition hover:-translate-y-1"
              >
                Register Your Business →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["👥", "More Customers"],
                ["📣", "Brand Visibility"],
                ["⚡", "Easy Redemption"],
                ["🤝", "Partner Support"],
              ].map(([icon, text]) => (
                <div key={text} className="rounded-2xl border border-white/10 bg-white/[.05] p-5 text-center">
                  <div className="text-2xl">{icon}</div>
                  <p className="mt-3 text-[10px] font-black">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEO */}
      <section className="border-t border-black/[.05] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1557d6]">
            STUDENT DISCOUNTS • OFFERS • BENEFITS
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
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
          <div className="mt-6 rounded-3xl border border-blue-100 bg-[#f5f9ff] p-6">
            <h3 className="font-black">Student Offers in Nellore</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              SBC is building a growing network of student offers in Nellore,
              connecting college students with local restaurants, cafes, salons,
              shops and other partner businesses.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-black/[.06] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 sm:flex-row">
          <button type="button" onClick={() => go("/")} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#07111f] text-[10px] font-black text-white">
              SBC
            </span>
            <span className="text-left">
              <span className="block text-xs font-black tracking-[.12em]">STUDENT BENEFIT CARD</span>
              <span className="block text-[9px] text-slate-400">More Benefits. More Savings.</span>
            </span>
          </button>

          <div className="flex flex-wrap justify-center gap-5 text-[10px] font-bold text-slate-500">
            <button type="button" onClick={() => go("/")}>Home</button>
            <button type="button" onClick={() => go("/student/login")}>Students</button>
            <button type="button" onClick={() => go("/business/login")}>Businesses</button>
            <button type="button" onClick={() => go("/student/login")}>Offers</button>
            <button type="button" onClick={() => go("#about")}>About</button>
          </div>

          <p className="text-[10px] text-slate-400">© 2026 SBC. All rights reserved.</p>
        </div>
      </footer>

      {/* MOBILE NAV */}
      <div className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-20px)] max-w-md -translate-x-1/2 items-center justify-between rounded-[1.4rem] border border-white/80 bg-white/95 px-2 py-2 shadow-[0_18px_50px_rgba(7,17,31,.18)] backdrop-blur-xl sm:hidden">
        {[
          ["⌂", "Home", "/"],
          ["◇", "Offers", "/student/login"],
          ["▣", "Business", "/business/login"],
          ["♙", "Register", "/student/register"],
        ].map(([icon, label, path], index) => (
          <button
            key={label}
            type="button"
            onClick={() => go(path)}
            className={`flex min-w-[65px] flex-col items-center rounded-xl px-2 py-2 text-slate-500 transition ${
              index === 0 ? "bg-[#edf4ff] text-[#1557d6]" : ""
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
