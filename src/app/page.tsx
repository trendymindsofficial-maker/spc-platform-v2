"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      {/* =====================================================
          FULL BACKGROUND IMAGE
      ====================================================== */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/sbc-background.jpg')",
        }}
      />

      {/* Very light readability overlay — NOT dull */}
      <div className="absolute inset-0 bg-white/5" />

      {/* =====================================================
          CONTENT
      ====================================================== */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:justify-end lg:px-16 xl:px-24">
        {/* =================================================
            NAVIGATION PANEL
        ================================================== */}
        <section className="w-full max-w-[430px]">
          <div
            className="
              rounded-[2rem]
              border border-white/70
              bg-white/95
              p-7
              shadow-[0_25px_70px_rgba(15,23,42,0.22)]
              backdrop-blur-md
              sm:p-9
            "
          >
            {/* =================================================
                TITLE
            ================================================== */}
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight text-indigo-700 sm:text-[42px]">
                SBC Platform
              </h1>

              <p className="mt-2 text-base font-medium text-slate-500">
                Student Benefit Card
              </p>
            </div>

            {/* =================================================
                BUTTONS
            ================================================== */}
            <div className="mt-9 space-y-3.5">
              {/* STUDENT LOGIN */}
              <button
                type="button"
                onClick={() => router.push("/student/login")}
                className="
                  w-full
                  rounded-2xl
                  bg-blue-600
                  px-5
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-blue-700
                  hover:shadow-xl
                  active:translate-y-0
                "
              >
                🎓 Student Login
              </button>

              {/* STUDENT REGISTRATION */}
              <button
                type="button"
                onClick={() => router.push("/student/register")}
                className="
                  w-full
                  rounded-2xl
                  bg-sky-500
                  px-5
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-sky-600
                  hover:shadow-xl
                  active:translate-y-0
                "
              >
                📝 Student Registration
              </button>

              {/* BUSINESS LOGIN */}
              <button
                type="button"
                onClick={() => router.push("/business/login")}
                className="
                  w-full
                  rounded-2xl
                  bg-green-600
                  px-5
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-green-700
                  hover:shadow-xl
                  active:translate-y-0
                "
              >
                🏪 Business Login
              </button>

              {/* BUSINESS REGISTRATION */}
              <button
                type="button"
                onClick={() => router.push("/business/register")}
                className="
                  w-full
                  rounded-2xl
                  bg-emerald-500
                  px-5
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-emerald-600
                  hover:shadow-xl
                  active:translate-y-0
                "
              >
                📝 Business Registration
              </button>

              {/* ADMIN LOGIN */}
              <button
                type="button"
                onClick={() => router.push("/admin/login")}
                className="
                  w-full
                  rounded-2xl
                  bg-red-600
                  px-5
                  py-4
                  text-base
                  font-bold
                  text-white
                  shadow-md
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:bg-red-700
                  hover:shadow-xl
                  active:translate-y-0
                "
              >
                👨‍💼 Admin Login
              </button>
            </div>

            {/* =================================================
                FOOTER
            ================================================== */}
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
    </main>
  );
}