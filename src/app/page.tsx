import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

        <h1 className="mb-2 text-center text-4xl font-bold text-indigo-700">
          SBC Platform
        </h1>

        <p className="mb-10 text-center text-gray-500">
          Student Benefit Card
        </p>

        <div className="space-y-4">

          <Link
            href="/student/login"
            className="block rounded-2xl bg-blue-600 py-4 text-center text-lg font-semibold text-white transition hover:bg-blue-700"
          >
            🎓 Student Login
          </Link>

          <Link
            href="/student/register"
            className="block rounded-2xl bg-sky-500 py-4 text-center text-lg font-semibold text-white transition hover:bg-sky-600"
          >
            📝 Student Registration
          </Link>

          <Link
            href="/business/login"
            className="block rounded-2xl bg-green-600 py-4 text-center text-lg font-semibold text-white transition hover:bg-green-700"
          >
            🏪 Business Login
          </Link>

          <Link
            href="/business/register"
            className="block rounded-2xl bg-emerald-500 py-4 text-center text-lg font-semibold text-white transition hover:bg-emerald-600"
          >
            📝 Business Registration
          </Link>

          <Link
            href="/admin/login"
            className="block rounded-2xl bg-red-600 py-4 text-center text-lg font-semibold text-white transition hover:bg-red-700"
          >
            👨‍💼 Admin Login
          </Link>

        </div>

      </div>
    </main>
  );
}