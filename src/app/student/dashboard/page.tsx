"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import QRCode from "react-qr-code";
import StudentScanRedeem from "@/components/StudentScanRedeem";

import { auth, db } from "@/lib/firebase";
import { enableStudentNotifications } from "@/lib/firebase-messaging";

import {
  getMessaging,
  onMessage,
} from "firebase/messaging";

import { getApp } from "firebase/app";

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
  referralCode?: string;
  successfulReferrals?: number;
  pendingReferrals?: number;
  referralRewardUnlocked?: boolean;
}

export default function StudentDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState("");

  // Notification setup UI
  const [showNotificationPrompt, setShowNotificationPrompt] =
    useState(false);

  const [notificationEnabling, setNotificationEnabling] =
    useState(false);

  const [notificationError, setNotificationError] =
    useState("");

  const [notificationsReady, setNotificationsReady] =
    useState(false);

  /* Cumulative points */
  const [totalPoints, setTotalPoints] = useState(0);

  const referralCode = student?.referralCode || "";

  // Referral payout wallet
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutRequesting, setPayoutRequesting] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("250");
  const [payoutMethod, setPayoutMethod] = useState<"upi" | "bank">("upi");
  const [upiId, setUpiId] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [payoutWallet, setPayoutWallet] = useState({
    successfulReferrals: 0,
    totalEarned: 0,
    paidAmount: 0,
    pendingPayout: 0,
    available: 0,
  });

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

      const cached =
        sessionStorage.getItem(
          getCacheKey(uid)
        );

      if (!cached) {
        return null;
      }

      const parsed =
        JSON.parse(cached) as Student;

      if (!parsed || !parsed.uid) {
        return null;
      }

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

      referralCode:
        data.referralCode || uid.slice(0, 8).toUpperCase(),

      successfulReferrals:
        Number(data.successfulReferrals || 0),

      pendingReferrals:
        Number(data.pendingReferrals || 0),

      referralRewardUnlocked:
        Boolean(data.referralRewardUnlocked || false),
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
   */

  const loadStudentPoints = async (
    authUid: string
  ): Promise<string> => {
    try {
      /*
       * IMPORTANT:
       * Do not choose the highest duplicate studentPoints
       * document. The points document must belong to the
       * same student document used for the student profile.
       */

      let pointsDocumentId = authUid;

      try {
        const studentUidQuery =
          query(
            collection(
              db,
              "students"
            ),
            where(
              "uid",
              "==",
              authUid
            )
          );

        const studentUidSnap =
          await getDocs(
            studentUidQuery
          );

        /*
         * Prefer the complete student profile document.
         * This prevents an incomplete duplicate record from
         * being used just because it appears first.
         */
        const completeStudentDoc =
          studentUidSnap.docs.find(
            (studentDoc) => {
              const data =
                studentDoc.data();

              return Boolean(
                data.fullName &&
                data.cardNumber
              );
            }
          );

        if (completeStudentDoc) {
          pointsDocumentId =
            completeStudentDoc.id;
        } else if (
          studentUidSnap.docs.length > 0
        ) {
          pointsDocumentId =
            studentUidSnap.docs[0].id;
        }
      } catch (
        studentLookupError
      ) {
        console.error(
          "Student document ID lookup for points failed:",
          studentLookupError
        );
      }

      const pointsSnap =
        await getDoc(
          doc(
            db,
            "studentPoints",
            pointsDocumentId
          )
        );

      const storedPoints =
        pointsSnap.exists()
          ? Number(
              pointsSnap.data()
                .totalPoints || 0
            )
          : 0;

      setTotalPoints(
        storedPoints
      );

      setStudent(
        (current) => {
          if (!current) {
            return current;
          }

          const updated = {
            ...current,
            points: storedPoints,
          };

          saveStudentToCache(
            updated
          );

          return updated;
        }
      );

      console.log(
        "⭐ FINAL STUDENT POINTS:",
        {
          authUid,
          pointsDocument:
            pointsDocumentId,
          totalPoints:
            storedPoints,
        }
      );

      return pointsDocumentId;
    } catch (error) {
      console.error(
        "Student points load error:",
        error
      );

      return authUid;
    }
  };

  /*
   * ==========================================
   * LOAD STUDENT
   * ==========================================
   */

  const loadStudent = async (
    uid: string,
    email?: string | null
  ): Promise<boolean> => {

    /*
     * METHOD 1
     * students/{uid}
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
          id: snap.id,
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

        /*
         * If a duplicate document exists at students/{uid}
         * but does not contain the actual student profile,
         * continue to the UID-field lookup below.
         */
        if (
          data.fullName &&
          data.cardNumber
        ) {
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

        console.warn(
          "⚠️ Direct student document is incomplete. Continuing with UID-field lookup."
        );
      }
    } catch (error) {
      console.error(
        "Direct student document error:",
        error
      );
    }

    /*
     * METHOD 2
     * students where uid == auth.uid
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
          uidSnap.docs.find(
            (doc) => {
              const data =
                doc.data();

              return Boolean(
                data.fullName &&
                data.cardNumber
              );
            }
          ) || uidSnap.docs[0];

        const data =
          studentDoc.data();

        const studentData =
          buildStudentData(
            data,
            studentDoc.id,
            email
          );

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
     * METHOD 3
     * Search by email
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
   * FOREGROUND NOTIFICATION LISTENER
   * ==========================================
   *
   * This handles notifications while the
   * SBC website is OPEN.
   *
   * Screen OFF / background:
   * firebase-messaging-sw.js handles it.
   *
   * Website OPEN:
   * onMessage() receives the message here.
   */

  useEffect(() => {
    if (
      !notificationsReady
    ) {
      return;
    }

    let unsubscribe:
      | (() => void)
      | undefined;

    const startForegroundListener =
      async () => {
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
              "🔔 Browser does not support notifications."
            );

            return;
          }

          if (
            Notification.permission !==
            "granted"
          ) {
            console.log(
              "🔔 Notification permission is not granted."
            );

            return;
          }

          /*
           * Firebase Messaging
           */

          const app =
            getApp();

          const messaging =
            getMessaging(
              app
            );

          /*
           * FOREGROUND FCM
           */

          unsubscribe =
            onMessage(
              messaging,
              async (
                payload
              ) => {
                console.log(
                  "🔔 SBC FOREGROUND FCM MESSAGE RECEIVED:",
                  payload
                );

                const title =
                  payload
                    .notification
                    ?.title ||
                  payload
                    .data
                    ?.title ||
                  "SBC Notification";

                const body =
                  payload
                    .notification
                    ?.body ||
                  payload
                    .data
                    ?.body ||
                  "";

                const url =
                  payload
                    .data
                    ?.url ||
                  "/student/dashboard";

                try {
                  /*
                   * Use the existing
                   * Firebase service worker.
                   */

                  const registration =
                    await navigator
                      .serviceWorker
                      .ready;

                  await registration.showNotification(
                    title,
                    {
                      body,

                      icon:
                        "/icon-192.png",

                      badge:
                        "/icon-192.png",

                      data: {
                        url,
                      },

                      requireInteraction:
                        false,
                    }
                  );

                  console.log(
                    "✅ SBC foreground notification displayed."
                  );
                } catch (
                  notificationError
                ) {
                  console.error(
                    "❌ Foreground notification display failed:",
                    notificationError
                  );

                  /*
                   * Browser fallback
                   */

                  try {
                    new Notification(
                      title,
                      {
                        body,

                        icon:
                          "/icon-192.png",
                      }
                    );

                    console.log(
                      "✅ Browser notification fallback displayed."
                    );
                  } catch (
                    fallbackError
                  ) {
                    console.error(
                      "❌ Notification fallback failed:",
                      fallbackError
                    );
                  }
                }
              }
            );

          console.log(
            "✅ SBC foreground FCM listener started."
          );
        } catch (error) {
          console.error(
            "❌ SBC foreground notification listener setup failed:",
            error
          );
        }
      };

    startForegroundListener();

    return () => {
      if (
        unsubscribe
      ) {
        unsubscribe();
        unsubscribe =
          undefined;
      }

      console.log(
        "🔕 SBC foreground FCM listener removed."
      );
    };
  }, [
    notificationsReady,
  ]);

  /*
   * ==========================================
   * SBC NOTIFICATION PROMPT
   * ==========================================
   */

  const prepareNotificationPrompt =
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
          !("Notification" in window)
        ) {
          console.log(
            "Browser does not support notifications."
          );

          return;
        }

        const enabledKey =
          `sbc_notifications_enabled_${uid}`;

        const permanentlyEnabled =
          localStorage.getItem(
            enabledKey
          );

        /*
         * Already enabled:
         *
         * Start foreground listener too.
         */

        if (
          permanentlyEnabled ===
          "true"
        ) {
          console.log(
            "🔔 SBC notifications already enabled."
          );

          if (
            Notification.permission ===
            "granted"
          ) {
            try {
              await enableStudentNotifications();

              setNotificationsReady(
                true
              );

              console.log(
                "✅ SBC notification token refreshed."
              );
            } catch (
              error
            ) {
              console.error(
                "Unable to refresh notification token:",
                error
              );
            }
          }

          return;
        }

        /*
         * Permission already granted:
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

            setNotificationsReady(
              true
            );

            console.log(
              "✅ Browser notification permission already granted."
            );
          } catch (
            error
          ) {
            console.error(
              "Unable to refresh notification token:",
              error
            );
          }

          return;
        }

        /*
         * Popup once per login session.
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

        sessionStorage.setItem(
          sessionPromptKey,
          "true"
        );

        setNotificationError(
          ""
        );

        setShowNotificationPrompt(
          true
        );
      } catch (error) {
        console.error(
          "Notification setup preparation error:",
          error
        );
      }
    };

  /*
   * ==========================================
   * ENABLE NOTIFICATIONS
   * ==========================================
   */

  const handleEnableNotifications =
    async () => {
      const user =
        auth.currentUser;

      if (!user) {
        setNotificationError(
          "Please login again and try."
        );

        return;
      }

      try {
        setNotificationEnabling(
          true
        );

        setNotificationError(
          ""
        );

        /*
         * Must be directly
         * triggered by button click.
         */

        const token =
          await enableStudentNotifications();

        if (!token) {
          throw new Error(
            "FCM token was not generated."
          );
        }

        localStorage.setItem(
          `sbc_notifications_enabled_${user.uid}`,
          "true"
        );

        /*
         * Start foreground
         * notification listener.
         */

        setNotificationsReady(
          true
        );

        setShowNotificationPrompt(
          false
        );

        console.log(
          "✅ SBC notifications enabled successfully."
        );
      } catch (error) {
        console.error(
          "Notification enable failed:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Unable to enable notifications.";

        setNotificationError(
          message
        );
      } finally {
        setNotificationEnabling(
          false
        );
      }
    };

  /*
   * ==========================================
   * NOTIFICATION CANCEL
   * ==========================================
   */

  const handleNotificationCancel =
    () => {
      setShowNotificationPrompt(
        false
      );
    };

  /*
   * ==========================================
   * AUTH + STUDENT GUARD
   * ==========================================
   */

  useEffect(() => {
    let mounted = true;

    let unsubscribePoints:
      | (() => void)
      | null = null;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          user
        ) => {
          if (!mounted) {
            return;
          }

          /*
           * NOT LOGGED IN
           */

          if (!user) {
            setStudent(
              null
            );

            setNotificationsReady(
              false
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
           * CHECK CACHE
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

            setError(
              ""
            );

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

            setError(
              ""
            );
          }

          /*
           * VERIFY STUDENT
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
           * INVALID ACCOUNT
           */

          if (!success) {
            console.warn(
              "❌ This authenticated account is not a valid SBC student."
            );

            setStudent(
              null
            );

            setNotificationsReady(
              false
            );

            setLoading(
              false
            );

            await redirectToStudentLogin();

            return;
          }

          /*
           * LOAD POINTS
           */

          const pointsDocumentId =
            await loadStudentPoints(
              user.uid
            );

          if (!mounted) {
            return;
          }

          if (
            unsubscribePoints
          ) {
            unsubscribePoints();

            unsubscribePoints =
              null;
          }

          /*
           * REAL-TIME POINTS
           */

          unsubscribePoints =
            onSnapshot(
              doc(
                db,
                "studentPoints",
                pointsDocumentId
              ),
              (
                pointsSnap
              ) => {
                if (
                  !mounted
                ) {
                  return;
                }

                const latestTotalPoints =
                  pointsSnap.exists()
                    ? Number(
                        pointsSnap.data()
                          .totalPoints ||
                          0
                      )
                    : 0;

                setTotalPoints(
                  latestTotalPoints
                );

                setStudent(
                  (
                    current
                  ) => {
                    if (
                      !current
                    ) {
                      return current;
                    }

                    const updated =
                      {
                        ...current,
                        points:
                          latestTotalPoints,
                      };

                    saveStudentToCache(
                      updated
                    );

                    return updated;
                  }
                );

                console.log(
                  "⭐ STUDENT DASHBOARD REAL-TIME TOTAL POINTS:",
                  latestTotalPoints
                );
              },
              (
                pointsError
              ) => {
                console.error(
                  "Student points listener error:",
                  pointsError
                );
              }
            );

          /*
           * DASHBOARD READY
           */

          setLoading(
            false
          );

          /*
           * Notification setup
           */

          prepareNotificationPrompt(
            user.uid
          ).catch(
            (
              notificationSetupError
            ) =>
              console.error(
                "Notification setup error:",
                notificationSetupError
              )
          );
        }
      );

    return () => {
      mounted = false;

      unsubscribe();

      if (
        unsubscribePoints
      ) {
        unsubscribePoints();

        unsubscribePoints =
          null;
      }
    };
  }, [
    router,
  ]);

  useEffect(() => {
    if (!student) return;

    loadPayoutWallet(true).catch((error) => {
      console.error("Initial payout wallet load failed:", error);
    });
  }, [student?.uid]);

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */

  const logout =
    async () => {
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

        setNotificationsReady(
          false
        );

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

      setError(
        ""
      );

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

      const success =
        await loadStudent(
          user.uid,
          user.email
        );

      if (!success) {
        if (
          cachedStudent
        ) {
          setStudent(
            cachedStudent
          );

          setError(
            ""
          );

          setLoading(
            false
          );

          return;
        }

        await redirectToStudentLogin();

        return;
      }

      await loadStudentPoints(
        user.uid
      );

      setLoading(
        false
      );

      /*
       * Re-enable foreground
       * notification listener.
       */

      if (
        Notification.permission ===
        "granted"
      ) {
        setNotificationsReady(
          true
        );
      }
    };

  /*
   * ==========================================
   * REFERRAL PAYOUT WALLET
   * ==========================================
   */

  const getAuthenticatedHeaders = async (): Promise<Record<string, string>> => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("Please login again and try.");
    }

    const token = await user.getIdToken();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const loadPayoutWallet = async (silent = false) => {
    try {
      if (!silent) setPayoutLoading(true);
      setPayoutError("");

      const headers = await getAuthenticatedHeaders();

      // Recover any already-paid referrals that may not have been processed
      // at the time the referred student completed payment.
      await fetch("/api/referral/reconcile", {
        method: "POST",
        headers,
      }).catch(() => null);

      const response = await fetch("/api/payout/history", {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load referral payout wallet.");
      }

      const wallet = data.wallet || {};
      setPayoutWallet({
        successfulReferrals: Number(wallet.successfulReferrals || 0),
        totalEarned: Number(wallet.totalEarned || 0),
        paidAmount: Number(wallet.paidAmount || 0),
        pendingPayout: Number(wallet.pendingPayout || 0),
        available: Number(wallet.available || 0),
      });
      setPayoutHistory(Array.isArray(data.history) ? data.history : []);

      // Keep the referral card in sync with the server-side wallet.
      setStudent((current) => {
        if (!current) return current;
        const updated = {
          ...current,
          successfulReferrals: Number(wallet.successfulReferrals || 0),
          referralRewardUnlocked: Number(wallet.successfulReferrals || 0) >= 10,
        };
        saveStudentToCache(updated);
        return updated;
      });
    } catch (error) {
      console.error("Payout wallet load error:", error);
      if (!silent) {
        setPayoutError(
          error instanceof Error
            ? error.message
            : "Unable to load referral payout wallet."
        );
      }
    } finally {
      if (!silent) setPayoutLoading(false);
    }
  };

  const openPayoutModal = () => {
    setPayoutError("");
    setPayoutSuccess("");
    setPayoutAmount(
      String(
        Math.max(
          250,
          payoutWallet.available >= 250 ? 250 : payoutWallet.available
        )
      )
    );
    setShowPayoutModal(true);
  };

  const submitPayoutRequest = async () => {
    try {
      setPayoutRequesting(true);
      setPayoutError("");
      setPayoutSuccess("");

      const amount = Number(payoutAmount);

      if (!Number.isInteger(amount) || amount < 250) {
        throw new Error("Minimum payout request is ₹250.");
      }

      if (amount > payoutWallet.available) {
        throw new Error(
          `Available payout balance is ₹${payoutWallet.available.toLocaleString()}.`
        );
      }

      if (payoutMethod === "upi" && !upiId.trim()) {
        throw new Error("Please enter your UPI ID.");
      }

      if (
        payoutMethod === "bank" &&
        (!accountHolderName.trim() ||
          !accountNumber.trim() ||
          !ifsc.trim())
      ) {
        throw new Error("Please enter complete bank details.");
      }

      const headers = await getAuthenticatedHeaders();

      const response = await fetch("/api/payout/request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount,
          method: payoutMethod,
          upiId: payoutMethod === "upi" ? upiId.trim() : "",
          accountHolderName:
            payoutMethod === "bank" ? accountHolderName.trim() : "",
          accountNumber:
            payoutMethod === "bank" ? accountNumber.trim() : "",
          ifsc: payoutMethod === "bank" ? ifsc.trim().toUpperCase() : "",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to submit payout request.");
      }

      setPayoutSuccess(
        `Payout request for ₹${amount.toLocaleString()} submitted successfully.`
      );
      setShowPayoutModal(false);
      await loadPayoutWallet(true);
    } catch (error) {
      console.error("Payout request error:", error);
      setPayoutError(
        error instanceof Error
          ? error.message
          : "Unable to submit payout request."
      );
    } finally {
      setPayoutRequesting(false);
    }
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
   */

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-slate-900">

      {showNotificationPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07111f]/70 p-5 backdrop-blur-sm">

          <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_100px_rgba(7,17,31,0.35)]">

            <div className="bg-gradient-to-br from-[#07111f] via-[#111827] to-[#5f4700] px-7 py-8 text-white">

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#d4af37]/50 bg-[#d4af37]/10 text-2xl">
                🔔
              </div>

              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f1cf63]">
                Student Benefit Card
              </p>

              <h2 className="mt-2 text-2xl font-black">
                Stay Updated with SBC
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/70">
                Get new offers, important announcements and SBC updates directly on your device.
              </p>

            </div>

            <div className="p-7">

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fbfaf6] p-4">

                <p className="text-sm font-bold text-[#07111f]">
                  🔔 Enable notifications
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Tap Enable below. Chrome will then ask for notification permission.
                </p>

              </div>

              {notificationError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {notificationError}
                </div>
              )}

              <button
                type="button"
                onClick={
                  handleEnableNotifications
                }
                disabled={
                  notificationEnabling
                }
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#b98a16] via-[#d4af37] to-[#f1cf63] px-5 py-4 text-sm font-black text-[#07111f] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {notificationEnabling
                  ? "Enabling Notifications..."
                  : "🔔 Enable Notifications"}
              </button>

              <button
                type="button"
                onClick={
                  handleNotificationCancel
                }
                disabled={
                  notificationEnabling
                }
                className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Maybe Later
              </button>

            </div>

          </div>

        </div>
      )}

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
            onClick={
              logout
            }
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
                  {student.fullName ||
                    "Student"}
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
                Your SBC card unlocks exclusive student benefits, partner offers and reward points.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">

                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                  Card{" "}
                  {student.cardNumber ||
                    "—"}
                </span>

                <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                  ●{" "}
                  {student.status
                    ? student.status.toUpperCase()
                    : "PENDING"}
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
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Card Holder
                </p>
                <p className="mt-1 text-lg font-bold">
                  {student.fullName ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Card Number
                </p>
                <p className="mt-1 text-lg font-bold tracking-wider">
                  {student.cardNumber ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  College
                </p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  {student.college ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
                  Course / Year
                </p>
                <p className="mt-1 text-sm font-semibold text-white/80">
                  {student.course ||
                    "—"}{" "}
                  {student.year
                    ? `• ${student.year}`
                    : ""}
                </p>
              </div>

            </div>

            <div className="relative mt-10 flex items-center justify-between border-t border-white/10 pt-5">

              <span className="text-xs text-white/40">
                Verified Student Membership
              </span>

              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#f1cf63]">
                SBC • 2026
              </span>

            </div>

          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-9">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b18a16]">
                  Scan & Redeem
                </p>

                <h2 className="mt-1 text-2xl font-black text-[#07111f]">
                  My QR Code
                </h2>

              </div>

              <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Active
              </div>

            </div>

            <div className="mt-7 flex justify-center">

              <div className="rounded-[1.5rem] border border-[#d4af37]/30 bg-[#fbfaf6] p-5 shadow-inner">

                <QRCode
                  value={
                    qrValue
                  }
                  size={
                    205
                  }
                />

              </div>

            </div>

            <p className="mt-5 text-center text-sm font-black tracking-wider text-[#07111f]">
              {student.cardNumber ||
                "—"}
            </p>

            <p className="mt-2 text-center text-xs text-slate-500">
              Show this QR to an SBC Business Partner to redeem an offer.
            </p>

          </div>

        </section>

        {/* SCAN & REDEEM */}
        <div className="mt-7">
          <StudentScanRedeem />
        </div>

        {/* REWARD + GIFT */}

        <section className="mt-7 grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">

          <div className="rounded-[2rem] bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b18a16]">
                  SBC Rewards
                </p>

                <h2 className="mt-2 text-4xl font-black tracking-tight text-[#07111f]">
                  {totalPoints.toLocaleString()}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Total Reward Points
                </p>

              </div>

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#07111f] text-3xl shadow-lg">
                ⭐
              </div>

            </div>

            <div className="mt-7 h-2 overflow-hidden rounded-full bg-slate-100">

              <div
                className="h-full rounded-full bg-gradient-to-r from-[#b18a16] to-[#f1cf63] transition-all duration-700"
                style={{
                  width: `${Math.min(
                    (totalPoints /
                      1000) *
                      100,
                    100
                  )}%`,
                }}
              />

            </div>

            <p className="mt-3 text-xs font-semibold text-slate-400">
              {Math.min(
                Math.round(
                  (totalPoints /
                    1000) *
                    100
                ),
                100
              )}
              % towards the 1,000-point milestone
            </p>

          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[#d4af37]/25 bg-gradient-to-br from-[#fffdf5] to-[#f7f1dd] p-7 shadow-[0_20px_60px_rgba(120,90,20,0.10)] sm:p-8">

            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-[#d4af37]/15 blur-2xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#a37b0d]">
                  🎁 Surprise Gift
                </p>

                <h2 className="mt-2 text-2xl font-black text-[#07111f]">
                  {totalPoints >=
                  1000
                    ? "Surprise Gift Unlocked!"
                    : `${Math.max(
                        1000 -
                          totalPoints,
                        0
                      )} Points to go`}
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  {totalPoints >=
                  1000
                    ? "Congratulations! You reached 1,000 SBC Reward Points. Your surprise gift is unlocked."
                    : `Keep redeeming SBC partner offers. Just ${Math.max(
                        1000 -
                          totalPoints,
                        0
                      )} more points and your Surprise Gift unlocks.`}
                </p>

              </div>

              <div className="shrink-0 rounded-2xl border border-[#d4af37]/30 bg-white/70 px-5 py-4 text-center shadow-sm">

                <p className="text-2xl font-black text-[#07111f]">
                  {Math.min(
                    totalPoints,
                    1000
                  ).toLocaleString()}
                </p>

                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  of 1,000
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* REFER & EARN */}

        <section className="mt-7">
          <div className="relative overflow-hidden rounded-[2rem] border border-[#d4af37]/25 bg-gradient-to-br from-[#07111f] via-[#0d1928] to-[#15120a] p-7 text-white shadow-[0_25px_70px_rgba(7,17,31,0.16)] sm:p-9">
            <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#d4af37]/15 blur-3xl" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f1cf63]">🎁 Refer & Earn</div>
                <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Refer 10 students.<span className="block text-[#f1cf63]">Earn ₹250.</span></h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/60 sm:text-base">Only students who successfully complete their SBC payment will count as successful referrals.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={() => { const u = `${window.location.origin}/student/register?ref=${encodeURIComponent(referralCode)}`; const m = `🎓 Join SBC - Student Benefit Card\n\nRegister using my referral link:\n${u}`; window.open(`https://wa.me/?text=${encodeURIComponent(m)}`, '_blank', 'noopener,noreferrer'); }} className="rounded-xl bg-[#d4af37] px-5 py-3.5 text-sm font-black text-[#07111f] transition hover:bg-[#f1cf63]">Share on WhatsApp</button>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/student/register?ref=${encodeURIComponent(referralCode)}`); alert('Referral link copied!'); } catch {} }} className="rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition hover:border-[#d4af37]/50 hover:bg-[#d4af37]/10">Copy Referral Link</button>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Your Referral Code</p>
                  <p className="mt-1 text-lg font-black tracking-wider text-[#f1cf63]">{referralCode}</p>
                </div>
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Successful Referrals</p>
                <div className="mt-2 flex items-end justify-between gap-4"><p className="text-5xl font-black text-[#f1cf63]">{Math.min(student.successfulReferrals || 0, 10)}<span className="text-2xl text-white/35">/10</span></p><div className="rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-3 text-center"><p className="text-xl font-black text-white">₹250</p><p className="text-[10px] font-bold uppercase tracking-wider text-[#f1cf63]">Reward</p></div></div>
                <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#b18a16] via-[#d4af37] to-[#f1cf63]" style={{width: `${Math.min(((student.successfulReferrals || 0) / 10) * 100, 100)}%`}} /></div>
                <div className="mt-4 flex justify-between text-xs"><span className="font-semibold text-white/45">{(student.successfulReferrals || 0) >= 10 ? 'Reward unlocked' : `${10 - Math.min(student.successfulReferrals || 0, 10)} more successful referrals`}</span><span className="font-bold text-white/60">{student.pendingReferrals || 0} pending</span></div>
                <div className="mt-5 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/10 p-4"><p className="text-sm font-bold text-[#f1cf63]">{(student.successfulReferrals || 0) >= 10 ? '🎉 ₹250 reward unlocked!' : 'Invite friends and grow SBC together.'}</p><p className="mt-1 text-xs leading-5 text-white/50">A referral becomes successful only after the referred student completes the required SBC payment.</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* REFERRAL PAYOUT WALLET */}

        <section className="mt-7">
          <div className="rounded-[2rem] border border-[#d4af37]/20 bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b18a16]">
                  💰 Referral Wallet
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#07111f]">
                  Earned from successful referrals
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Every 10 students who join through your referral and complete
                  the ₹199 SBC membership payment earns you ₹250.
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadPayoutWallet()}
                disabled={payoutLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#d4af37] hover:bg-[#fbfaf6] disabled:opacity-50"
              >
                {payoutLoading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-[#07111f] p-5 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                  Successful
                </p>
                <p className="mt-2 text-3xl font-black text-[#f1cf63]">
                  {payoutWallet.successfulReferrals}
                </p>
                <p className="mt-1 text-xs text-white/45">Paid referrals</p>
              </div>

              <div className="rounded-2xl border border-[#d4af37]/20 bg-[#fffdf5] p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Total Earned
                </p>
                <p className="mt-2 text-3xl font-black text-[#07111f]">
                  ₹{payoutWallet.totalEarned.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-400">Unlocked rewards</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Pending
                </p>
                <p className="mt-2 text-3xl font-black text-amber-600">
                  ₹{payoutWallet.pendingPayout.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-slate-400">Under processing</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">
                  Available
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-700">
                  ₹{payoutWallet.available.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  Ready to request
                </p>
              </div>
            </div>

            {payoutError && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {payoutError}
              </div>
            )}

            {payoutSuccess && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                {payoutSuccess}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-400">
                Minimum payout: ₹250. You can request any amount up to your
                available balance.
              </p>

              <button
                type="button"
                onClick={openPayoutModal}
                disabled={payoutWallet.available < 250}
                className="rounded-xl bg-gradient-to-r from-[#b98a16] via-[#d4af37] to-[#f1cf63] px-6 py-3.5 text-sm font-black text-[#07111f] shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {payoutWallet.available >= 250
                  ? "Request Payout →"
                  : "₹250 Needed to Withdraw"}
              </button>
            </div>

            {payoutHistory.length > 0 && (
              <div className="mt-7 border-t border-slate-100 pt-6">
                <p className="text-sm font-black text-[#07111f]">
                  Payout History
                </p>

                <div className="mt-3 space-y-3">
                  {payoutHistory.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black text-[#07111f]">
                          ₹{Number(item.amount || 0).toLocaleString()}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {String(item.method || "").toUpperCase()} •{" "}
                          {item.utr || "Awaiting processing"}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${
                          item.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {String(item.status || "pending").toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PAYOUT REQUEST MODAL */}

        {showPayoutModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#07111f]/75 p-5 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white shadow-[0_30px_100px_rgba(7,17,31,0.35)]">
              <div className="bg-[#07111f] px-7 py-6 text-white">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f1cf63]">
                  Referral Payout
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Request your payout
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Available balance: ₹{payoutWallet.available.toLocaleString()}
                </p>
              </div>

              <div className="space-y-5 p-7">
                {payoutError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    {payoutError}
                  </div>
                )}

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Payout Amount
                  </label>
                  <input
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value.replace(/[^\d]/g, ""))}
                    inputMode="numeric"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-[#d4af37]"
                    placeholder="250"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Payment Method
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("upi")}
                      className={`rounded-xl border px-4 py-3 text-sm font-black ${
                        payoutMethod === "upi"
                          ? "border-[#d4af37] bg-[#fffdf5] text-[#8a680c]"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      UPI
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod("bank")}
                      className={`rounded-xl border px-4 py-3 text-sm font-black ${
                        payoutMethod === "bank"
                          ? "border-[#d4af37] bg-[#fffdf5] text-[#8a680c]"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      Bank Account
                    </button>
                  </div>
                </div>

                {payoutMethod === "upi" ? (
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                      UPI ID
                    </label>
                    <input
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-[#d4af37]"
                      placeholder="example@upi"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Account Holder Name
                      </label>
                      <input
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-[#d4af37]"
                        placeholder="Name as per bank account"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Account Number
                      </label>
                      <input
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\s/g, ""))}
                        inputMode="numeric"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-[#d4af37]"
                        placeholder="Bank account number"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                        IFSC
                      </label>
                      <input
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3.5 font-bold uppercase outline-none focus:border-[#d4af37]"
                        placeholder="SBIN0001234"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                  Your payout will be reviewed by SBC admin. Never share your
                  OTP, password or Razorpay secret with anyone.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    disabled={payoutRequesting}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3.5 text-sm font-bold text-slate-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={submitPayoutRequest}
                    disabled={payoutRequesting}
                    className="flex-1 rounded-xl bg-[#07111f] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#101d2e] disabled:opacity-50"
                  >
                    {payoutRequesting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIONS */}

        <section className="mt-7 grid gap-7 md:grid-cols-2">

          <div className="group rounded-[2rem] bg-[#07111f] p-7 text-white shadow-[0_20px_60px_rgba(7,17,31,0.14)] transition hover:-translate-y-1 sm:p-8">

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d4af37]/10 text-2xl text-[#f1cf63]">
              🎁
            </div>

            <h2 className="mt-5 text-2xl font-black">
              Exclusive Offers
            </h2>

            <p className="mt-2 leading-6 text-white/55">
              Explore active discounts and benefits from verified SBC Business Partners.
            </p>

            <button
              onClick={() =>
                router.push(
                  "/student/offers"
                )
              }
              className="mt-7 w-full rounded-xl bg-[#d4af37] py-3.5 text-sm font-black text-[#07111f] transition hover:bg-[#f1cf63]"
            >
              Explore Offers →
            </button>

          </div>

          <div className="rounded-[2rem] bg-white p-7 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b18a16]">
              Account
            </p>

            <h2 className="mt-2 text-2xl font-black text-[#07111f]">
              Membership Status
            </h2>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 p-5">

              <div>

                <p className="text-xs font-semibold text-slate-500">
                  Current Status
                </p>

                <p className="mt-1 text-2xl font-black text-emerald-700">
                  {student.status
                    ? student.status.toUpperCase()
                    : "PENDING"}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                ✓
              </div>

            </div>

          </div>

        </section>

        {/* FOOTER */}

        <footer className="mt-10 flex flex-col gap-3 border-t border-black/10 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <p className="font-black text-[#07111f]">
              Student Benefit Card
            </p>

            <p className="mt-1">
              One card. More benefits. More savings.
            </p>

          </div>

          <button
            onClick={
              logout
            }
            className="w-fit rounded-full border border-slate-300 px-5 py-2.5 font-bold text-slate-700 transition hover:border-[#b18a16] hover:text-[#8a680c]"
          >
            Logout
          </button>

        </footer>

      </div>

    </main>
  );
}