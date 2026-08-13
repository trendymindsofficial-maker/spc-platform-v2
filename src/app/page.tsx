"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-100"
      style={{
        backgroundImage: "url('/sbc-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]" />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen">

        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10">

          <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_430px]">

            {/* =========================================
                LEFT SIDE
            ========================================== */}

            <section className="hidden lg:block">

              <div className="max-w-xl rounded-3xl bg-white/75 p-10 shadow-2xl backdrop-blur-md">

                <div className="mb-5 h-1.5 w-16 rounded-full bg-blue-600" />

                <h1 className="text-5xl font-extrabold leading-tight text-slate-800">
                  Unlock Benefits.
                  <br />
                  Explore Opportunities.
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
                  SBC Platform brings exclusive offers and
                  privileges to students and supports businesses
                  to grow together.
                </p>

                {/* Feature Cards */}

                <div className="mt-8 grid gap-4 sm:grid-cols-2">

                  <div className="rounded-2xl bg-white/90 p-5 shadow-md">
                    <div className="text-3xl">🏷️</div>

                    <h3 className="mt-3 font-bold text-slate-800">
                      Exclusive Discounts
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Save more with exciting student offers.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/90 p-5 shadow-md">
                    <div className="text-3xl">🏪</div>

                    <h3 className="mt-3 font-bold text-slate-800">
                      Partner Businesses
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Trusted local businesses supporting students.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/90 p-5 shadow-md">
                    <div className="text-3xl">🛡️</div>

                    <h3 className="mt-3 font-bold text-slate-800">
                      Secure & Reliable
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Your data and benefits are protected.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/90 p-5 shadow-md">
                    <div className="text-3xl">👥</div>

                    <h3 className="mt-3 font-bold text-slate-800">
                      Stronger Together
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Students and businesses growing together.
                    </p>
                  </div>

                </div>

              </div>

            </section>


            {/* =========================================
                LOGIN / REGISTRATION PANEL
            ========================================== */}

            <section className="w-full">

              <div className="rounded-[2rem] bg-white/95 p-7 shadow-2xl backdrop-blur-md sm:p-9">

                {/* LOGO / TITLE */}

                <div className="text-center">

                  <h1 className="text-4xl font-extrabold tracking-tight text-indigo-700">
                    SBC Platform
                  </h1>

                  <p className="mt-2 text-base font-medium text-slate-500">
                    Student Benefit Card
                  </p>

                </div>


                {/* BUTTONS */}

                <div className="mt-9 space-y-3.5">

                  {/* STUDENT LOGIN */}

                  <button
                    onClick={() =>
                      router.push("/student/login")
                    }
                    className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg active:translate-y-0"
                  >
                    🎓 Student Login
                  </button>


                  {/* STUDENT REGISTRATION */}

                  <button
                    onClick={() =>
                      router.push("/student/register")
                    }
                    className="w-full rounded-2xl bg-sky-500 px-5 py-4 text-base font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-sky-600 hover:shadow-lg active:translate-y-0"
                  >
                    📝 Student Registration
                  </button>


                  {/* BUSINESS LOGIN */}

                  <button
                    onClick={() =>
                      router.push("/business/login")
                    }
                    className="w-full rounded-2xl bg-green-600 px-5 py-4 text-base font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-lg active:translate-y-0"
                  >
                    🏪 Business Login
                  </button>


                  {/* BUSINESS REGISTRATION */}

                  <button
                    onClick={() =>
                      router.push("/business/register")
                    }
                    className="w-full rounded-2xl bg-emerald-500 px-5 py-4 text-base font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-lg active:translate-y-0"
                  >
                    📝 Business Registration
                  </button>


                  {/* ADMIN LOGIN */}

                  <button
                    onClick={() =>
                      router.push("/admin/login")
                    }
                    className="w-full rounded-2xl bg-red-600 px-5 py-4 text-base font-bold text-white shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-lg active:translate-y-0"
                  >
                    👨‍💼 Admin Login
                  </button>

                </div>


                {/* MOBILE DESCRIPTION */}

                <div className="mt-8 text-center lg:hidden">

                  <p className="text-sm leading-6 text-slate-500">
                    Exclusive student benefits, trusted
                    businesses and better opportunities
                    through one platform.
                  </p>

                </div>


                {/* FOOTER */}

                <div className="mt-8 border-t border-slate-200 pt-5 text-center">

                  <p className="text-xs font-medium text-slate-400">
                    © {new Date().getFullYear()} SBC Platform
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Student Benefit Card
                  </p>

                </div>

              </div>

            </section>

          </div>

        </div>

      </div>

    </main>
  );
}