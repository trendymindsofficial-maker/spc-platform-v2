"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import { createUserWithEmailAndPassword } from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function StudentRegister() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] =useState("");
  const [password, setPassword] = useState("");

  const [college, setCollege] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");

  const registerStudent = async () => {

    if (
      !fullName ||
      !mobile ||
      !password ||
      !college ||
      !course ||
      !year
    ) {
      alert("Fill all fields");
      return;
    }

    try {

      setLoading(true);

      const loginEmail = `${mobile}@student.spc`;

console.log("LOGIN EMAIL =", loginEmail);

const userCredential =
  await createUserWithEmailAndPassword(
    auth,
    loginEmail,
    password
  );

      const uid = userCredential.user.uid;

      const cardNumber =
        "SPC" +
        Math.floor(
          100000 + Math.random() * 900000
        );

      await setDoc(doc(db, "students", uid), {

        uid,

        fullName,

        mobile,

        email: loginEmail,

        college,

        course,

        year,

        cardNumber,

        status: "pending",

        createdAt: serverTimestamp(),

      });

      router.push("/student/login");

    } catch (error: any) {

      console.log(error);

      alert(error.message);

    } finally {

      setLoading(false);

    }

  };

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">

      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">

        <h1 className="mb-6 text-center text-3xl font-bold">
          🎓 Student Registration
        </h1>

        <div className="space-y-4">
                      <input
            placeholder="Full Name"
            className="w-full rounded-xl border p-3"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            placeholder="Mobile Number"
            className="w-full rounded-xl border p-3"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />

          <input
            placeholder="Password"
            type="password"
            className="w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            placeholder="College"
            className="w-full rounded-xl border p-3"
            value={college}
            onChange={(e) => setCollege(e.target.value)}
          />

          <input
            placeholder="Course"
            className="w-full rounded-xl border p-3"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />

          <input
            placeholder="Year"
            className="w-full rounded-xl border p-3"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />

          <button
            onClick={registerStudent}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
          >
            {loading ? "Registering..." : "Register Student"}
          </button>
                  </div>

      </div>

    </main>
  );
}