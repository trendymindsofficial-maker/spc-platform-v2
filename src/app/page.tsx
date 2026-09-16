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
    eyebrow: "STUDENT DISCOUNTS",
    title: "Big Discounts",
    highlight: "Just for You!",
    text: "Show your SBC Card and enjoy exclusive discounts at shops, restaurants, travel, education and more.",
    primary: "Get Your SBC Card",
    primaryPath: "/student/register",
    secondary: "Student Login",
    secondaryPath: "/student/login",
    image: "/images/sbc01.png",
    sideTitle: "Save More",
    sideText: "Every Visit\nEvery Day",
  },
  {
    eyebrow: "USE • SAVE • REWARD",
    title: "Use Discounts",
    highlight: "& Get Gifts!",
    text: "Use your SBC benefits at partner businesses, collect rewards and unlock exciting gifts.",
    primary: "Explore Offers",
    primaryPath: "/student/login",
    secondary: "Student Login",
    secondaryPath: "/student/login",
    image: "/images/sbc02.png",
    sideTitle: "More You Use",
    sideText: "More Rewards\nMore Gifts",
  },
  {
    eyebrow: "REFER • GROW • EARN",
    title: "Refer SBC",
    highlight: "& Earn Money!",
    text: "Invite your friends to join SBC, help them save and earn referral rewards.",
    primary: "Get Your SBC Card",
    primaryPath: "/student/register",
    secondary: "Student Login",
    secondaryPath: "/student/login",
    image: "/images/sbc03.png",
    sideTitle: "Refer More",
    sideText: "Grow Together\nEarn More",
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
    <main className="min-h-screen overflow-x-hidden bg-white pb-20 text-[#07111f] sm:pb-0">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-black/[.06] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-3 py-2.5 sm:px-6 sm:py-0 lg:px-10">
          <div className="flex min-h-[54px] items-center justify-between gap-2 sm:h-[76px]">
            <button type="button" onClick={() => go("/")} className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#07111f] text-[11px] font-black text-white shadow-lg sm:h-12 sm:w-12 sm:rounded-2xl sm:text-sm">
                <span className="absolute -right-2 -top-2 h-7 w-7 rounded-full bg-[#d4af37] blur-md" />
                <span className="relative">SBC</span>
              </span>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[11px] font-black tracking-[.10em] sm:text-[14px] sm:tracking-[.12em]">
                  STUDENT BENEFIT CARD
                </span>
                <span className="mt-0.5 block text-[7px] font-semibold uppercase tracking-[.16em] text-slate-500 sm:text-[9px] sm:tracking-[.2em]">
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
              ].map(([label, path], index) => (
                <button key={label} type="button" onClick={() => go(path)} className={`text-[13px] font-bold transition ${index === 0 ? "text-[#1557d6]" : "text-slate-600 hover:text-[#07111f]"}`}>
                  {label}
                </button>
              ))}
            </nav>

            <div className="hidden items-center justify-end gap-2 sm:flex sm:flex-nowrap">
              <button type="button" onClick={() => go("/student/register")} className="rounded-xl bg-[#1557d6] px-3 py-2.5 text-[10px] font-black text-white shadow-[0_12px_28px_rgba(21,87,214,.22)] transition hover:-translate-y-0.5 sm:px-4 sm:py-3 sm:text-xs">Get Your SBC Card</button>
              <button type="button" onClick={() => go("/student/login")} className="rounded-xl border border-[#1557d6]/30 bg-white px-3 py-2.5 text-[10px] font-black text-[#1557d6] transition hover:bg-blue-50 sm:px-4 sm:py-3 sm:text-xs">Student Login</button>
              <button type="button" onClick={() => go("/admin/login")} className="rounded-xl border border-[#07111f]/15 bg-[#07111f] px-3 py-2.5 text-[10px] font-black text-white transition hover:bg-[#111d2d] sm:px-4 sm:py-3 sm:text-xs">Admin</button>
            </div>

            <button type="button" onClick={() => go("/student/register")} className="shrink-0 rounded-xl bg-[#1557d6] px-3 py-2.5 text-[9px] font-black text-white shadow-[0_8px_20px_rgba(21,87,214,.20)] sm:hidden">Get Your SBC Card</button>
          </div>

          <div className="flex gap-2 pb-1 pt-1.5 sm:hidden">
            <button type="button" onClick={() => go("/student/login")} className="flex-1 rounded-xl border border-[#1557d6]/25 bg-white px-3 py-2 text-[10px] font-black text-[#1557d6]">Student Login</button>
            <button type="button" onClick={() => go("/admin/login")} className="flex-1 rounded-xl bg-[#07111f] px-3 py-2 text-[10px] font-black text-white">Admin</button>
          </div>
        </div>
      </header>

      {/* HERO SLIDER — COMPLETE IMAGE PER SLIDE */}
      <section className="relative overflow-hidden bg-[#07111f]">
        <div className="relative flex w-full items-center justify-center sm:min-h-[520px] lg:min-h-[650px]">

          <div
            key={active.image}
            className="flex h-full w-full items-center justify-center"
          >
            <img
              src={active.image}
              alt={`${active.title} ${active.highlight} - Student Benefit Card`}
              className="block h-auto w-full max-w-none object-contain"
            />
          </div>

          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setSlide((slide - 1 + slides.length) % slides.length)}
            className="absolute left-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#07111f]/75 text-xl font-black text-white shadow-xl backdrop-blur-md transition hover:scale-105 sm:left-6 sm:h-11 sm:w-11 sm:text-2xl"
          >
            ‹
          </button>

          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setSlide((slide + 1) % slides.length)}
            className="absolute right-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#07111f]/75 text-xl font-black text-white shadow-xl backdrop-blur-md transition hover:scale-105 sm:right-6 sm:h-11 sm:w-11 sm:text-2xl"
          >
            ›
          </button>

          <div className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 gap-2.5">
            {slides.map((item, index) => (
              <button
                key={item.image}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => setSlide(index)}
                className={`h-2.5 rounded-full shadow ${
                  slide === index
                    ? "w-9 bg-[#f6c934]"
                    : "w-2.5 bg-white/70"
                }`}
              />
            ))}
          </div>
        </div>
      </section>
      {/* BUSINESS ACTIONS */}
      <section className="border-b border-black/[.05] bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto grid max-w-[1400px] gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => go("/business/register")}
            className="rounded-2xl bg-[#1557d6] px-5 py-3.5 text-left text-xs font-black text-white shadow-[0_10px_30px_rgba(21,87,214,.16)] transition hover:-translate-y-0.5 sm:py-4 sm:text-sm"
          >
            🏪 Business Register
            <span className="mt-1 block font-medium text-white/75 sm:ml-2 sm:mt-0 sm:inline">Grow your business with SBC →</span>
          </button>

          <button
            type="button"
            onClick={() => go("/business/login")}
            className="rounded-2xl border border-[#07111f]/10 bg-[#07111f] px-5 py-3.5 text-left text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 sm:py-4 sm:text-sm"
          >
            🔐 Business Login
            <span className="mt-1 block font-medium text-white/65 sm:ml-2 sm:mt-0 sm:inline">Access your dashboard →</span>
          </button>
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
          ["♙", "Login", "/student/login"],
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
