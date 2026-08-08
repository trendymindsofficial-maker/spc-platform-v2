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

export default function BusinessRegister() {

  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");

  const registerBusiness = async () => {

    if (
      !businessName ||
      !ownerName ||
      !mobile ||
      !password ||
      !category ||
      !address
    ) {
      alert("Fill all fields");
      return;
    }

    try {

      setLoading(true);

      const loginEmail = `${mobile}@business.spc`;

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          loginEmail,
          password
        );

      const uid = userCredential.user.uid;

      await setDoc(doc(db, "businesses", uid), {

        uid,

        businessName,

        ownerName,

        mobile,

        email: loginEmail,

        category,

        address,

        status: "pending",

        createdAt: serverTimestamp(),

      });

      router.replace("/business/login");

    } catch (error: any) {

      alert(error.message);

    } finally {

      setLoading(false);

    }

  };

  return (

    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">

      <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-xl">

        <h1 className="mb-6 text-center text-3xl font-bold">
          🏪 Business Registration
        </h1>

        <div className="space-y-4">
                      <input
            placeholder="Business Name"
            className="w-full rounded-xl border p-3"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />

          <input
            placeholder="Owner Name"
            className="w-full rounded-xl border p-3"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />

          <input
            placeholder="Mobile Number"
            className="w-full rounded-xl border p-3"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select
            className="w-full rounded-xl border p-3"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            <option value="Restaurant">Restaurant</option>
            <option value="Hospital">Hospital</option>
            <option value="Shopping">Shopping</option>
            <option value="Clothing">Clothing</option>
            <option value="Education">Education</option>
            <option value="Gym">Gym</option>
            <option value="Electronics">Electronics</option>
            <option value="Salon">Salon</option>
            <option value="Other">Other</option>
          </select>

          <textarea
            placeholder="Business Address"
            className="h-28 w-full rounded-xl border p-3"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <button
            onClick={registerBusiness}
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-4 text-lg font-bold text-white hover:bg-green-700"
          >
            {loading ? "Registering..." : "Register Business"}
          </button>
                  </div>

      </div>

    </main>

  );
}