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
  updateDoc,
} from "firebase/firestore";

interface Student {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  college: string;
  cardNumber: string;
  status: string;
  createdAt?: unknown;
}

export default function AdminStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [approvingStudent, setApprovingStudent] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);

      const snap = await getDocs(collection(db, "students"));

      const data = snap.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Student[];

      setStudents(data);
    } catch (error) {
      console.error("Error loading students:", error);
      alert("Unable to load students.");
    } finally {
      setLoading(false);
    }
  };

  const approveStudent = async (
    id: string,
    name: string
  ) => {
    const ok = window.confirm(
      `Approve "${name}" as an SPC student?`
    );

    if (!ok) return;

    try {
      setApprovingStudent(id);

      await updateDoc(doc(db, "students", id), {
        status: "active",
      });

      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === id
            ? { ...student, status: "active" }
            : student
        )
      );

      setExpandedStudent(id);

      alert(`${name} approved successfully.`);
    } catch (error) {
      console.error("Error approving student:", error);
      alert("Unable to approve student.");
    } finally {
      setApprovingStudent(null);
    }
  };

  const deleteStudent = async (
    id: string,
    name: string
  ) => {
    const ok = window.confirm(
      `Delete "${name}" ?`
    );

    if (!ok) return;

    try {
      await deleteDoc(doc(db, "students", id));

      setStudents((currentStudents) =>
        currentStudents.filter(
          (student) => student.id !== id
        )
      );

      if (expandedStudent === id) {
        setExpandedStudent(null);
      }
    } catch (error) {
      console.error("Error deleting student:", error);
      alert("Unable to delete student.");
    }
  };

  const filteredStudents = students
    .filter((student) =>
      student.fullName
        ?.toLowerCase()
        .includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aPending =
        a.status?.toLowerCase() === "pending";

      const bPending =
        b.status?.toLowerCase() === "pending";

      if (aPending && !bPending) return -1;
      if (!aPending && bPending) return 1;

      return a.fullName.localeCompare(b.fullName);
    });

  const isPending = (student: Student) =>
    student.status?.toLowerCase() === "pending";

  return (
    <AdminProtected>
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">

            <div>
              <h1 className="text-4xl font-bold text-blue-700">
                👨‍🎓 Student Management
              </h1>

              <p className="mt-2 text-gray-600">
                View, Search, Approve and Manage Students
              </p>
            </div>

            <Link
              href="/admin/dashboard"
              className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white hover:bg-gray-800"
            >
              ← Dashboard
            </Link>

          </div>

          {/* Pending Count */}
          {!loading && (
            <div className="mb-6 rounded-2xl bg-orange-50 p-5 shadow">
              <p className="text-lg font-bold text-orange-700">
                ⏳ Pending Approvals:{" "}
                {
                  students.filter((student) =>
                    isPending(student)
                  ).length
                }
              </p>
            </div>
          )}

          {/* Search */}
          <input
            type="text"
            placeholder="Search Student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-8 w-full rounded-xl border border-gray-300 bg-white p-4 outline-none focus:border-blue-600"
          />

          {/* Loading */}
          {loading ? (

            <div className="rounded-3xl bg-white p-10 text-center shadow-xl">
              <h2 className="text-2xl font-bold">
                Loading Students...
              </h2>
            </div>

          ) : (

            <div className="grid gap-6">

              {/* No Students */}
              {filteredStudents.length === 0 ? (

                <div className="rounded-3xl bg-white p-10 text-center shadow-xl">

                  <h2 className="text-2xl font-bold">
                    No Students Found
                  </h2>

                </div>

              ) : (

                filteredStudents.map((student) => {

                  const pending = isPending(student);

                  const isExpanded =
                    expandedStudent === student.id;

                  return (
                    <div
                      key={student.id}
                      className={`rounded-3xl bg-white p-6 shadow-xl transition ${
                        pending
                          ? "border-2 border-orange-300"
                          : ""
                      }`}
                    >

                      {/* Main Student Card */}
                      <div className="grid gap-6 md:grid-cols-2">

                        {/* Student Basic Info */}
                        <div>

                          {pending && (
                            <div className="mb-3 inline-block rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-700">
                              ⏳ NEW STUDENT
                            </div>
                          )}

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

                        {/* Status + Actions */}
                        <div className="flex flex-col items-start justify-center">

                          <span
                            className={`rounded-full px-5 py-2 font-bold text-white ${
                              pending
                                ? "bg-orange-500"
                                : "bg-green-600"
                            }`}
                          >
                            {pending
                              ? "PENDING"
                              : "APPROVED"}
                          </span>

                          <div className="mt-6 flex flex-wrap gap-3">

                            {/* VIEW */}
                            <button
                              onClick={() =>
                                setExpandedStudent(
                                  isExpanded
                                    ? null
                                    : student.id
                                )
                              }
                              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                            >
                              👁{" "}
                              {isExpanded
                                ? "Hide"
                                : "View"}
                            </button>

                            {/* APPROVE */}
                            {pending && (
                              <button
                                onClick={() =>
                                  approveStudent(
                                    student.id,
                                    student.fullName
                                  )
                                }
                                disabled={
                                  approvingStudent ===
                                  student.id
                                }
                                className="rounded-xl bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {approvingStudent ===
                                student.id
                                  ? "Approving..."
                                  : "✅ Approve"}
                              </button>
                            )}

                            {/* DELETE */}
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

                      {/* VIEW DETAILS */}
                      {isExpanded && (
                        <div className="mt-8 border-t border-gray-200 pt-6">

                          <h3 className="mb-5 text-2xl font-bold text-blue-700">
                            👤 Student Details
                          </h3>

                          <div className="grid gap-4 md:grid-cols-2">

                            <div className="rounded-2xl bg-slate-50 p-5">
                              <p className="text-sm text-gray-500">
                                Full Name
                              </p>
                              <p className="mt-1 text-lg font-bold text-gray-800">
                                {student.fullName || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                              <p className="text-sm text-gray-500">
                                Email
                              </p>
                              <p className="mt-1 text-lg font-bold text-gray-800">
                                {student.email || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                              <p className="text-sm text-gray-500">
                                Mobile
                              </p>
                              <p className="mt-1 text-lg font-bold text-gray-800">
                                {student.mobile || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                              <p className="text-sm text-gray-500">
                                College
                              </p>
                              <p className="mt-1 text-lg font-bold text-gray-800">
                                {student.college || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                              <p className="text-sm text-gray-500">
                                SPC Card Number
                              </p>
                              <p className="mt-1 text-lg font-bold text-gray-800">
                                {student.cardNumber || "-"}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-slate-50 p-5">
                              <p className="text-sm text-gray-500">
                                Account Status
                              </p>
                              <p
                                className={`mt-1 text-lg font-bold ${
                                  pending
                                    ? "text-orange-600"
                                    : "text-green-600"
                                }`}
                              >
                                {pending
                                  ? "PENDING APPROVAL"
                                  : "APPROVED"}
                              </p>
                            </div>

                          </div>

                          {/* Approve inside details */}
                          {pending && (
                            <div className="mt-6 rounded-2xl border-2 border-orange-200 bg-orange-50 p-6">

                              <h4 className="text-xl font-bold text-orange-700">
                                ⚠️ Student Approval Required
                              </h4>

                              <p className="mt-2 text-gray-600">
                                Please verify the student details
                                before approving this SPC account.
                              </p>

                              <button
                                onClick={() =>
                                  approveStudent(
                                    student.id,
                                    student.fullName
                                  )
                                }
                                disabled={
                                  approvingStudent ===
                                  student.id
                                }
                                className="mt-5 rounded-xl bg-green-600 px-7 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {approvingStudent ===
                                student.id
                                  ? "Approving Student..."
                                  : "✅ APPROVE STUDENT"}
                              </button>

                            </div>
                          )}

                          {!pending && (
                            <div className="mt-6 rounded-2xl border-2 border-green-200 bg-green-50 p-6">

                              <h4 className="text-xl font-bold text-green-700">
                                ✅ Student Approved
                              </h4>

                              <p className="mt-2 text-gray-600">
                                This student is currently an active
                                SPC member.
                              </p>

                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  );
                })

              )}

            </div>

          )}

        </div>
      </main>
    </AdminProtected>
  );
}
