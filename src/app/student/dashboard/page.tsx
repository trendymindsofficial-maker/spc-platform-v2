"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const categories = [
  { name: "Shopping", icon: "🛍️" },
  { name: "Food & Drinks", icon: "🍴" },
  { name: "Education", icon: "🎓" },
  { name: "Fitness", icon: "🏋️" },
  { name: "Travel", icon: "✈️" },
  { name: "Entertainment", icon: "🎮" },
  { name: "Healthcare", icon: "❤️" },
  { name: "Electronics", icon: "💻" },
  { name: "Salon & Spa", icon: "✂️" },
  { name: "More", icon: "•••" },
];

const slides = [
  {
    eyebrow: "STUDY MORE. SPEND LESS.",
    title: "Big Discounts",
    highlight: "Brighter Future",
    text: "Exclusive offers from top brands and local businesses, only for students.",
    badge: "DISCOUNTS UP TO",
    badgeValue: "50%",
  },
  {
    eyebrow: "INDIA'S STUDENT BENEFIT CARD",
    title: "More Benefits.",
    highlight: "More Savings.",
    text: "One digital student card for food, shopping, travel, fitness, entertainment and more.",
    badge: "STUDENT",
    badgeValue: "SAVINGS",
  },
  {
    eyebrow: "STUDENTS SAVE. GROW. REPEAT.",
    title: "Save Today.",
    highlight: "Win Together.",
    text: "Use exclusive benefits, collect rewards and refer friends to earn more with SBC.",
    badge: "REFER &",
    badgeValue: "EARN",
  },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-[0_8px_25px_rgba(7,17,31,.08)]">
      {children}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);

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
    <main className="min-h-screen overflow-x-hidden bg-white text-[#071a3d]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => go("/")}
            className="flex min-w-0 shrink-0 items-center gap-2"
          >
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#071a3d] text-[13px] font-black text-white shadow-lg sm:h-12 sm:w-12 sm:text-sm">
              <span className="absolute -left-1 -top-1 text-[14px] text-[#ffd21c]">★</span>
              SBC
            </div>
            <div className="hidden text-left sm:block">
              <div className="text-[13px] font-black leading-4 tracking-tight">
                STUDENT
                <br />
                BENEFIT CARD
              </div>
              <div className="mt-0.5 text-[8px] font-bold text-slate-500">
                More Benefits. More Savings.
              </div>
            </div>
          </button>

          <nav className="ml-auto hidden items-center gap-6 lg:flex">
            {[
              ["Home", "/"],
              ["Offers", "/student/login"],
              ["How It Works", "#how-it-works"],
              ["For Businesses", "/business/login"],
              ["About", "#about"],
              ["Contact", "#contact"],
            ].map(([label, path]) => (
              <button
                key={label}
                type="button"
                onClick={() => go(path)}
                className="text-[12px] font-extrabold text-slate-700 transition hover:text-[#1557d6]"
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 lg:ml-5 sm:gap-2">
            <button
              type="button"
              onClick={() => go("/student/register")}
              className="rounded-lg bg-[#1557d6] px-2.5 py-2.5 text-[9px] font-black text-white shadow-md transition hover:-translate-y-0.5 sm:rounded-xl sm:px-4 sm:py-3 sm:text-[10px]"
            >
              Student Register
            </button>
            <button
              type="button"
              onClick={() => go("/student/login")}
              className="rounded-lg border border-[#1557d6] bg-white px-2.5 py-2.5 text-[9px] font-black text-[#1557d6] transition hover:bg-blue-50 sm:rounded-xl sm:px-4 sm:py-3 sm:text-[10px]"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => go("/admin/login")}
              className="rounded-lg bg-[#071a3d] px-2.5 py-2.5 text-[9px] font-black text-white transition hover:bg-[#102b59] sm:rounded-xl sm:px-4 sm:py-3 sm:text-[10px]"
            >
              Admin Login
            </button>
          </div>
        </div>
      </header>

      {/* HERO SLIDER */}
      <section className="relative overflow-hidden bg-[#eef6ff]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_40%,rgba(255,255,255,.95),transparent_34%),radial-gradient(circle_at_82%_35%,rgba(175,218,255,.8),transparent_38%)]" />

        <div className="relative mx-auto max-w-[1500px]">
          <div className="grid min-h-[540px] items-center gap-5 px-5 py-8 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:px-12 lg:py-10">
            <div className="relative z-20 max-w-[560px]">
              <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#1557d6] sm:text-xs">
                {active.eyebrow}
              </p>

              <h1 className="mt-3 text-[3rem] font-black leading-[.95] tracking-[-.055em] sm:text-6xl lg:text-[4.5rem]">
                {active.title}
                <br />
                <span className="text-[#1557d6]">{active.highlight}.</span>
              </h1>

              <p className="mt-5 max-w-[500px] text-sm font-medium leading-6 text-slate-600 sm:text-base sm:leading-7">
                {active.text}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => go("/student/register")}
                  className="rounded-xl bg-[#ffd21c] px-5 py-3.5 text-sm font-black text-[#071a3d] shadow-[0_12px_25px_rgba(255,210,28,.28)] transition hover:-translate-y-1 sm:px-7"
                >
                  Get Your SBC Card <span className="ml-2">→</span>
                </button>
                <button
                  type="button"
                  onClick={() => go("/student/login")}
                  className="rounded-xl border border-[#1557d6]/25 bg-white px-5 py-3.5 text-sm font-black text-[#1557d6] shadow-sm transition hover:-translate-y-1 sm:px-7"
                >
                  Explore Offers
                </button>
              </div>

              <div className="mt-7 grid max-w-[500px] grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["%", "Exclusive", "Discounts"],
                  ["🎁", "Reward", "Points"],
                  ["✓", "Verified", "Businesses"],
                  ["👥", "A Brighter", "Tomorrow"],
                ].map(([icon, line1, line2]) => (
                  <div key={line1} className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black shadow-sm">
                      {icon}
                    </span>
                    <span className="text-[9px] font-black leading-3 text-[#071a3d]">
                      {line1}
                      <br />
                      {line2}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-[390px] sm:h-[450px] lg:h-[500px]">
              <div className="absolute right-[5%] top-[8%] h-72 w-72 rounded-full bg-white/70 blur-2xl" />
              <div className="absolute left-[4%] top-[20%] z-30 hidden -rotate-6 text-center sm:block">
                <p className="font-serif text-2xl font-bold italic leading-7 text-[#071a3d]">
                  Students
                  <br />
                  Save
                  <br />
                  Grow
                  <br />
                  Repeat
                </p>
                <div className="ml-3 mt-1 h-1 w-24 -rotate-6 rounded-full bg-[#ffd21c]" />
              </div>

              <div className="absolute right-[3%] top-[8%] z-30 rotate-3 rounded-[1.5rem] bg-[#071a3d] px-5 py-4 text-center text-white shadow-[0_18px_40px_rgba(7,26,61,.22)]">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/70">
                  {active.badge}
                </p>
                <p className="mt-0.5 text-4xl font-black leading-none text-[#ffd21c] sm:text-5xl">
                  {active.badgeValue}
                </p>
              </div>

              <img
                src="/images/sbc-student.png"
                alt="SBC students"
                className="absolute bottom-0 left-1/2 z-20 h-full w-full -translate-x-1/2 object-contain drop-shadow-[0_28px_35px_rgba(7,26,61,.22)]"
              />

              <div className="absolute bottom-[4%] left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-2xl border border-white bg-white/95 px-4 py-2.5 text-[10px] font-black shadow-xl">
                <span className="text-lg">🎓</span>
                Made for Students
              </div>
            </div>
          </div>

          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setSlide((slide - 1 + slides.length) % slides.length)}
            className="absolute left-3 top-1/2 z-40 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#071a3d] text-xl font-black text-white shadow-xl sm:flex"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setSlide((slide + 1) % slides.length)}
            className="absolute right-3 top-1/2 z-40 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#071a3d] text-xl font-black text-white shadow-xl sm:flex"
          >
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 gap-2">
            {slides.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`Slide ${index + 1}`}
                onClick={() => setSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  slide === index ? "w-8 bg-[#1557d6]" : "w-2 bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-[1450px]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              Explore Top Categories
            </h2>
            <button
              type="button"
              onClick={() => go("/student/login")}
              className="text-xs font-black text-[#1557d6]"
            >
              View All →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 lg:grid-cols-10">
            {categories.map((item, index) => (
              <button
                key={item.name}
                type="button"
                onClick={() => go("/student/login")}
                className="group rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-[0_8px_24px_rgba(7,26,61,.045)] transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${
                    [
                      "bg-rose-50",
                      "bg-orange-50",
                      "bg-emerald-50",
                      "bg-purple-50",
                      "bg-blue-50",
                    ][index % 5]
                  }`}
                >
                  {item.icon}
                </div>
                <p className="mt-2 text-[10px] font-black leading-4">{item.name}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED OFFERS */}
      <section className="bg-[#fafcff] px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-[1450px]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1557d6]">
                SBC EXCLUSIVE
              </p>
              <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                Featured Student Offers
              </h2>
            </div>
            <button
              type="button"
              onClick={() => go("/student/login")}
              className="text-xs font-black text-[#1557d6]"
            >
              View All →
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              ["zomato", "UP TO 50% OFF", "Food & Dining", "🍔"],
              ["Myntra", "FLAT 40% OFF", "Fashion", "🛍️"],
              ["PVR", "STUDENT OFFERS", "Movies", "🎬"],
              ["MakeMyTrip", "UP TO 30% OFF", "Travel", "✈️"],
              ["Cult.fit", "UP TO 50% OFF", "Fitness", "🏋️"],
              ["Local Businesses", "SPECIAL DEALS", "Near You", "🏪"],
            ].map(([brand, offer, category, icon]) => (
              <button
                key={brand}
                type="button"
                onClick={() => go("/student/login")}
                className="group relative min-h-[150px] overflow-hidden rounded-2xl bg-[#071a3d] p-4 text-left text-white shadow-[0_12px_28px_rgba(7,26,61,.14)] transition hover:-translate-y-1"
              >
                <div className="absolute -right-7 -top-7 h-24 w-24 rounded-full bg-[#1557d6]/60 blur-xl" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <span className="rounded-xl bg-white px-2.5 py-2 text-[10px] font-black text-[#071a3d]">
                      {brand}
                    </span>
                    <span className="text-2xl">{icon}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/60">
                      {category}
                    </p>
                    <p className="mt-1 text-lg font-black leading-5 text-[#ffd21c]">
                      {offer}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* HOW SBC WORKS */}
      <section id="how-it-works" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[1450px]">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1557d6]">
                SIMPLE STEPS. BIG BENEFITS.
              </p>
              <h2 className="mt-1 text-3xl font-black sm:text-4xl">
                How <span className="text-[#1557d6]">SBC</span> Works?
              </h2>
            </div>
            <div className="hidden font-serif text-xl italic text-[#071a3d] sm:block">
              Students Win Together
            </div>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-3">
            {[
              ["01", "Register Here", "Get your SBC card and join as a student.", "👤", "bg-blue-50", "text-[#1557d6]"],
              ["02", "Use Discounts", "Explore offers and save at your favourite brands.", "%", "bg-emerald-50", "text-emerald-600"],
              ["03", "Refer & Earn", "Invite friends and earn exciting rewards.", "👥", "bg-pink-50", "text-pink-600"],
            ].map(([number, title, text, icon, bg, color]) => (
              <div key={number} className={`rounded-3xl ${bg} p-6`}>
                <div className="flex items-start gap-4">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-black shadow-sm ${color}`}>
                    {number}
                  </span>
                  <div>
                    <Icon>{icon}</Icon>
                  </div>
                  <div className="pt-1">
                    <h3 className={`text-base font-black ${color}`}>{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-4 pb-12 sm:px-6">
        <div className="mx-auto grid max-w-[1450px] overflow-hidden rounded-3xl bg-[#071a3d] text-white sm:grid-cols-4">
          {[
            ["10,000+", "Students Joined", "👥"],
            ["500+", "Partner Businesses", "🏪"],
            ["1,000+", "Exclusive Offers", "🏷️"],
            ["4.8/5", "Student Rating", "★"],
          ].map(([number, label, icon]) => (
            <div key={label} className="flex items-center justify-center gap-3 border-b border-white/10 px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-2xl font-black">{number}</p>
                <p className="text-[9px] font-bold text-white/55">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STUDENT TESTIMONIALS */}
      <section id="about" className="bg-[#f6faff] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[1450px]">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1557d6]">
                REAL STUDENTS. REAL SAVINGS.
              </p>
              <h2 className="mt-1 text-3xl font-black">What Students Say</h2>
            </div>
            <span className="hidden font-serif text-xl italic text-[#071a3d] sm:block">
              Real Student Stories
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["Priya S.", "Engineering Student", "“SBC helped me save so much on food and shopping. It is a must for every student!”"],
              ["Rahul K.", "B.Tech Student", "“Amazing offers and easy to use. The refer & earn program is awesome!”"],
              ["Sneha M.", "Degree Student", "“I love the student-only discounts. SBC really understands what students need!”"],
            ].map(([name, role, quote]) => (
              <div key={name} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_25px_rgba(7,26,61,.045)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e9f2ff] text-xl">
                    👤
                  </div>
                  <div>
                    <p className="text-sm font-black">{name}</p>
                    <p className="text-[10px] text-slate-400">{role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{quote}</p>
                <p className="mt-3 text-sm tracking-[.2em] text-[#ffb800]">★★★★★</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP CTA */}
      <section id="contact" className="px-4 py-12 sm:px-6">
        <div className="mx-auto grid max-w-[1450px] items-center gap-8 overflow-hidden rounded-[2rem] bg-[#eaf4ff] px-6 py-9 sm:px-10 lg:grid-cols-[1fr_.7fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#1557d6]">
              TAKE SBC EVERYWHERE
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Your Student Partner. Always.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Discover offers faster, access your digital membership and stay
              connected with student benefits wherever you go.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white">
                ▶ Google Play
              </button>
              <button className="rounded-xl bg-black px-5 py-3 text-xs font-black text-white">
                 App Store
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <img
              src="/images/sbc-card.png"
              alt="SBC digital card"
              className="w-full max-w-[380px] rotate-[-5deg] object-contain drop-shadow-[0_25px_30px_rgba(7,26,61,.18)]"
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#06152f] px-5 py-10 text-white sm:px-8">
        <div className="mx-auto grid max-w-[1450px] gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-black text-[#071a3d]">
                SBC
              </div>
              <div>
                <p className="text-sm font-black">STUDENT BENEFIT CARD</p>
                <p className="text-[9px] text-white/50">More Benefits. More Savings.</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-black">Quick Links</p>
            <div className="mt-3 space-y-2 text-[11px] text-white/60">
              <button onClick={() => go("/")}>Home</button>
              <br />
              <button onClick={() => go("/student/login")}>Offers</button>
              <br />
              <button onClick={() => go("#how-it-works")}>How It Works</button>
              <br />
              <button onClick={() => go("/business/login")}>For Businesses</button>
            </div>
          </div>

          <div>
            <p className="text-xs font-black">Support</p>
            <div className="mt-3 space-y-2 text-[11px] text-white/60">
              <p>Contact Us</p>
              <p>FAQs</p>
              <p>Privacy Policy</p>
              <p>Terms & Conditions</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-black">Follow SBC</p>
            <p className="mt-3 text-sm text-white/70">Instagram • Facebook • YouTube</p>
            <p className="mt-4 font-serif text-lg italic text-white/80">
              Students Win Together
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-[1450px] border-t border-white/10 pt-5 text-[10px] text-white/40">
          © 2026 Student Benefit Card. All rights reserved.
        </div>
      </footer>

      {/* MOBILE NAV */}
      <div className="fixed bottom-3 left-1/2 z-50 flex w-[calc(100%-20px)] max-w-md -translate-x-1/2 items-center justify-between rounded-2xl border border-white/80 bg-white/95 px-2 py-2 shadow-[0_18px_50px_rgba(7,26,61,.18)] backdrop-blur-xl sm:hidden">
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
            className={`flex min-w-[65px] flex-col items-center rounded-xl px-2 py-2 ${
              index === 0 ? "bg-[#edf4ff] text-[#1557d6]" : "text-slate-500"
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