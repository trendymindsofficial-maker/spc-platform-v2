"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QRCode from "react-qr-code";

import { auth, db } from "@/lib/firebase";
import { enableStudentNotifications } from "@/lib/firebase-messaging";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

interface Student {
  uid: string;
  fullName?: string;
  cardNumber?: string;
  college?: string;
  course?: string;
  year?: string;
  mobile?: string;
  email?: string;
  status?: string;
}

export default function StudentDashboard() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [error, setError] =
    useState("");

  /*
   * ==========================================
   * SESSION CACHE
   * ==========================================
   */

  const getCacheKey = (
    uid: string
  ) => {
    return `sbc_student_dashboard_${uid}`;
  };

  /*
   * ==========================================
   * SAVE STUDENT CACHE
   * ==========================================
   */

  const saveStudentToCache = (
    studentData: Student
  ) => {
    try {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      sessionStorage.setItem(
        getCacheKey(
          studentData.uid
        ),
        JSON.stringify(
          studentData
        )
      );

      console.log(
        "✅ Student saved to session cache."
      );

    } catch (error) {
      console.error(
        "Student cache save error:",
        error
      );
    }
  };

  /*
   * ==========================================
   * LOAD STUDENT CACHE
   * ==========================================
   */

  const loadStudentFromCache = (
    uid: string
  ): Student | null => {
    try {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      const cached =
        sessionStorage.getItem(
          getCacheKey(uid)
        );

      if (!cached) {
        return null;
      }

      const parsed =
        JSON.parse(
          cached
        ) as Student;

      if (
        !parsed ||
        !parsed.uid
      ) {
        return null;
      }

      /*
       * VERY IMPORTANT:
       *
       * Cache UID must match
       * current Firebase Auth UID.
       */

      if (
        parsed.uid !== uid
      ) {
        console.warn(
          "Cached student UID does not match current auth UID."
        );

        return null;
      }

      return parsed;

    } catch (error) {
      console.error(
        "Student cache read error:",
        error
      );

      return null;
    }
  };

  /*
   * ==========================================
   * BUILD STUDENT OBJECT
   * ==========================================
   */

  const buildStudentData = (
    data: any,
    uid: string,
    email?: string | null
  ): Student => {
    return {
      uid,

      fullName:
        data.fullName ||
        "",

      cardNumber:
        data.cardNumber ||
        "",

      college:
        data.college ||
        "",

      course:
        data.course ||
        "",

      year:
        data.year ||
        "",

      mobile:
        data.mobile ||
        "",

      email:
        data.email ||
        email ||
        "",

      status:
        data.status ||
        "pending",
    };
  };

  /*
   * ==========================================
   * APPLY STUDENT
   * ==========================================
   */

  const applyStudent = (
    studentData: Student
  ) => {
    setStudent(
      studentData
    );

    setError("");

    saveStudentToCache(
      studentData
    );
  };

  /*
   * ==========================================
   * LOAD STUDENT
   * ==========================================
   *
   * ONLY a valid student record is accepted.
   *
   * Business account:
   *
   * business UID
   *       ↓
   * students/{businessUID} missing
   *       ↓
   * uid query missing
   *       ↓
   * email query missing
   *       ↓
   * NOT A STUDENT
   *
   * Then caller redirects to student login.
   */

  const loadStudent = async (
    uid: string,
    email?: string | null
  ): Promise<boolean> => {

    /*
     * ========================================
     * METHOD 1
     * students/{uid}
     * ========================================
     */

    try {
      const studentRef =
        doc(
          db,
          "students",
          uid
        );

      const snap =
        await getDoc(
          studentRef
        );

      console.log(
        "Direct student document:",
        {
          id:
            snap.id,
          exists:
            snap.exists(),
          uid,
          email,
        }
      );

      if (
        snap.exists()
      ) {
        const data =
          snap.data();

        const studentData =
          buildStudentData(
            data,
            uid,
            email
          );

        console.log(
          "✅ STUDENT FOUND BY DOCUMENT ID"
        );

        applyStudent(
          studentData
        );

        return true;
      }

    } catch (error) {
      console.error(
        "Direct student document error:",
        error
      );
    }

    /*
     * ========================================
     * METHOD 2
     * students where uid == auth.uid
     * ========================================
     */

    try {
      const uidQuery =
        query(
          collection(
            db,
            "students"
          ),
          where(
            "uid",
            "==",
            uid
          )
        );

      const uidSnap =
        await getDocs(
          uidQuery
        );

      console.log(
        "Student UID query:",
        {
          empty:
            uidSnap.empty,
          size:
            uidSnap.size,
        }
      );

      if (
        !uidSnap.empty
      ) {
        const studentDoc =
          uidSnap.docs[0];

        const data =
          studentDoc.data();

        /*
         * Use the actual student
         * document ID.
         */

        const studentData =
          buildStudentData(
            data,
            studentDoc.id,
            email
          );

        /*
         * IMPORTANT:
         *
         * Verify that the Firestore
         * student record really belongs
         * to current Auth UID.
         */

        if (
          data.uid &&
          data.uid !== uid
        ) {
          console.warn(
            "Student UID mismatch. Rejecting record."
          );

          return false;
        }

        console.log(
          "✅ STUDENT FOUND BY UID FIELD"
        );

        applyStudent(
          studentData
        );

        return true;
      }

    } catch (error) {
      console.error(
        "Student UID query error:",
        error
      );
    }

    /*
     * ========================================
     * METHOD 3
     * Search by email
     * ========================================
     */

    if (email) {
      try {
        const emailQuery =
          query(
            collection(
              db,
              "students"
            ),
            where(
              "email",
              "==",
              email
            )
          );

        const emailSnap =
          await getDocs(
            emailQuery
          );

        console.log(
          "Student email query:",
          {
            empty:
              emailSnap.empty,
            size:
              emailSnap.size,
          }
        );

        if (
          !emailSnap.empty
        ) {
          const studentDoc =
            emailSnap.docs[0];

          const data =
            studentDoc.data();

          /*
           * If UID exists in the
           * student record, it MUST
           * match current Auth UID.
           */

          if (
            data.uid &&
            data.uid !== uid
          ) {
            console.warn(
              "Email matched another student's UID. Rejecting."
            );

            return false;
          }

          const studentData =
            buildStudentData(
              data,
              studentDoc.id,
              email
            );

          console.log(
            "✅ STUDENT FOUND BY EMAIL"
          );

          applyStudent(
            studentData
          );

          return true;
        }

      } catch (error) {
        console.error(
          "Student email query error:",
          error
        );
      }
    }

    /*
     * ========================================
     * NOT A STUDENT
     * ========================================
     */

    console.warn(
      "❌ AUTH USER IS NOT A VALID STUDENT:",
      {
        uid,
        email,
      }
    );

    return false;
  };

  /*
   * ==========================================
   * FORCE STUDENT LOGIN
   * ==========================================
   *
   * This is the important fix.
   *
   * If business account opens
   * student dashboard:
   *
   * Business Auth
   *       ↓
   * No student document
   *       ↓
   * Sign out
   *       ↓
   * Student Login
   */

  const redirectToStudentLogin =
    async () => {
      try {
        console.warn(
          "⚠️ Current account is not a student. Redirecting to student login."
        );

        await signOut(
          auth
        );

      } catch (error) {
        console.error(
          "Sign out during student guard failed:",
          error
        );

      } finally {
        router.replace(
          "/student/login"
        );
      }
    };

  /*
   * ==========================================
   * FIRST LOGIN NOTIFICATION
   * ==========================================
   */

  const enableNotificationsOnFirstLogin =
    async (
      uid: string
    ) => {
      try {
        if (
          typeof window ===
          "undefined"
        ) {
          return;
        }

        if (
          !(
            "Notification" in
            window
          )
        ) {
          return;
        }

        const promptKey =
          `sbc_notification_prompted_${uid}`;

        /*
         * Permission already granted
         */

        if (
          Notification.permission ===
          "granted"
        ) {
          try {
            await enableStudentNotifications();
          } catch (error) {
            console.error(
              "Unable to refresh notification token:",
              error
            );
          }

          return;
        }

        /*
         * Permission denied
         */

        if (
          Notification.permission ===
          "denied"
        ) {
          return;
        }

        /*
         * Already successfully prompted
         */

        const alreadyPrompted =
          localStorage.getItem(
            promptKey
          );

        if (
          alreadyPrompted ===
          "true"
        ) {
          return;
        }

        /*
         * Ask student
         */

        const shouldEnable =
          window.confirm(
            "🔔 Stay Updated with SBC\n\n" +
              "Get new offers, important announcements " +
              "and SBC updates directly on your device.\n\n" +
              "Click OK to enable notifications."
          );

        if (
          !shouldEnable
        ) {
          return;
        }

        /*
         * Enable notifications
         */

        try {
          await enableStudentNotifications();

          localStorage.setItem(
            promptKey,
            "true"
          );

          console.log(
            "✅ SBC notifications enabled successfully."
          );

        } catch (error) {
          console.error(
            "Notification enable failed:",
            error
          );

          localStorage.removeItem(
            promptKey
          );
        }

      } catch (error) {
        console.error(
          "Notification setup error:",
          error
        );
      }
    };

  /*
   * ==========================================
   * AUTH + STUDENT GUARD
   * ==========================================
   */

  useEffect(() => {
    let mounted = true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          if (
            !mounted
          ) {
            return;
          }

          /*
           * ==================================
           * NOT LOGGED IN
           * ==================================
           */

          if (!user) {
            setStudent(
              null
            );

            setLoading(
              false
            );

            router.replace(
              "/student/login"
            );

            return;
          }

          console.log(
            "================================"
          );

          console.log(
            "STUDENT PAGE AUTH USER:",
            {
              uid:
                user.uid,
              email:
                user.email,
            }
          );

          /*
           * ==================================
           * STEP 1
           * CHECK CACHE
           * ==================================
           */

          const cachedStudent =
            loadStudentFromCache(
              user.uid
            );

          if (
            cachedStudent
          ) {
            /*
             * Show cached student immediately.
             */

            setStudent(
              cachedStudent
            );

            setError("");

            setLoading(
              false
            );

            console.log(
              "✅ Showing cached student dashboard."
            );
          } else {
            setLoading(
              true
            );

            setError("");
          }

          /*
           * ==================================
           * STEP 2
           * VERIFY STUDENT IN FIRESTORE
           * ==================================
           */

          const success =
            await loadStudent(
              user.uid,
              user.email
            );

          if (
            !mounted
          ) {
            return;
          }

          /*
           * ==================================
           * STEP 3
           *
           * VERY IMPORTANT
           *
           * If no student record exists,
           * NEVER show Student Details
           * Not Available if this is simply
           * a business account.
           *
           * Sign out and redirect.
           * ==================================
           */

          if (
            !success
          ) {
            console.warn(
              "❌ This authenticated account is not a valid SBC student."
            );

            /*
             * Do NOT keep old cached student
             * when current Auth UID is different.
             */

            setStudent(
              null
            );

            setLoading(
              false
            );

            await redirectToStudentLogin();

            return;
          }

          /*
           * ==================================
           * STEP 4
           * SUCCESS
           * ==================================
           */

          setLoading(
            false
          );

          /*
           * Notifications should NOT block
           * dashboard.
           */

          enableNotificationsOnFirstLogin(
            user.uid
          ).catch(
            (error) =>
              console.error(
                "Notification setup error:",
                error
              )
          );
        }
      );

    return () => {
      mounted = false;

      unsubscribe();
    };

  }, [router]);

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */

  const logout =
    async () => {
      try {
        await signOut(
          auth
        );

        router.replace(
          "/student/login"
        );

      } catch (error) {
        console.error(
          "Logout error:",
          error
        );
      }
    };

  /*
   * ==========================================
   * RETRY
   * ==========================================
   */

  const retryLoading =
    async () => {
      const user =
        auth.currentUser;

      if (!user) {
        router.replace(
          "/student/login"
        );

        return;
      }

      setLoading(
        true
      );

      setError("");

      /*
       * Check cache first.
       */

      const cachedStudent =
        loadStudentFromCache(
          user.uid
        );

      if (
        cachedStudent
      ) {
        setStudent(
          cachedStudent
        );

        setLoading(
          false
        );
      }

      /*
       * Verify Firestore.
       */

      const success =
        await loadStudent(
          user.uid,
          user.email
        );

      if (
        !success
      ) {
        /*
         * If cache belongs to the
         * same UID, keep it.
         */

        if (
          cachedStudent
        ) {
          setStudent(
            cachedStudent
          );

          setError("");

          setLoading(
            false
          );

          return;
        }

        await redirectToStudentLogin();

        return;
      }

      setLoading(
        false
      );
    };

  /*
   * ==========================================
   * LOADING SCREEN
   * ==========================================
   */

  if (
    loading &&
    !student
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-xl">

          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <h2 className="text-2xl font-bold text-blue-700">
            Loading Student Dashboard...
          </h2>

          <p className="mt-2 text-gray-500">
            Please wait...
          </p>

        </div>

      </main>
    );
  }

  /*
   * ==========================================
   * STUDENT NOT AVAILABLE
   * ==========================================
   *
   * Normally this should almost never appear
   * now because invalid accounts are redirected.
   */

  if (
    !student
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">

        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
            ⚠️
          </div>

          <h2 className="mt-5 text-2xl font-bold text-red-600">
            Student Details Not Available
          </h2>

          <p className="mt-3 text-gray-600">
            {error ||
              "We could not load your SBC student details."}
          </p>

          <button
            onClick={
              retryLoading
            }
            className="mt-6 w-full rounded-xl bg-blue-600 py-4 font-bold text-white transition hover:bg-blue-700"
          >
            🔄 Try Again
          </button>

          <button
            onClick={
              logout
            }
            className="mt-3 w-full rounded-xl bg-red-600 py-4 font-bold text-white transition hover:bg-red-700"
          >
            Logout
          </button>

        </div>

      </main>
    );
  }

  /*
   * ==========================================
   * QR DATA
   * ==========================================
   */

  const qrValue =
    JSON.stringify({
      studentId:
        student.uid,

      cardNumber:
        student.cardNumber ||
        "",

      type: "student",
    });

  /*
   * ==========================================
   * DASHBOARD
   * ==========================================
   */

  return (
    <main className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <h1 className="text-4xl font-bold text-blue-700">
              Welcome 👋
            </h1>

            <p className="text-gray-600">
              {student.fullName}
            </p>

          </div>

          <button
            onClick={
              logout
            }
            className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
          >
            Logout
          </button>

        </div>

        {/* CARD + QR */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* DIGITAL SBC CARD */}

          <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 p-8 text-white shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              💳 Student Benefit Card
            </h2>

            <div className="space-y-3 text-lg">

              <p>
                <strong>
                  Name :
                </strong>{" "}
                {student.fullName ||
                  "-"}
              </p>

              <p>
                <strong>
                  Card Number :
                </strong>{" "}
                {student.cardNumber ||
                  "-"}
              </p>

              <p>
                <strong>
                  College :
                </strong>{" "}
                {student.college ||
                  "-"}
              </p>

              <p>
                <strong>
                  Course :
                </strong>{" "}
                {student.course ||
                  "-"}
              </p>

              <p>
                <strong>
                  Year :
                </strong>{" "}
                {student.year ||
                  "-"}
              </p>

              <p>
                <strong>
                  Mobile :
                </strong>{" "}
                {student.mobile ||
                  "-"}
              </p>

            </div>

          </div>

          {/* QR */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-6 text-2xl font-bold">
              📱 My QR Code
            </h2>

            <div className="flex flex-col items-center">

              <div className="rounded-2xl bg-white p-4 shadow-sm">

                <QRCode
                  value={
                    qrValue
                  }
                  size={220}
                />

              </div>

              <p className="mt-5 text-lg font-bold">
                {student.cardNumber ||
                  "-"}
              </p>

              <p className="mt-2 text-center text-sm text-gray-500">
                Show this QR to Business Partner
              </p>

            </div>

          </div>

        </div>

        {/* QUICK ACTIONS */}

        <div className="mt-10 grid gap-6 md:grid-cols-2">

          {/* OFFERS */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              🎁 Available Offers
            </h2>

            <p className="mb-6 text-gray-600">
              View all active offers from
              SBC Business Partners.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/student/offers"
                )
              }
              className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white transition hover:bg-blue-700"
            >
              🎁 View Offers
            </button>

          </div>

          {/* ACCOUNT STATUS */}

          <div className="rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="mb-5 text-2xl font-bold">
              👤 Account Status
            </h2>

            <div className="rounded-2xl bg-green-100 p-5 text-center">

              <p className="text-sm text-gray-600">
                Current Status
              </p>

              <h3 className="mt-2 text-3xl font-bold text-green-700">
                {student.status
                  ? student.status.toUpperCase()
                  : "PENDING"}
              </h3>

            </div>

          </div>

        </div>

        {/* BOTTOM INFORMATION */}

        <div className="mt-10 rounded-3xl bg-white p-6 shadow-xl">

          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

            <div>

              <h3 className="text-xl font-bold">
                Student Benefit Card
              </h3>

              <p className="text-gray-500">
                Show your QR code at partner
                businesses to redeem offers.
              </p>

            </div>

            <button
              onClick={
                logout
              }
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-700"
            >
              Logout
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}