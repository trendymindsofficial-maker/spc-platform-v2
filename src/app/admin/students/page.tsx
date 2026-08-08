"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import AdminProtected from "@/components/AdminProtected";
import { db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

interface Student {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  college: string;
  cardNumber: string;
  status: string;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const snap = await getDocs(
      collection(db, "students")
    );

    const data = snap.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Student[];

    setStudents(data);
    setLoading(false);
  };

  const deleteStudent = async (
    id: string,
    name: string
  ) => {

    const ok = window.confirm(
      `Delete "${name}" ?`
    );

    if (!ok) return;

    await deleteDoc(
      doc(db, "students", id)
    );

    loadStudents();

  };

  const filteredStudents =
    students.filter((student) =>
      student.fullName
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );

  return (

    <AdminProtected>

      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-7xl">

          <div className="mb-8 flex items-center justify-between">

            <div>

              <h1 className="text-4xl font-bold text-blue-700">
                👨‍🎓 Student Management
              </h1>

              <p className="mt-2 text-gray-600">
                View, Search and Manage Students
              </p>

            </div>

            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white hover:bg-gray-800"
            >
              ← Dashboard
            </Link>

          </div>
                    <input
            type="text"
            placeholder="Search Student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-blue-600"
          />

          {loading ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

              <h2 className="text-2xl font-bold">
                Loading Students...
              </h2>

            </div>

          ) : (

            <div className="grid gap-6">

              {filteredStudents.length === 0 ? (

                <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

                  <h2 className="text-2xl font-bold">
                    No Students Found
                  </h2>

                </div>

              ) : (

                filteredStudents.map((student) => (

                  <div
                    key={student.id}
                    className="rounded-3xl bg-white p-6 shadow-xl"
                  >

                    <div className="grid gap-6 md:grid-cols-2">

                      <div>

                        <h2 className="text-3xl font-bold text-blue-700">

                          {student.fullName}

                        </h2>

                        <p className="mt-4 text-gray-600">

                          📧 Email :
                          <span className="font-semibold">
                            {" "}
                            {student.email || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          📱 Mobile :
                          <span className="font-semibold">
                            {" "}
                            {student.mobile || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          🏫 College :
                          <span className="font-semibold">
                            {" "}
                            {student.college || "-"}
                          </span>

                        </p>

                        <p className="mt-2 text-gray-600">

                          🆔 Card No :
                          <span className="font-semibold">
                            {" "}
                            {student.cardNumber || "-"}

                          </span>

                        </p>

                      </div>

                      <div className="flex flex-col items-start justify-center">
                                                <span
                          className={`rounded-full px-5 py-2 font-bold text-white
                            ${
                              student.status === "active"
                                ? "bg-green-600"
                                : "bg-red-600"
                            }`}
                        >
                          {(student.status || "active").toUpperCase()}
                        </span>

                        <div className="mt-6 flex flex-wrap gap-3">

                          <button
                            className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                          >
                            👁 View
                          </button>

                          <button
                            onClick={() =>
                              deleteStudent(
                                student.id,
                                student.fullName
                              )
                            }
                            className="rounded-xl bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
                          >
                            🗑 Delete
                          </button>

                        </div>

                      </div>

                    </div>

                  </div>
                                  ))

              )}

            </div>

          )}

        </div>

      </main>

    </AdminProtected>

  );
}