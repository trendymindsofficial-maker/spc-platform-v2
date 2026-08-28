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
  onSnapshot,
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
  points?: number;
}

export default function StudentDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState("");

  /* Cumulative points from studentPoints/{uid}.totalPoints */
  const [totalPoints, setTotalPoints] = useState(0);

  /*
   * ==========================================
   * SESSION CACHE
   * ==========================================
   */

  const getCacheKey = (uid: string) => {
    return `sbc_student_dashboard_${uid}`;
  };

  /*
   * ==========================================
   * SAVE STUDENT CACHE
   * ==========================================
   */

  const saveStudentToCache = (studentData: Student) => {
    try {
      if (typeof window === "undefined") {
        return;
      }

      sessionStorage.setItem(
        getCacheKey(studentData.uid),
        JSON.stringify(studentData)
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
      if (typeof window === "undefined") {
        return null;
      }

      const cached = sessionStorage.getItem(
        getCacheKey(uid)
      );

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(
        cached
      ) as Student;

      if (!parsed || !parsed.uid) {
        return null;
      }

      /*
       * Cache UID must match
       * current Firebase Auth UID.
       */

      if (parsed.uid !== uid) {
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
        data.fullName || "",

      cardNumber:
        data.cardNumber || "",

      college:
        data.college || "",

      course:
        data.course || "",

      year:
        data.year || "",

      mobile:
        data.mobile || "",

      email:
        data.email ||
        email ||
        "",

      status:
        data.status ||
        "pending",

      points:
        Number(data.points || 0),
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
    setStudent(studentData);
    setError("");

    saveStudentToCache(
      studentData
    );
  };

  /*
   * ==========================================
   * LOAD STUDENT REWARD POINTS
   * ==========================================
   *
   * Business approval stores cumulative points in
   * studentPoints/{studentUid}.totalPoints.
   */

  const loadStudentPoints = async (authUid: string): Promise<string> => {
    try {
      /*
       * IMPORTANT:
       * Business approval saves the cumulative reward balance in:
       *
       * studentPoints/{request.studentId}
       *
       * student-offers uses auth.currentUser.uid as request.studentId,
       * so Auth UID is the PRIMARY points document ID.
       *
       * We also check the actual students document ID as a legacy/fallback
       * so an older student record can never make the dashboard show 0.
       */

      const possibleDocIds = new Set<string>();
      possibleDocIds.add(authUid);

      try {
        const studentUidQuery = query(
          collection(db, "students"),
          where("uid", "==", authUid)
        );

        const studentUidSnap = await getDocs(studentUidQuery);

        if (!studentUidSnap.empty) {
          possibleDocIds.add(studentUidSnap.docs[0].id);
        }
      } catch (studentLookupError) {
        console.error(
          "Student document ID lookup for points failed:",
          studentLookupError
        );
      }

      let bestPoints = 0;
      let bestDocId = authUid;

      for (const pointsDocId of possibleDocIds) {
        try {
          const pointsSnap = await getDoc(
            doc(db, "studentPoints", pointsDocId)
          );

          if (pointsSnap.exists()) {
            const storedPoints = Number(
              pointsSnap.data().totalPoints || 0
            );

            if (storedPoints >= bestPoints) {
              bestPoints = storedPoints;
              bestDocId = pointsDocId;
            }

            console.log(
              "⭐ studentPoints document found:",
              pointsDocId,
              storedPoints
            );
          }
        } catch (singlePointsError) {
          console.error(
            `Unable to read studentPoints/${pointsDocId}:`,
            singlePointsError
          );
        }
      }

      setTotalPoints(bestPoints);

      setStudent((current) => {
        if (!current) return current;

        const updated = { ...current, points: bestPoints };
        saveStudentToCache(updated);
        return updated;
      });

      console.log("⭐ FINAL STUDENT POINTS:", {
        authUid,
        pointsDocument: bestDocId,
        totalPoints: bestPoints,
      });

      return bestDocId;
    } catch (error) {
      console.error("Student points load error:", error);
      return authUid;
    }
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
      const studentRef = doc(
        db,
        "students",
        uid
      );

      const snap = await getDoc(
        studentRef
      );

      console.log(
        "Direct student document:",
        {
          id: snap.id,
          exists: snap.exists(),
          uid,
          email,
        }
      );

      if (snap.exists()) {
        const data = snap.data();

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
      const uidQuery = query(
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

      if (!uidSnap.empty) {
        const studentDoc =
          uidSnap.docs[0];

        const data =
          studentDoc.data();

        /*
         * Use actual student
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
         * Verify Firestore student
         * record belongs to current
         * Auth UID.
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
           * If UID exists in student
           * record, it MUST match
           * current Auth UID.
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
   */

  const redirectToStudentLogin =
    async () => {
      try {
        console.warn(
          "⚠️ Current account is not a student. Redirecting to student login."
        );

        await signOut(auth);
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
   * SBC NOTIFICATION PROMPT
   * ==========================================
   *
   * REQUIRED BEHAVIOUR:
   *
   * FIRST LOGIN:
   * Dashboard → Popup
   *
   * OK:
   * Popup → Browser permission
   *
   * Permission GRANTED:
   * Never show popup again.
   *
   * Permission DENIED:
   * Popup only once during current login.
   * After logout/login → popup can appear again.
   *
   * CANCEL:
   * Popup only once during current login.
   * After logout/login → popup can appear again.
   *
   * Dashboard → Offers → Dashboard:
   * No popup again.
   */

  const enableNotificationsOnFirstLogin =
    async (uid: string) => {
      try {
        if (
          typeof window ===
          "undefined"
        ) {
          return;
        }

        if (
          !("Notification" in window)
        ) {
          console.log(
            "Browser does not support notifications."
          );

          return;
        }

        /*
         * ========================================
         * PERMANENTLY ENABLED
         * ========================================
         *
         * Student already enabled
         * notifications successfully.
         *
         * NEVER show popup again.
         */

        const enabledKey =
          `sbc_notifications_enabled_${uid}`;

        const permanentlyEnabled =
          localStorage.getItem(
            enabledKey
          );

        if (
          permanentlyEnabled ===
          "true"
        ) {
          console.log(
            "🔔 SBC notifications already enabled. No popup."
          );

          return;
        }

        /*
         * ========================================
         * CURRENT LOGIN SESSION
         * ========================================
         *
         * Prevent duplicate popup when:
         *
         * Dashboard
         *     ↓
         * Offers
         *     ↓
         * Dashboard
         */

        const sessionPromptKey =
          `sbc_notification_prompt_shown_${uid}`;

        const alreadyShownThisLogin =
          sessionStorage.getItem(
            sessionPromptKey
          );

        if (
          alreadyShownThisLogin ===
          "true"
        ) {
          console.log(
            "🔔 Notification popup already shown in this login session."
          );

          return;
        }

        /*
         * ========================================
         * BROWSER PERMISSION ALREADY GRANTED
         * ========================================
         */

        if (
          Notification.permission ===
          "granted"
        ) {
          try {
            await enableStudentNotifications();

            localStorage.setItem(
              enabledKey,
              "true"
            );

            console.log(
              "✅ Browser notification permission already granted."
            );
          } catch (error) {
            console.error(
              "Unable to refresh notification token:",
              error
            );
          }

          return;
        }

        /*
         * ========================================
         * SHOW SBC CUSTOM POPUP
         * ========================================
         *
         * Mark immediately.
         *
         * Therefore even if user presses
         * Cancel, popup won't appear again
         * during this login.
         */

        sessionStorage.setItem(
          sessionPromptKey,
          "true"
        );

        const shouldEnable =
          window.confirm(
            "🔔 Stay Updated with SBC\n\n" +
              "Get new offers, important announcements " +
              "and SBC updates directly on your device.\n\n" +
              "Click OK to enable notifications."
          );

        /*
         * ========================================
         * USER CLICKED CANCEL
         * ========================================
         */

        if (!shouldEnable) {
          console.log(
            "ℹ️ Student cancelled notification setup."
          );

          return;
        }

        /*
         * ========================================
         * USER CLICKED OK
         * ========================================
         */

        try {
          await enableStudentNotifications();

          /*
           * ONLY after successful notification
           * setup permanently remember it.
           */

          localStorage.setItem(
            enabledKey,
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

          /*
           * Do NOT save permanent enabled flag.
           *
           * If browser permission was denied
           * or setup failed, user can be asked
           * again after next login.
           */
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
    let unsubscribePoints: (() => void) | null = null;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!mounted) {
            return;
          }

          /*
           * ==================================
           * NOT LOGGED IN
           * ==================================
           */

          if (!user) {
            setStudent(null);
            setLoading(false);

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
             * Show cached student
             * immediately.
             */

            setStudent(
              cachedStudent
            );

            setError("");
            setLoading(false);

            console.log(
              "✅ Showing cached student dashboard."
            );
          } else {
            setLoading(true);
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

          if (!mounted) {
            return;
          }

          /*
           * ==================================
           * STEP 3
           * INVALID ACCOUNT
           * ==================================
           */

          if (!success) {
            console.warn(
              "❌ This authenticated account is not a valid SBC student."
            );

            /*
             * Do NOT keep old cached student
             * when current Auth UID is different.
             */

            setStudent(null);
            setLoading(false);

            await redirectToStudentLogin();

            return;
          }

          /*
           * ==================================
           * LOAD + LISTEN TO TOTAL POINTS
           * ==================================
           */

          const pointsDocId = await loadStudentPoints(user.uid);

          if (!mounted) {
            return;
          }

          if (unsubscribePoints) {
            unsubscribePoints();
            unsubscribePoints = null;
          }

          /*
           * REAL-TIME POINTS LISTENER
           *
           * Business approval updates studentPoints/{authUid}.
           * Listen directly to that document so the student dashboard
           * changes immediately after the business approves redemption.
           */
          unsubscribePoints = onSnapshot(
            doc(db, "studentPoints", user.uid),
            (pointsSnap) => {
              if (!mounted) return;

              const latestTotalPoints = pointsSnap.exists()
                ? Number(pointsSnap.data().totalPoints || 0)
                : 0;

              setTotalPoints(latestTotalPoints);

              setStudent((current) => {
                if (!current) return current;

                const updated = {
                  ...current,
                  points: latestTotalPoints,
                };

                saveStudentToCache(updated);
                return updated;
              });

              console.log(
                "⭐ STUDENT DASHBOARD REAL-TIME TOTAL POINTS:",
                latestTotalPoints
              );
            },
            (pointsError) => {
              console.error(
                "Student points listener error:",
                pointsError
              );
            }
          );

          /*
           * If an older installation stores points under the actual
           * students document ID instead of Auth UID, the initial loader
           * above still displays that value.
           */

          /*
           * ==================================
           * STEP 4
           * SUCCESS
           * ==================================
           */

          setLoading(false);

          /*
           * Notifications must NOT block
           * dashboard loading.
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

      if (unsubscribePoints) {
        unsubscribePoints();
        unsubscribePoints = null;
      }
    };
  }, [router]);

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   *
   * IMPORTANT:
   *
   * Clear ONLY the session popup flag.
   *
   * Permanent "enabled" flag remains.
   *
   * Therefore:
   *
   * User enabled notifications:
   * logout → login → NO popup.
   *
   * User cancelled/denied:
   * logout → login → popup again.
   */

  const logout = async () => {
    try {
      const user =
        auth.currentUser;

      if (user) {
        const sessionPromptKey =
          `sbc_notification_prompt_shown_${user.uid}`;

        sessionStorage.removeItem(
          sessionPromptKey
        );
      }

      await signOut(auth);

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

  const retryLoading = async () => {
    const user =
      auth.currentUser;

    if (!user) {
      router.replace(
        "/student/login"
      );

      return;
    }

    setLoading(true);
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

      setLoading(false);
    }

    /*
     * Verify Firestore.
     */

    const success =
      await loadStudent(
        user.uid,
        user.email
      );

    if (!success) {
      /*
       * If cache belongs to same UID,
       * keep it.
       */

      if (cachedStudent) {
        setStudent(
          cachedStudent
        );

        setError("");
        setLoading(false);

        return;
      }

      await redirectToStudentLogin();

      return;
    }

    await loadStudentPoints(user.uid);

    setLoading(false);
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
   */

  if (!student) {
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
   * PREMIUM SBC DASHBOARD UI
   * ==========================================
   * Visual direction inspired by the supplied
   * SPC reference: deep navy, warm gold,
   * clean cards, premium spacing and subtle
   * glass/gradient treatment.
   */

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-slate-900">

      {/* TOP NAV */}
      <header className="sticky top-0 z-30 border-b border-black/10 bg-[#07111f]/95 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d4af37]/50 bg-[#d4af37]/10 text-lg font-black text-[#f1cf63] shadow-[0_0_30px_rgba(212,175,55,0.12)]">
              SBC
            </div>
            <div>
              <p className="text-[15px] font-black uppercase tracking-[0.25em] text-[#FFD700]">
                Student Benefit Card
              </p>
              <p className="text-sm font-medium text-white/70">
                Premium Student Dashboard
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:border-[#d4af37]/60 hover:bg-[#d4af37]/10 hover:text-[#f1cf63]"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-[2rem] bg-[#07111f] p-7 text-white shadow-[0_25px_80px_rgba(7,17,31,0.20)] sm:p-10 lg:p-12">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#d4af37]/10 blur-3xl" />
          <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f1cf63]">
                ✦ Verified SBC Student
              </div>

              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Welcome,
                <span className="block text-[#f1cf63]">
                  {student.fullName || "Student"}
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Your SBC card unlocks exclusive student benefits, partner offers and reward points.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                  Card {student.cardNumber || "—"}
                </span>
                <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  ● {student.status ? student.status.toUpperCase() : "PENDING"}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
                Current Reward Balance
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-5xl font-black tracking-tight text-[#f1cf63]">
                  {totalPoints.toLocaleString()}
                </span>
                <span className="pb-2 text-sm font-bold text-white/55">
                  POINTS
                </span>
              </div>
              <p className="mt-3 text-sm text-white/55">
                Earn more points every time you redeem at an SBC partner.
              </p>
            </div>
          </div>
        </section>

        {/* DIGITAL CARD + QR */}
        <section className="mt-7 grid gap-7 lg:grid-cols-[1.15fr_0.85fr]">

          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#111d2d] via-[#07111f] to-[#020811] p-7 text-white shadow-[0_20px_60px_rgba(7,17,31,0.18)] sm:p-9">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#d4af37]/10 blur-2xl" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d4af37]">
                  Digital Membership Card
                </p>
                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Student Benefit Card
                </h2>
              </div>
              <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-3 py-2 text-xs font-black text-[#f1cf63]">
                SBC
              </div>
            </div>

            <div className="relative mt-9 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Card Holder</p>
                <p className="mt-1 text-lg font-bold">{student.fullName || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Card Number</p>
                <p className="mt-1 text-lg font-bold tracking-wider">{student.cardNumber || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">College</p>
                <p className="mt-1 text-sm font-semibold text-white/80">{student.college || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Course / Year</p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  {student.course || "—"} {student.year ? `• ${student.year}` : ""}
                </p>
              </div>
            </div>

            <div className="relative mt-10 flex items-center justify-between border-t border-white/10 pt-5">
              <span className="text-xs text-white/40">Verified Student Membership</span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#f1cf63]">SBC • 2026</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-9">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b18a16]">Scan & Redeem</p>
                <h2 className="mt-1 text-2xl font-black text-[#07111f]">My QR Code</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Active
              </div>
            </div>

            <div className="mt-7 flex justify-center">
              <div className="rounded-[1.5rem] border border-[#d4af37]/30 bg-[#fbfaf6] p-5 shadow-inner">
                <QRCode value={qrValue} size={205} />
              </div>
            </div>

            <p className="mt-5 text-center text-sm font-black tracking-wider text-[#07111f]">
              {student.cardNumber || "—"}
            </p>
            <p className="mt-2 text-center text-xs text-slate-500">
              Show this QR to an SBC Business Partner to redeem an offer.
            </p>
          </div>
        </section>

        {/* REWARD + GIFT */}
        <section className="mt-7 grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-[2rem] bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b18a16]">SBC Rewards</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-[#07111f]">
                  {totalPoints.toLocaleString()}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Total Reward Points</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#07111f] text-3xl shadow-lg">
                ⭐
              </div>
            </div>

            <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#b18a16] to-[#f1cf63] transition-all duration-700"
                style={{ width: `${Math.min((totalPoints / 1000) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              {Math.min(Math.round((totalPoints / 1000) * 100), 100)}% towards the 1,000-point milestone
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#d4af37]/25 bg-gradient-to-br from-[#fffdf5] to-[#f7f1dd] p-7 shadow-[0_20px_60px_rgba(120,90,20,0.10)] sm:p-8">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#d4af37]/15 blur-2xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a37b0d]">🎁 Surprise Gift</p>
                <h2 className="mt-2 text-2xl font-black text-[#07111f]">
                  {totalPoints >= 1000 ? "Surprise Gift Unlocked!" : `${Math.max(1000 - totalPoints, 0)} Points to go`}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  {totalPoints >= 1000
                    ? "Congratulations! You reached 1,000 SBC Reward Points. Your surprise gift is unlocked."
                    : `Keep redeeming SBC partner offers. Just ${Math.max(1000 - totalPoints, 0)} more points and your Surprise Gift unlocks.`}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-[#d4af37]/30 bg-white/70 px-5 py-4 text-center shadow-sm">
                <p className="text-2xl font-black text-[#07111f]">
                  {Math.min(totalPoints, 1000).toLocaleString()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">of 1,000</p>
              </div>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <section className="mt-7 grid gap-7 md:grid-cols-2">
          <div className="group rounded-[2rem] bg-[#07111f] p-7 text-white shadow-[0_20px_60px_rgba(7,17,31,0.14)] transition hover:-translate-y-1 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4af37]/10 text-2xl text-[#f1cf63]">
              🎁
            </div>
            <h2 className="mt-5 text-2xl font-black">Exclusive Offers</h2>
            <p className="mt-2 leading-6 text-white/55">
              Explore active discounts and benefits from verified SBC Business Partners.
            </p>
            <button
              onClick={() => router.push("/student/offers")}
              className="mt-7 w-full rounded-xl bg-[#d4af37] py-3.5 text-sm font-black text-[#07111f] transition hover:bg-[#f1cf63]"
            >
              Explore Offers →
            </button>
          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b18a16]">Account</p>
            <h2 className="mt-2 text-2xl font-black text-[#07111f]">Membership Status</h2>
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div>
                <p className="text-xs font-semibold text-slate-500">Current Status</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {student.status ? student.status.toUpperCase() : "PENDING"}
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 flex flex-col gap-3 border-t border-black/10 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-[#07111f]">Student Benefit Card</p>
            <p className="mt-1">One card. More benefits. More savings.</p>
          </div>
          <button
            onClick={logout}
            className="w-fit rounded-full border border-slate-300 px-5 py-2.5 font-bold text-slate-700 transition hover:border-[#b18a16] hover:text-[#8a680c]"
          >
            Logout
          </button>
        </footer>

      </div>
    </main>
  );
}