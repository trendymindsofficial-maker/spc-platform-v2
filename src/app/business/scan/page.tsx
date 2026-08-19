"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";

interface Student {
  id: string;
  uid?: string;
  fullName: string;
  college?: string;
  mobile?: string;
  email?: string;
  cardNumber?: string;
  course?: string;
  year?: string;
  status?: string;
}

interface Offer {
  id: string;
  title: string;
  discount: string;
  businessId: string;
  status?: string;
}

const MAX_REDEMPTIONS = 4;

export default function RedeemStudentOffer() {
  const router = useRouter();

  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const startingScannerRef = useRef(false);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [offers, setOffers] =
    useState<Offer[]>([]);

  const [offer, setOffer] =
    useState<Offer | null>(null);

  const [usedCount, setUsedCount] =
    useState(0);

  const [businessReady, setBusinessReady] =
    useState(false);

  const [scannerLoading, setScannerLoading] =
    useState(false);

  const [scannerError, setScannerError] =
    useState("");

  const [cameraStarted, setCameraStarted] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [cardNumber, setCardNumber] =
    useState("");

  const [searchingCard, setSearchingCard] =
    useState(false);

  /*
   * ==========================================
   * LOAD ACTIVE OFFERS
   * ==========================================
   */

  const loadOffers = async (businessId: string) => {
    try {
      const offerQuery = query(
        collection(db, "offers"),
        where("businessId", "==", businessId),
        where("status", "==", "active")
      );

      const offerSnap =
        await getDocs(offerQuery);

      const activeOffers: Offer[] =
        offerSnap.docs.map((offerDoc) => {
          const data = offerDoc.data();

          return {
            id: offerDoc.id,
            title: data.title || "",
            discount: data.discount || "",
            businessId:
              data.businessId || businessId,
            status: data.status || "active",
          };
        });

      setOffers(activeOffers);

      if (activeOffers.length > 0) {
        setOffer(activeOffers[0]);
      } else {
        setOffer(null);
      }
    } catch (error) {
      console.error(
        "Offer loading error:",
        error
      );

      setOffers([]);
      setOffer(null);
    }
  };

  /*
   * ==========================================
   * GET BUSINESS-WISE REDEMPTION COUNT
   * ==========================================
   *
   * IMPORTANT:
   *
   * studentId + businessId
   *
   * offerId is NOT used for counting.
   *
   * Maximum = 4 per business.
   */

  const getBusinessUsage = async (
    studentId: string,
    businessId: string
  ) => {
    const redemptionQuery = query(
      collection(db, "redemptions"),
      where("studentId", "==", studentId),
      where("businessId", "==", businessId)
    );

    const redemptionSnap =
      await getDocs(redemptionQuery);

    return redemptionSnap.size;
  };

  /*
   * ==========================================
   * VERIFY STUDENT
   * ==========================================
   */

  const verifyStudent = async (
    studentId: string
  ) => {
    try {
      const studentRef = doc(
        db,
        "students",
        studentId
      );

      const studentSnap =
        await getDoc(studentRef);

      if (!studentSnap.exists()) {
        alert("❌ Student Not Found");
        return;
      }

      const data =
        studentSnap.data();

      const studentInfo: Student = {
        id: studentSnap.id,

        uid:
          data.uid ||
          studentSnap.id,

        fullName:
          data.fullName || "",

        college:
          data.college || "",

        mobile:
          data.mobile || "",

        email:
          data.email || "",

        cardNumber:
          data.cardNumber || "",

        course:
          data.course || "",

        year:
          data.year || "",

        status:
          data.status || "",
      };

      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "❌ Business login required"
        );
        return;
      }

      /*
       * ========================================
       * CHECK BUSINESS OFFERS
       * ========================================
       */

      const offerQuery = query(
        collection(db, "offers"),
        where(
          "businessId",
          "==",
          user.uid
        ),
        where(
          "status",
          "==",
          "active"
        )
      );

      const offerSnap =
        await getDocs(offerQuery);

      if (offerSnap.empty) {
        alert(
          "❌ No Active Offer Found"
        );
        return;
      }

      const activeOffers: Offer[] =
        offerSnap.docs.map(
          (offerDoc) => {
            const offerData =
              offerDoc.data();

            return {
              id: offerDoc.id,

              title:
                offerData.title ||
                "",

              discount:
                offerData.discount ||
                "",

              businessId:
                offerData.businessId ||
                user.uid,

              status:
                offerData.status ||
                "active",
            };
          }
        );

      setOffers(
        activeOffers
      );

      /*
       * If no selected offer,
       * automatically select first one.
       */

      setOffer((current) => {
        if (
          current &&
          activeOffers.some(
            (item) =>
              item.id ===
              current.id
          )
        ) {
          return current;
        }

        return activeOffers[0];
      });

      /*
       * ========================================
       * BUSINESS-WISE USAGE CHECK
       * ========================================
       */

      const businessUsage =
        await getBusinessUsage(
          studentSnap.id,
          user.uid
        );

      setUsedCount(
        businessUsage
      );

      console.log(
        "BUSINESS USAGE CHECK:",
        {
          studentId:
            studentSnap.id,

          businessId:
            user.uid,

          usedCount:
            businessUsage,

          maximum:
            MAX_REDEMPTIONS,

          activeOffers:
            activeOffers.length,
        }
      );

      setStudent(
        studentInfo
      );

      await stopScanner();

    } catch (error) {
      console.error(
        "Student verification error:",
        error
      );

      alert(
        "❌ Student verification failed"
      );
    }
  };

  /*
   * ==========================================
   * SEARCH BY SBC CARD NUMBER
   * ==========================================
   */

  const searchByCardNumber =
    async () => {
      const number =
        cardNumber
          .trim()
          .toUpperCase();

      if (!number) {
        alert(
          "Please enter SBC Card Number"
        );
        return;
      }

      try {
        setSearchingCard(
          true
        );

        setStudent(null);

        setUsedCount(0);

        const studentQuery =
          query(
            collection(db, "students"),
            where(
              "cardNumber",
              "==",
              number
            )
          );

        const studentSnap =
          await getDocs(
            studentQuery
          );

        if (
          studentSnap.empty
        ) {
          alert(
            "❌ SBC Card Number Not Found"
          );
          return;
        }

        const studentDoc =
          studentSnap.docs[0];

        await verifyStudent(
          studentDoc.id
        );

      } catch (error) {
        console.error(
          "Card search error:",
          error
        );

        alert(
          "❌ Unable to search card number"
        );
      } finally {
        setSearchingCard(
          false
        );
      }
    };

  /*
   * ==========================================
   * PROCESS QR
   * ==========================================
   */

  const processQRCode =
    async (
      decodedText: string
    ) => {
      if (processing) {
        return;
      }

      try {
        setProcessing(
          true
        );

        let qrData: any;

        try {
          qrData =
            JSON.parse(
              decodedText
            );
        } catch {
          alert(
            "❌ Invalid SBC QR Code"
          );
          return;
        }

        if (
          !qrData ||
          qrData.type !==
            "student" ||
          !qrData.studentId
        ) {
          alert(
            "❌ Invalid SBC Student QR"
          );
          return;
        }

        await verifyStudent(
          qrData.studentId
        );

      } catch (error) {
        console.error(
          "QR processing error:",
          error
        );

        alert(
          "❌ Unable to process QR Code"
        );
      } finally {
        setProcessing(
          false
        );
      }
    };

  /*
   * ==========================================
   * STOP SCANNER
   * ==========================================
   */

  const stopScanner =
    async () => {
      const scanner =
        scannerRef.current;

      if (!scanner) {
        setCameraStarted(
          false
        );
        return;
      }

      try {
        await scanner.stop();
      } catch {}

      try {
        await scanner.clear();
      } catch {}

      scannerRef.current =
        null;

      if (
        mountedRef.current
      ) {
        setCameraStarted(
          false
        );

        setScannerLoading(
          false
        );
      }
    };

  /*
   * ==========================================
   * START CAMERA
   * ==========================================
   */

  const startScanner =
    async () => {
      if (
        startingScannerRef.current
      ) {
        return;
      }

      startingScannerRef.current =
        true;

      try {
        setScannerError(
          ""
        );

        setScannerLoading(
          true
        );

        await stopScanner();

        const module =
          await import(
            "html5-qrcode"
          );

        if (
          !mountedRef.current
        ) {
          return;
        }

        const Html5Qrcode =
          module.Html5Qrcode;

        const reader =
          document.getElementById(
            "reader"
          );

        if (!reader) {
          throw new Error(
            "Scanner area not ready"
          );
        }

        reader.innerHTML =
          "";

        if (
          !navigator.mediaDevices ||
          !navigator
            .mediaDevices
            .getUserMedia
        ) {
          throw new Error(
            "Camera is not supported by this browser."
          );
        }

        let cameras: any[] =
          [];

        try {
          cameras =
            await Html5Qrcode.getCameras();

        } catch (
          cameraError
        ) {
          console.error(
            "Camera detection error:",
            cameraError
          );

          try {
            const stream =
              await navigator
                .mediaDevices
                .getUserMedia({
                  video: true,
                });

            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            cameras =
              await Html5Qrcode.getCameras();

          } catch (
            permissionError
          ) {
            console.error(
              "Camera permission error:",
              permissionError
            );

            throw new Error(
              "Camera permission denied or no camera is available on this device."
            );
          }
        }

        if (
          !cameras.length
        ) {
          throw new Error(
            "No camera found on this device. Please use SBC Card Number search or open this page on a phone/tablet with a camera."
          );
        }

        const rearCamera =
          cameras.find(
            (camera: any) =>
              /back|rear|environment/i.test(
                camera.label ||
                  ""
              )
          );

        const cameraId =
          rearCamera?.id ||
          cameras[0].id;

        const scanner =
          new Html5Qrcode(
            "reader"
          );

        scannerRef.current =
          scanner;

        await scanner.start(
          cameraId,
          {
            fps: 10,

            qrbox: {
              width: 250,
              height: 250,
            },

            aspectRatio: 1,
          },

          async (
            decodedText: string
          ) => {
            await processQRCode(
              decodedText
            );
          },

          () => {}
        );

        if (
          mountedRef.current
        ) {
          setScannerLoading(
            false
          );

          setCameraStarted(
            true
          );

          setScannerError(
            ""
          );
        }

      } catch (error: any) {
        console.error(
          "QR scanner initialization failed:",
          error
        );

        if (
          mountedRef.current
        ) {
          setScannerLoading(
            false
          );

          setCameraStarted(
            false
          );

          setScannerError(
            error?.message ||
              error?.name ||
              "Unable to start camera."
          );
        }

      } finally {
        startingScannerRef.current =
          false;
      }
    };

  /*
   * ==========================================
   * RESET STUDENT
   * ==========================================
   */

  const resetStudent =
    async () => {
      setStudent(null);

      setUsedCount(0);

      setCardNumber("");

      setScannerError("");

      await stopScanner();

      setTimeout(() => {
        if (
          mountedRef.current
        ) {
          startScanner();
        }
      }, 300);
    };

  /*
   * ==========================================
   * AUTH
   * ==========================================
   */

  useEffect(() => {
    mountedRef.current =
      true;

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {
          if (!user) {
            router.replace(
              "/business/login"
            );

            return;
          }

          await loadOffers(
            user.uid
          );

          if (
            mountedRef.current
          ) {
            setBusinessReady(
              true
            );
          }
        }
      );

    return () => {
      mountedRef.current =
        false;

      unsubscribe();

      stopScanner();
    };
  }, [router]);

  /*
   * ==========================================
   * START SCANNER AFTER PAGE READY
   * ==========================================
   */

  useEffect(() => {
    if (
      !businessReady
    ) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          startScanner();
        },
        500
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [businessReady]);

  /*
   * ==========================================
   * REDEEM OFFER
   * ==========================================
   *
   * IMPORTANT:
   *
   * 4 LIMIT IS BUSINESS-WISE.
   *
   * studentId + businessId
   *
   * NOT:
   * studentId + businessId + offerId
   *
   * Therefore:
   *
   * Offer A = 2
   * Offer B = 1
   * Offer C = 1
   * Total = 4/4
   *
   * New offer cannot reset the limit.
   */

  const redeemOffer =
    async () => {
      if (
        !student ||
        !offer
      ) {
        alert(
          "❌ Student or Offer not found"
        );

        return;
      }

      const user =
        auth.currentUser;

      if (!user) {
        alert(
          "❌ Business login required"
        );

        return;
      }

      if (
        usedCount >=
        MAX_REDEMPTIONS
      ) {
        alert(
          `❌ Limit Reached\n\nThis student has already used the SBC benefit ${MAX_REDEMPTIONS}/${MAX_REDEMPTIONS} times at this business.`
        );

        return;
      }

      try {
        setProcessing(
          true
        );

        /*
         * ========================================
         * BUSINESS + STUDENT USAGE DOCUMENT
         * ========================================
         *
         * One fixed document per:
         *
         * business + student
         *
         * This makes the 4-use counter atomic.
         */

        const usageDocId =
          `${user.uid}_${student.id}`;

        const usageRef =
          doc(
            db,
            "businessStudentUsage",
            usageDocId
          );

        /*
         * We need the existing redemption
         * count only when this is the first
         * time the new counter document is
         * created.
         */

        const existingRedemptionQuery =
          query(
            collection(
              db,
              "redemptions"
            ),
            where(
              "studentId",
              "==",
              student.id
            ),
            where(
              "businessId",
              "==",
              user.uid
            )
          );

        const existingRedemptionSnap =
          await getDocs(
            existingRedemptionQuery
          );

        const existingCount =
          existingRedemptionSnap.size;

        /*
         * ========================================
         * ATOMIC TRANSACTION
         * ========================================
         */

        let newCount =
          existingCount + 1;

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const usageSnap =
              await transaction.get(
                usageRef
              );

            let currentCount =
              existingCount;

            if (
              usageSnap.exists()
            ) {
              const usageData =
                usageSnap.data();

              currentCount =
                Number(
                  usageData.count ||
                    0
                );
            }

            /*
             * HARD LIMIT
             */

            if (
              currentCount >=
              MAX_REDEMPTIONS
            ) {
              throw new Error(
                "LIMIT_REACHED"
              );
            }

            newCount =
              currentCount + 1;

            /*
             * UPDATE BUSINESS-STUDENT COUNTER
             */

            transaction.set(
              usageRef,
              {
                studentId:
                  student.id,

                businessId:
                  user.uid,

                count:
                  newCount,

                maxAllowed:
                  MAX_REDEMPTIONS,

                updatedAt:
                  serverTimestamp(),
              },
              {
                merge: true,
              }
            );

            /*
             * CREATE REDEMPTION
             */

            const redemptionRef =
              doc(
                collection(
                  db,
                  "redemptions"
                )
              );

            transaction.set(
              redemptionRef,
              {
                studentId:
                  student.id,

                studentName:
                  student.fullName,

                studentMobile:
                  student.mobile ||
                  "",

                studentCardNumber:
                  student.cardNumber ||
                  "",

                businessId:
                  user.uid,

                offerId:
                  offer.id,

                offerTitle:
                  offer.title,

                discount:
                  offer.discount,

                redeemedAt:
                  serverTimestamp(),

                status:
                  "redeemed",
              }
            );
          }
        );

        /*
         * Update UI
         */

        setUsedCount(
          newCount
        );

        /*
         * SUCCESS MESSAGES
         */

        if (
          newCount === 1
        ) {
          alert(
            "🌟 First Time Use\n\nOffer redeemed successfully!\n\nUsed: 1/4"
          );

        } else if (
          newCount ===
          MAX_REDEMPTIONS
        ) {
          alert(
            "🏆 Final Use (4/4)\n\nOffer redeemed successfully!\n\nThis student has reached the maximum 4 uses at this business."
          );

        } else {
          alert(
            `✅ Offer Redeemed Successfully!\n\nUsed: ${newCount}/4\n\nRemaining: ${
              MAX_REDEMPTIONS -
              newCount
            }`
          );
        }

        /*
         * RESET FOR NEXT STUDENT
         */

        setStudent(null);

        setUsedCount(0);

        setCardNumber("");

        await stopScanner();

        setTimeout(() => {
          if (
            mountedRef.current
          ) {
            startScanner();
          }
        }, 500);

      } catch (error: any) {
        console.error(
          "Redemption error:",
          error
        );

        if (
          error?.message ===
          "LIMIT_REACHED"
        ) {
          setUsedCount(
            MAX_REDEMPTIONS
          );

          alert(
            "❌ Limit Reached\n\nThis student has already used the SBC benefit 4/4 times at this business."
          );

        } else {
          alert(
            "❌ Redemption failed. Please try again."
          );
        }

      } finally {
        if (
          mountedRef.current
        ) {
          setProcessing(
            false
          );
        }
      }
    };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-slate-100 p-6">

        <div className="mx-auto max-w-5xl">

          {/* HEADER */}

          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div>

              <h1 className="text-3xl font-bold text-purple-700 md:text-4xl">
                🎟️ Redeem Student Offer
              </h1>

              <p className="mt-2 text-gray-600">
                Scan QR or enter SBC Card Number
                to verify the student.
              </p>

            </div>

            <button
              onClick={() =>
                router.push(
                  "/business/dashboard"
                )
              }
              className="rounded-xl bg-gray-700 px-6 py-3 font-bold text-white hover:bg-gray-800"
            >
              ← Dashboard
            </button>

          </div>

          {/* ACTIVE OFFERS */}

          {offers.length > 0 && (
            <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl">

              <div className="mb-4">

                <p className="text-sm font-semibold text-gray-500">
                  Active Offers
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Select the offer the student wants
                  to redeem.
                </p>

              </div>

              <div className="grid gap-3 md:grid-cols-2">

                {offers.map(
                  (item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setOffer(item)
                      }
                      className={`rounded-2xl border-2 p-4 text-left transition ${
                        offer?.id ===
                        item.id
                          ? "border-blue-600 bg-blue-50"
                          : "border-gray-200 bg-white hover:border-blue-300"
                      }`}
                    >

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <p className="font-bold text-gray-900">
                            {item.title}
                          </p>

                          <p className="mt-1 text-sm font-semibold text-green-600">
                            {item.discount}
                          </p>

                        </div>

                        {offer?.id ===
                          item.id && (
                          <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                            Selected
                          </span>
                        )}

                      </div>

                    </button>
                  )
                )}

              </div>

            </div>
          )}

          {/* SEARCH OPTIONS */}

          {!student && (
            <div className="grid gap-6 lg:grid-cols-2">

              {/* QR */}

              <div className="rounded-3xl bg-white p-6 shadow-xl">

                <div className="mb-5 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl">
                    📷
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-purple-700">
                    Scan Student QR
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Scan the student's SBC QR code.
                  </p>

                </div>

                {scannerLoading && (
                  <div className="mb-4 rounded-2xl bg-blue-50 p-5 text-center">

                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

                    <p className="font-bold text-blue-700">
                      Starting Camera...
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Please allow camera permission.
                    </p>

                  </div>
                )}

                {scannerError && (
                  <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">

                    <p className="font-bold text-red-700">
                      ❌ Camera Error
                    </p>

                    <p className="mt-3 break-words text-sm text-gray-700">
                      {scannerError}
                    </p>

                    <button
                      onClick={
                        startScanner
                      }
                      disabled={
                        scannerLoading
                      }
                      className="mt-4 rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      🔄 Try Again
                    </button>

                  </div>
                )}

                <div
                  id="reader"
                  className="mx-auto w-full max-w-md overflow-hidden rounded-2xl"
                />

                {!cameraStarted &&
                  !scannerLoading && (
                    <button
                      onClick={
                        startScanner
                      }
                      className="mt-4 w-full rounded-xl bg-purple-600 py-4 font-bold text-white hover:bg-purple-700"
                    >
                      📷 Start Camera
                    </button>
                  )}

                {cameraStarted && (
                  <button
                    onClick={
                      stopScanner
                    }
                    className="mt-4 w-full rounded-xl bg-gray-200 py-3 font-bold text-gray-700 hover:bg-gray-300"
                  >
                    ⏹ Stop Camera
                  </button>
                )}

              </div>

              {/* CARD NUMBER */}

              <div className="rounded-3xl bg-white p-6 shadow-xl">

                <div className="mb-5 text-center">

                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
                    🎫
                  </div>

                  <h2 className="mt-4 text-2xl font-bold text-green-700">
                    Enter SBC Card Number
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Enter the student's SBC card
                    number manually.
                  </p>

                </div>

                <div className="mt-8">

                  <label className="mb-2 block font-semibold text-gray-700">
                    SBC Card Number
                  </label>

                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(
                        e.target.value
                          .toUpperCase()
                          .replace(
                            /\s/g,
                            ""
                          )
                      )
                    }
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        "Enter"
                      ) {
                        searchByCardNumber();
                      }
                    }}
                    placeholder="EXAMPLE: SBC123456"
                    className="w-full rounded-2xl border-2 border-gray-300 p-5 text-center text-2xl font-bold uppercase tracking-wider outline-none transition focus:border-green-600"
                  />

                  <button
                    onClick={
                      searchByCardNumber
                    }
                    disabled={
                      searchingCard
                    }
                    className="mt-5 w-full rounded-2xl bg-green-600 py-5 text-lg font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {searchingCard
                      ? "🔍 Searching..."
                      : "🔍 Search Student"}
                  </button>

                </div>

                <div className="mt-8 rounded-2xl bg-yellow-50 p-5 text-center">

                  <p className="font-semibold text-yellow-800">
                    💡 Tip
                  </p>

                  <p className="mt-1 text-sm text-yellow-700">
                    Student card number is printed
                    on their SBC card.
                  </p>

                </div>

              </div>

            </div>
          )}

          {/* STUDENT VERIFIED */}

          {student && (
            <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                <div>

                  <h2 className="text-3xl font-bold text-green-600">
                    ✅ Student Verified
                  </h2>

                  <p className="mt-1 text-gray-500">
                    Student successfully verified.
                  </p>

                </div>

                <button
                  onClick={
                    resetStudent
                  }
                  disabled={
                    processing
                  }
                  className="rounded-xl bg-gray-700 px-5 py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  🔄 Scan / Search Another
                </button>

              </div>

              {/* DETAILS */}

              <div className="mt-8 grid gap-5 md:grid-cols-2">

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    👤 Student Name
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.fullName ||
                      "-"}
                  </h3>

                </div>

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    🎫 SBC Card Number
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-purple-700">
                    {student.cardNumber ||
                      "-"}
                  </h3>

                </div>

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    🏫 College
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.college ||
                      "-"}
                  </h3>

                </div>

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    📚 Course
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.course ||
                      "-"}
                  </h3>

                </div>

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    📅 Year
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.year ||
                      "-"}
                  </h3>

                </div>

                <div className="rounded-2xl bg-slate-100 p-5">

                  <p className="text-sm text-gray-500">
                    📱 Mobile
                  </p>

                  <h3 className="mt-2 text-xl font-bold">
                    {student.mobile ||
                      "-"}
                  </h3>

                </div>

              </div>

              {/* BUSINESS USAGE */}

              <div className="mt-8 rounded-2xl border border-gray-200 p-6">

                {usedCount ===
                  0 && (
                  <div className="rounded-2xl bg-green-50 p-5">

                    <p className="text-sm font-semibold text-green-600">
                      Business Usage
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-green-700">
                      🌟 First Time Use
                    </h2>

                    <p className="mt-1 text-gray-600">
                      This student has not used any
                      SBC benefit at this business yet.
                    </p>

                  </div>
                )}

                {usedCount > 0 &&
                  usedCount <
                    MAX_REDEMPTIONS && (
                    <div className="rounded-2xl bg-blue-50 p-5">

                      <p className="text-sm font-semibold text-blue-600">
                        Business Usage
                      </p>

                      <h2 className="mt-1 text-2xl font-bold text-blue-700">
                        ✅ Used:{" "}
                        {usedCount}/
                        {MAX_REDEMPTIONS}
                      </h2>

                      <p className="mt-1 text-gray-600">
                        Remaining uses:{" "}
                        {MAX_REDEMPTIONS -
                          usedCount}
                      </p>

                    </div>
                  )}

                {usedCount >=
                  MAX_REDEMPTIONS && (
                  <div className="rounded-2xl bg-red-50 p-5">

                    <p className="text-sm font-semibold text-red-600">
                      Business Usage
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-red-700">
                      ❌ Limit Reached
                    </h2>

                    <p className="mt-1 font-semibold text-red-600">
                      Used{" "}
                      {MAX_REDEMPTIONS}/
                      {MAX_REDEMPTIONS}
                      times.
                      No more redemptions allowed
                      at this business.
                    </p>

                  </div>
                )}

              </div>

              {/* SELECTED OFFER */}

              {offer && (
                <div className="mt-6 rounded-2xl bg-blue-50 p-6">

                  <p className="text-sm font-semibold text-gray-500">
                    Selected Offer
                  </p>

                  <h3 className="mt-2 text-2xl font-bold text-blue-700">
                    {offer.title}
                  </h3>

                  <p className="mt-2 text-2xl font-bold text-green-600">
                    {offer.discount}
                  </p>

                </div>
              )}

              {/* REDEEM */}

              <button
                disabled={
                  usedCount >=
                    MAX_REDEMPTIONS ||
                  processing ||
                  !offer
                }
                onClick={
                  redeemOffer
                }
                className={`mt-8 w-full rounded-2xl py-5 text-xl font-bold text-white transition ${
                  usedCount >=
                  MAX_REDEMPTIONS
                    ? "cursor-not-allowed bg-gray-400"
                    : !offer
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.01] hover:shadow-xl"
                }`}
              >
                {processing
                  ? "⏳ Processing..."
                  : usedCount >=
                    MAX_REDEMPTIONS
                  ? "❌ Limit Reached (4/4)"
                  : !offer
                  ? "❌ Select an Offer"
                  : "🎉 Redeem Selected Offer"}
              </button>

            </div>
          )}

        </div>

      </main>
    </BusinessProtected>
  );
}