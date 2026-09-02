"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#07111f]">
      <div className="relative min-h-screen overflow-hidden">
        {/* Soft background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(212,175,55,0.14),transparent_32%),radial-gradient(circle_at_90%_15%,rgba(212,175,55,0.10),transparent_30%),linear-gradient(135deg,#fffdf7_0%,#f5f3ed_48%,#eeeade_100%)]" />

        {/* Decorative shapes */}
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#d4af37]/15 blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[#d4af37]/10 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
          {/* HEADER */}
          <header className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07111f] to-[#b18a16] text-lg font-black text-white shadow-lg">
                SBC
              </div>

              <div className="text-left">
                <p className="text-sm font-black tracking-[0.18em] text-[#07111f]">
                  STUDENT BENEFIT CARD
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  One Card • More Benefits
                </p>
              </div>
            </button>

            <div className="hidden rounded-full border border-black/10 bg-white/85 px-4 py-2 text-xs font-bold text-slate-500 shadow-sm backdrop-blur sm:block">
              Secure • Simple • Rewarding
            </div>
          </header>

          {/* HERO */}
          <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* LEFT */}
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/35 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-wider text-[#8a680c] shadow-sm backdrop-blur">
                ✨ Welcome to SBC
              </div>

              <h1 className="text-5xl font-black leading-[0.98] tracking-tight text-[#07111f] sm:text-6xl lg:text-7xl">
                Student Benefit Card.
                <br />
                <span className="bg-gradient-to-r from-[#8a680c] via-[#b18a16] to-[#d4af37] bg-clip-text text-transparent">
                  More Benefits. More Savings.
                </span>
              </h1>

              <div className="mt-6 h-1.5 w-20 rounded-full bg-gradient-to-r from-[#d4af37] to-[#f1cf63]" />

              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                SBC Platform brings exclusive offers and privileges to
                students and supports businesses to grow together.
              </p>

              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl">🎁</p>
                  <p className="mt-2 text-xs font-black text-[#07111f]">
                    Exclusive
                  </p>
                  <p className="text-[10px] text-slate-500">Offers</p>
                </div>

                <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl">🏪</p>
                  <p className="mt-2 text-xs font-black text-[#07111f]">
                    Partner
                  </p>
                  <p className="text-[10px] text-slate-500">Businesses</p>
                </div>

                <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl">🛡️</p>
                  <p className="mt-2 text-xs font-black text-[#07111f]">
                    Secure
                  </p>
                  <p className="text-[10px] text-slate-500">Platform</p>
                </div>

                <div className="rounded-2xl border border-white bg-white/75 p-4 shadow-sm backdrop-blur">
                  <p className="text-xl">⭐</p>
                  <p className="mt-2 text-xs font-black text-[#07111f]">
                    Reward
                  </p>
                  <p className="text-[10px] text-slate-500">Points</p>
                </div>
              </div>
            </div>

            {/* RIGHT PORTAL CARD */}
            <div className="mx-auto w-full max-w-md">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_30px_80px_rgba(7,17,31,0.16)] backdrop-blur-xl sm:p-8">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#d4af37]/10 blur-2xl" />
                <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-[#d4af37]/10 blur-2xl" />

                <div className="relative text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#07111f] to-[#b18a16] text-xl font-black text-white shadow-lg">
                    SBC
                  </div>

                  <h2 className="mt-4 text-3xl font-black text-[#07111f]">
                    SBC Platform
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Student Benefit Card
                  </p>

                  <div className="mt-7 space-y-3">
                    {/* STUDENT */}
                    <button
                      type="button"
                      onClick={() => router.push("/student/login")}
                      className="group flex w-full items-center gap-4 rounded-2xl bg-[#07111f] px-5 py-4 text-left text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#101d2e]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">
                        🎓
                      </span>

                      <span>
                        <span className="block text-sm font-black">
                          Student Login
                        </span>
                        <span className="block text-[11px] text-white/65">
                          Access your SBC benefits
                        </span>
                      </span>

                      <span className="ml-auto text-lg opacity-70 transition group-hover:translate-x-1">
                        →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/student/register")}
                      className="group flex w-full items-center gap-4 rounded-2xl border border-[#d4af37]/35 bg-[#fff8df] px-5 py-4 text-left text-[#8a680c] transition hover:-translate-y-0.5 hover:border-[#d4af37]/50 hover:bg-[#fff3c4]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#07111f]/10 text-lg">
                        📝
                      </span>

                      <span>
                        <span className="block text-sm font-black">
                          Student Registration
                        </span>
                        <span className="block text-[11px] text-[#8a680c]/70">
                          Create your SBC account
                        </span>
                      </span>

                      <span className="ml-auto text-lg opacity-50 transition group-hover:translate-x-1">
                        →
                      </span>
                    </button>

                    <div className="my-2 flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Business
                      </span>
                      <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/business/login")}
                      className="group flex w-full items-center gap-4 rounded-2xl bg-[#07111f] px-5 py-4 text-left text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#101d2e]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg">
                        🏢
                      </span>

                      <span>
                        <span className="block text-sm font-black">
                          Business Login
                        </span>
                        <span className="block text-[11px] text-white/65">
                          Manage your SBC partnership
                        </span>
                      </span>

                      <span className="ml-auto text-lg opacity-70 transition group-hover:translate-x-1">
                        →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/business/register")}
                      className="group flex w-full items-center gap-4 rounded-2xl border border-[#d4af37]/35 bg-[#fbfaf6] px-5 py-4 text-left text-[#8a680c] transition hover:-translate-y-0.5 hover:border-[#d4af37]/50 hover:bg-[#fff8df]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#07111f]/10 text-lg">
                        📝
                      </span>

                      <span>
                        <span className="block text-sm font-black">
                          Business Registration
                        </span>
                        <span className="block text-[11px] text-[#8a680c]/70">
                          Become an SBC partner
                        </span>
                      </span>

                      <span className="ml-auto text-lg opacity-50 transition group-hover:translate-x-1">
                        →
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/admin/login")}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-[#07111f] py-3.5 text-sm font-black text-white transition hover:bg-[#101d2e]"
                    >
                      🔐 Admin Login
                    </button>
                  </div>

                  <div className="mt-6 border-t border-black/5 pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      One Card • More Benefits • More Savings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SEO CONTENT */}
          <section className="border-t border-black/10 py-12 sm:py-16">
            <div className="mx-auto max-w-5xl">
              <div className="rounded-[2rem] border border-white/80 bg-white/80 p-7 shadow-sm backdrop-blur sm:p-10">
                <div className="max-w-3xl">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a680c]">
                    Student Discounts • Offers • Benefits
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-tight text-[#07111f] sm:text-4xl">
                    Student Discounts and Exclusive Offers
                  </h2>

                  <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">
                    Student Benefit Card (SBC) is a student benefits platform
                    that helps students discover exclusive discounts, offers,
                    rewards and savings from partner businesses.
                  </p>

                  <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                    Students can explore offers from restaurants, cafes,
                    salons, shopping stores and other student-friendly
                    businesses, then use their SBC account to access eligible
                    benefits.
                  </p>

                  <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                    SBC is also helping local businesses connect with students
                    through a simple digital platform for student offers and
                    benefits.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl bg-[#fff8df] p-5">
                    <p className="text-2xl">🍽️</p>
                    <h3 className="mt-3 text-sm font-black text-[#07111f]">
                      Restaurants
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Discover student-friendly food offers and discounts.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fff8df] p-5">
                    <p className="text-2xl">☕</p>
                    <h3 className="mt-3 text-sm font-black text-[#07111f]">
                      Cafes & Drinks
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Find exclusive offers for coffee, shakes and more.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fff8df] p-5">
                    <p className="text-2xl">💇</p>
                    <h3 className="mt-3 text-sm font-black text-[#07111f]">
                      Salons & Beauty
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Explore student offers from salons and beauty partners.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#fff8df] p-5">
                    <p className="text-2xl">🛍️</p>
                    <h3 className="mt-3 text-sm font-black text-[#07111f]">
                      Shopping & More
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Save more with offers from participating local stores.
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-[#d4af37]/25 bg-[#fbfaf6] p-6">
                  <h3 className="text-lg font-black text-[#07111f]">
                    Student Offers in Nellore
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    SBC is building a growing network of student offers in
                    Nellore, connecting college students with local
                    restaurants, cafes, salons, shops and other partner
                    businesses.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="border-t border-black/10/80 py-5 text-center">
            <p className="text-xs font-bold text-slate-500">
              © 2026 SBC Platform • Student Benefit Card
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Secure • Simple • Rewarding
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}