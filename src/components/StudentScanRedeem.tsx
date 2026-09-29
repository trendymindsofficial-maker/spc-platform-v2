"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Html5Qrcode } from "html5-qrcode";

interface Business {
  businessId: string;
  businessName: string;
  sbcBusinessId: string;
}

interface Offer {
  id: string;
  title?: string;
  discount?: string;
  description?: string;
  category?: string;
  image?: string;
  businessId?: string;
  businessName?: string;
  businessMobile?: string;
  businessAddress?: string;
  googleReviewLink?: string;
}

const MAX_REDEMPTIONS = 4;

interface StudentScanRedeemProps {
  openRequest?: number;
}

export default function StudentScanRedeem({
  openRequest = 0,
}: StudentScanRedeemProps) {
  const router = useRouter();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [usageCount, setUsageCount] = useState(0);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [approvedOffer, setApprovedOffer] = useState<Offer | null>(null);
  const [approvedPoints, setApprovedPoints] = useState(0);
  const [approvedTotalPoints, setApprovedTotalPoints] = useState(0);
  const [rejectedOffer, setRejectedOffer] = useState<Offer | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/student/login");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!pendingRequestId) return;

    const requestRef = doc(db, "redemptionRequests", pendingRequestId);

    return onSnapshot(
      requestRef,
      async (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const status = String(data.status || "pending");

        if (status === "approved") {
          const businessId = String(
            data.businessId || pendingOffer?.businessId || business?.businessId || ""
          ).trim();

          const offer: Offer = {
            ...(pendingOffer || {}),
            id: String(pendingOffer?.id || data.offerId || ""),
            title: String(pendingOffer?.title || data.offerTitle || "SBC Offer"),
            discount: String(pendingOffer?.discount || data.offerDiscount || ""),
            businessId,
            businessName: String(
              data.businessName ||
              pendingOffer?.businessName ||
              business?.businessName ||
              "SBC Partner Business"
            ),
            googleReviewLink: String(pendingOffer?.googleReviewLink || "").trim(),
          };

          // Read the Google Review link from both the offer and the business.
          // Offers created/edited in the business portal store it on the offer.
          try {
            if (offer.id) {
              const offerSnap = await getDoc(doc(db, "offers", offer.id));
              if (offerSnap.exists()) {
                const offerData = offerSnap.data();
                offer.googleReviewLink = String(
                  offerData.googleReviewLink ||
                  offerData.googleReviewUrl ||
                  offerData.googleReview ||
                  offer.googleReviewLink ||
                  ""
                ).trim();
              }
            }

            if (!offer.googleReviewLink && businessId) {
              const businessSnap = await getDoc(doc(db, "businesses", businessId));
              if (businessSnap.exists()) {
                const businessData = businessSnap.data();
                offer.googleReviewLink = String(
                  businessData.googleReviewLink ||
                  businessData.googleReviewUrl ||
                  businessData.googleReview ||
                  ""
                ).trim();
              }
            }
          } catch (error) {
            console.error("Google review link load error:", error);
          }

          // Business approval writes the exact earned and cumulative points
          // onto redemptionRequests and studentPoints.
          let earnedPoints = Number(
            data.pointsAwarded ||
            data.lastPointsEarned ||
            0
          );

          let totalPoints = Number(
            data.studentPointsAfterRedemption ||
            data.totalPoints ||
            0
          );

          try {
            const currentUser = auth.currentUser;
            if (currentUser) {
              const pointsSnap = await getDoc(
                doc(db, "studentPoints", currentUser.uid)
              );

              if (pointsSnap.exists()) {
                const pointsData = pointsSnap.data();
                earnedPoints = Math.max(
                  earnedPoints,
                  Number(
                    pointsData.lastPointsEarned ||
                    pointsData.pointsAwarded ||
                    0
                  )
                );
                totalPoints = Math.max(
                  totalPoints,
                  Number(pointsData.totalPoints || 0)
                );
              }
            }
          } catch (error) {
            console.error("Student points load error:", error);
          }

          setApprovedOffer(offer);
          setApprovedPoints(earnedPoints);
          setApprovedTotalPoints(totalPoints);
          setPendingOffer(null);
          setPendingRequestId(null);
          setUsageCount((current) => Math.min(current + 1, MAX_REDEMPTIONS));
          return;
        }

        if (status === "rejected") {
          const offer: Offer = pendingOffer || {
            id: String(data.offerId || ""),
            title: String(data.offerTitle || "SBC Offer"),
            discount: String(data.offerDiscount || ""),
            businessId: String(data.businessId || ""),
            businessName: String(data.businessName || "SBC Partner Business"),
          };

          setRejectedOffer(offer);
          setPendingOffer(null);
          setPendingRequestId(null);
        }
      },
      (error) => {
        console.error("Scan redemption listener error:", error);
      }
    );
  }, [pendingRequestId, pendingOffer, business]);

  const extractBusinessId = (decodedText: string) => {
    const value = String(decodedText || "").trim();
    console.log("📷 SBC QR decoded text:", value);

    // Current SBC Business QR format.
    try {
      const parsed = JSON.parse(value);
      const type = String(parsed?.type || "").trim().toUpperCase();
      const businessId = String(parsed?.businessId || "").trim();

      if (type === "SBC_BUSINESS" && businessId) {
        return businessId.toUpperCase();
      }
    } catch {
      // Not JSON; continue with legacy/raw formats.
    }

    // Raw Business ID printed below older SBC QRs.
    const rawMatch = value.match(/SBC-BIZ-\d+/i);
    if (rawMatch?.[0]) return rawMatch[0].toUpperCase();

    // Also accept a URL containing ?businessId=SBC-BIZ-xxxxx.
    try {
      const url = new URL(value);
      const fromUrl = url.searchParams.get("businessId");
      if (fromUrl?.toUpperCase().startsWith("SBC-BIZ-")) {
        return fromUrl.trim().toUpperCase();
      }
    } catch {}

    return "";
  };

  const loadBusiness = async (publicBusinessId: string) => {
    setLoading(true);
    setScannerError("");

    try {
      const businessQuery = query(
        collection(db, "businesses"),
        where("businessId", "==", publicBusinessId.trim().toUpperCase())
      );
      const businessSnap = await getDocs(businessQuery);

      if (businessSnap.empty) {
        setBusiness(null);
        setOffers([]);
        setScannerError("❌ Invalid SBC Business QR.");
        return;
      }

      const businessDoc = businessSnap.docs[0];
      const data = businessDoc.data();
      const businessAuthUid = businessDoc.id;

      // Show the verified business immediately after the QR is accepted.
      // This also makes Firestore offer/index errors visible instead of
      // leaving the student on the dashboard with no feedback.
      setBusiness({
        businessId: businessAuthUid,
        sbcBusinessId: String(data.businessId || publicBusinessId).trim(),
        businessName: data.businessName || "SBC Partner Business",
      });

      let offerSnap;
      try {
        // Query by businessId only so this works without requiring a
        // Firestore composite index for (businessId + status).
        const offerQuery = query(
          collection(db, "offers"),
          where("businessId", "==", businessAuthUid)
        );
        const allOfferSnap = await getDocs(offerQuery);
        offerSnap = {
          docs: allOfferSnap.docs.filter(
            (item) => String(item.data().status || "").toLowerCase() === "active"
          ),
        };
      } catch (offerError) {
        console.error("SBC active offers query failed:", offerError);
        setOffers([]);
        setScannerError(
          "❌ Business found, but offers could not be loaded. Please refresh and try again."
        );
        return;
      }

      const businessOffers = offerSnap.docs.map((item) => {
        const offer = item.data();
        return {
          id: item.id,
          title: offer.title || "",
          discount: offer.discount || "",
          description: offer.description || "",
          category: offer.category || "Other",
          image: offer.image || offer.imageUrl || "",
          businessId: businessAuthUid,
          businessName: offer.businessName || data.businessName || "SBC Partner Business",
          businessMobile: offer.businessMobile || data.mobile || data.businessMobile || "",
          businessAddress: offer.businessAddress || offer.address || data.address || "",
          googleReviewLink: String(
            offer.googleReviewLink ||
            offer.googleReviewUrl ||
            offer.googleReview ||
            data.googleReviewLink ||
            data.googleReviewUrl ||
            data.googleReview ||
            ""
          ).trim(),
        };
      });

      setOffers(businessOffers);

      // Usage is optional for loading the business. If its Firestore rule
      // blocks the read, the business and offers must still open normally.
      if (auth.currentUser) {
        try {
          const usageRef = doc(
            db,
            "businessStudentUsage",
            `${businessAuthUid}_${auth.currentUser.uid}`
          );
          const usageSnap = await getDoc(usageRef);
          setUsageCount(
            usageSnap.exists()
              ? Math.min(Number(usageSnap.data().count || 0), MAX_REDEMPTIONS)
              : 0
          );
        } catch (usageError) {
          console.error("SBC usage read failed (non-blocking):", usageError);
          setUsageCount(0);
        }
      }
    } catch (error) {
      console.error("Scan business loading error:", error);
      setOffers([]);
      const message = error instanceof Error ? error.message : String(error);
      setScannerError(`❌ Unable to load this business. ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setScannerError("");
    setScannerOpen(true);

    window.setTimeout(async () => {
      try {
        const reader = document.getElementById("sbc-dashboard-business-qr-reader");
        if (!reader) {
          setScannerError("❌ Scanner could not be opened. Please tap Scan & Redeem again.");
          return;
        }

        reader.innerHTML = "";
        const scanner = new Html5Qrcode("sbc-dashboard-business-qr-reader");

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
          async (decodedText) => {
            try { await scanner.stop(); } catch {}
            try { scanner.clear(); } catch {}

            setScannerOpen(false);

            const businessId = extractBusinessId(decodedText);
            if (!businessId) {
              setScannerError(
                "❌ This is not a valid SBC Business QR. Please scan the QR displayed in the SBC Business dashboard."
              );
              return;
            }

            console.log("✅ SBC Business ID detected:", businessId);
            await loadBusiness(businessId);
          },
          () => {}
        );
      } catch (error) {
        console.error("Dashboard QR scanner error:", error);
        setScannerError(
          "❌ Camera could not be opened. Please allow camera permission."
        );
      }
    }, 250);
  };

  const shareGoogleReview = (offer: Offer | null) => {
    const reviewLink = String(offer?.googleReviewLink || "").trim();
    if (!reviewLink) return;

    // Google does not provide a callback to return to SBC after a review.
    // Open the review in a new tab and immediately return the SBC tab to
    // the student dashboard. The student can review or simply close the
    // Google tab; either way the SBC app is already back on the dashboard.
    window.open(reviewLink, "_blank", "noopener,noreferrer");

    setApprovedOffer(null);
    setApprovedPoints(0);
    setApprovedTotalPoints(0);
    setBusiness(null);
    setOffers([]);
    setSelectedOffer(null);
    setPendingOffer(null);
    setPendingRequestId(null);
    setScannerError("");

    router.replace("/student/dashboard");
  };

  const closeApproved = () => {
    setApprovedOffer(null);
    setApprovedPoints(0);
    setApprovedTotalPoints(0);
    setBusiness(null);
    setOffers([]);
    setSelectedOffer(null);
    setPendingOffer(null);
    setPendingRequestId(null);
    setScannerError("");

    // After a successful redemption, return the student to the dashboard.
    router.replace("/student/dashboard");
  };

  const closeScanner = () => setScannerOpen(false);

  // Dashboard passes an incrementing openRequest value when
  // Bottom Nav -> Scan & Redeem is clicked.
  useEffect(() => {
    if (!openRequest) return;

    // Do not block the scanner just because Firebase auth has not
    // finished restoring the session at the exact moment of the click.
    const timer = window.setTimeout(() => {
      startScanner();
    }, 100);

    return () => window.clearTimeout(timer);
  }, [openRequest]);



  useEffect(() => {
    const handleOpenScan = () => {
      startScanner();
    };

    window.addEventListener("sbc-open-scan", handleOpenScan);

    // Fallback for Offers -> Dashboard?open=scan.
    // The dashboard and this hidden component mount together, so the
    // custom event can occasionally fire before this listener is ready.
    const queryTimer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("open") === "scan") {
        startScanner();
      }
    }, 500);

    return () => {
      window.clearTimeout(queryTimer);
      window.removeEventListener("sbc-open-scan", handleOpenScan);
    };
  }, []);

  const redeemOffer = async (offer: Offer) => {
    if (!auth.currentUser || !business) {
      alert("Please login again.");
      return;
    }

    if (usageCount >= MAX_REDEMPTIONS) {
      alert(
        `🚫 Redemption limit reached. You can redeem from "${business.businessName}" only 4 times in total.`
      );
      return;
    }

    try {
      setRedeemLoading(true);

      const studentSnap = await getDoc(
        doc(db, "students", auth.currentUser.uid)
      );
      const studentData = studentSnap.exists() ? studentSnap.data() : {};

      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch("/api/redemption/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          businessId: business.businessId,
          businessName: business.businessName,
          businessVerificationId: business.sbcBusinessId,
          offerId: offer.id,
          offerTitle: offer.title || "SBC Offer",
          offerDiscount: offer.discount || "",
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success || !result?.requestId) {
        throw new Error(
          result?.error || "Unable to send redemption request."
        );
      }

      setPendingRequestId(String(result.requestId));
      setPendingOffer(offer);
      setSelectedOffer(null);
    } catch (error) {
      console.error("Create scan redemption request error:", error);
      alert("❌ Unable to send redemption request. Please try again.");
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <>
    <section className="hidden rounded-[2rem] border border-[#d4af37]/25 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 md:block">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#b18a16]">
            Scan at Business
          </p>
          <h2 className="mt-2 text-3xl font-black text-[#07111f]">
            📷 Scan & Redeem
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Scan the SBC Business QR, view that business&apos;s active offers,
            choose an offer and send the redemption request directly to the business.
          </p>
        </div>

        <button
          type="button"
          onClick={startScanner}
          className="rounded-2xl bg-[#07111f] px-7 py-4 font-black text-[#f1cf63] shadow-lg transition hover:bg-[#101d2e]"
        >
          📷 Scan Business QR
        </button>
      </div>

      {scannerError && (
        <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
          {scannerError}
        </div>
      )}

      {business && (
        <div className="mt-7 rounded-[1.5rem] border border-[#d4af37]/30 bg-[#fffdf5] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a680c]">
                Verified Business
              </p>
              <h3 className="mt-1 text-2xl font-black text-[#07111f]">
                {business.businessName}
              </h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {business.sbcBusinessId}
              </p>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
              {usageCount}/{MAX_REDEMPTIONS} Used
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center">
              Loading offers...
            </div>
          ) : offers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center">
              <p className="font-black text-[#07111f]">No active offers available.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="overflow-hidden rounded-2xl border border-black/5 bg-white"
                >
                  {offer.image ? (
                    <img
                      src={offer.image}
                      alt={offer.title || "SBC Offer"}
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-44 items-center justify-center bg-[#07111f] text-5xl">
                      🎁
                    </div>
                  )}
                  <div className="p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-[#8a680c]">
                      Offer
                    </p>
                    <h4 className="mt-1 text-xl font-black text-[#07111f]">
                      {offer.title || "SBC Offer"}
                    </h4>
                    {offer.discount && (
                      <p className="mt-2 text-2xl font-black text-[#b18a16]">
                        {offer.discount}
                      </p>
                    )}
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {offer.description || "Offer details available."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(offer)}
                      disabled={usageCount >= MAX_REDEMPTIONS}
                      className="mt-4 w-full rounded-xl bg-[#d4af37] py-3.5 text-sm font-black text-[#07111f] transition hover:bg-[#f1cf63] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      {usageCount >= MAX_REDEMPTIONS
                        ? "🚫 Limit Reached"
                        : "🎁 Redeem Offer"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>


    {/* FIXED MODALS: outside the desktop-only section so they also work on mobile. */}
      {scannerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#020811]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-[#b18a16]">
                  SBC Business
                </p>
                <h3 className="text-2xl font-black text-[#07111f]">
                  Scan QR Code
                </h3>
              </div>
              <button
                type="button"
                onClick={closeScanner}
                className="rounded-full bg-slate-100 px-4 py-2 font-black"
              >
                ✕
              </button>
            </div>
            <div
              id="sbc-dashboard-business-qr-reader"
              className="mt-5 overflow-hidden rounded-2xl border-2 border-[#d4af37]/40"
            />
            <button
              type="button"
              onClick={closeScanner}
              className="mt-4 w-full rounded-xl bg-[#07111f] py-3.5 font-black text-white"
            >
              Close Scanner
            </button>
          </div>
        </div>
      )}

      {selectedOffer && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#020811]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
            <p className="text-xs font-black uppercase tracking-wider text-[#b18a16]">
              Confirm Redemption
            </p>
            <h3 className="mt-2 text-2xl font-black text-[#07111f]">
              {selectedOffer.title || "SBC Offer"}
            </h3>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              {business?.businessName}
            </p>
            {selectedOffer.discount && (
              <p className="mt-4 text-3xl font-black text-[#b18a16]">
                {selectedOffer.discount}
              </p>
            )}
            <p className="mt-4 rounded-2xl bg-[#fffaf0] p-4 text-sm font-semibold leading-6 text-slate-600">
              Your redemption request will be sent to the business for approval.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 py-3.5 font-black text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => redeemOffer(selectedOffer)}
                disabled={redeemLoading}
                className="rounded-xl bg-[#d4af37] py-3.5 font-black text-[#07111f] disabled:bg-slate-300"
              >
                {redeemLoading ? "Sending..." : "Redeem & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingOffer && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020811]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
              ⏳
            </div>
            <h3 className="mt-6 text-3xl font-black text-[#07111f]">
              Waiting for Approval
            </h3>
            <p className="mt-3 text-lg font-black">{pendingOffer.businessName}</p>
            <p className="mt-2 font-bold text-[#b18a16]">{pendingOffer.title}</p>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Your redemption request has been sent to the business. Please wait for approval.
            </p>
          </div>
        </div>
      )}

      {approvedOffer && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#020811]/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
            <button
              type="button"
              onClick={closeApproved}
              className="absolute right-4 top-4 rounded-full bg-slate-100 px-3 py-2 font-black text-slate-500"
            >
              ✕
            </button>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl">
              ✅
            </div>

            <h3 className="mt-6 text-3xl font-black text-emerald-700">
              Redemption Approved
            </h3>

            <p className="mt-3 text-lg font-black text-[#07111f]">
              {approvedOffer.businessName}
            </p>

            <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                Benefit Redeemed
              </p>
              <p className="mt-2 text-xl font-black text-emerald-700">
                🎁 {approvedOffer.title}
              </p>
              {approvedOffer.discount && (
                <p className="mt-1 text-sm font-black text-[#b18a16]">
                  {approvedOffer.discount}
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-600">
                ⭐ SBC Reward Points
              </p>
              <p className="mt-1 text-4xl font-black text-purple-700">
                +{approvedPoints}
              </p>
              <p className="mt-1 text-xs font-bold text-purple-500">
                Total Points: {approvedTotalPoints}
              </p>
            </div>

            {approvedOffer.googleReviewLink ? (
              <button
                type="button"
                onClick={() => shareGoogleReview(approvedOffer)}
                className="mt-4 w-full rounded-xl bg-[#4285F4] py-3.5 text-sm font-black text-white transition hover:bg-[#3367d6]"
              >
                ⭐ Give a Google Review
              </button>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                Google Review link is not configured for this offer yet.
              </p>
            )}

            <p className="mt-3 text-xs font-semibold text-slate-400">
              Your reward points have been added to your SBC account.
            </p>

            <button
              type="button"
              onClick={closeApproved}
              className="mt-4 w-full rounded-xl bg-[#07111f] py-3.5 font-black text-white"
            >
              ✓ Done
            </button>
          </div>
        </div>
      )}

      {rejectedOffer && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[#020811]/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl">
              ❌
            </div>
            <h3 className="mt-6 text-3xl font-black text-red-700">
              Redemption Rejected
            </h3>
            <p className="mt-3 text-lg font-black">{rejectedOffer.businessName}</p>
            <p className="mt-2 font-bold">{rejectedOffer.title}</p>
            <button
              type="button"
              onClick={() => setRejectedOffer(null)}
              className="mt-6 w-full rounded-xl bg-[#07111f] py-3.5 font-black text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MOBILE: keep scanned business + offers at the exact scan position.
          The dashboard page must never scroll down to the old inline section. */}
      {scannerError && !business && (
        <div className="fixed inset-x-4 bottom-24 z-[90] rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 shadow-xl md:hidden">
          {scannerError}
        </div>
      )}

      {business && (
        <div className="fixed inset-0 z-[65] overflow-y-auto bg-[#f5f3ed] p-4 pb-28 md:hidden">
          <div className="mx-auto mt-3 w-full max-w-lg rounded-[2rem] border border-[#d4af37]/30 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.15)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a680c]">
                  Verified Business
                </p>
                <h3 className="mt-1 text-2xl font-black text-[#07111f]">
                  {business.businessName}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {business.sbcBusinessId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setBusiness(null);
                  setOffers([]);
                  setSelectedOffer(null);
                  setScannerError("");
                }}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-2 font-black text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 rounded-full bg-emerald-50 px-4 py-2 text-center text-xs font-black text-emerald-700">
              {usageCount}/{MAX_REDEMPTIONS} Used
            </div>

            {loading ? (
              <div className="mt-5 rounded-2xl bg-slate-50 p-8 text-center font-bold text-slate-500">
                Loading offers...
              </div>
            ) : offers.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-black/10 bg-slate-50 p-8 text-center">
                <p className="font-black text-[#07111f]">
                  No active offers available.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm"
                  >
                    {offer.image ? (
                      <img
                        src={offer.image}
                        alt={offer.title || "SBC Offer"}
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center bg-[#07111f] text-5xl">
                        🎁
                      </div>
                    )}

                    <div className="p-5">
                      <p className="text-xs font-black uppercase tracking-wider text-[#8a680c]">
                        Offer
                      </p>
                      <h4 className="mt-1 text-xl font-black text-[#07111f]">
                        {offer.title || "SBC Offer"}
                      </h4>

                      {offer.discount && (
                        <p className="mt-2 text-2xl font-black text-[#b18a16]">
                          {offer.discount}
                        </p>
                      )}

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {offer.description || "Offer details available."}
                      </p>

                      <button
                        type="button"
                        onClick={() => setSelectedOffer(offer)}
                        disabled={usageCount >= MAX_REDEMPTIONS}
                        className="mt-4 w-full rounded-xl bg-[#d4af37] py-3.5 text-sm font-black text-[#07111f] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        {usageCount >= MAX_REDEMPTIONS
                          ? "🚫 Limit Reached"
                          : "🎁 Redeem Offer"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

  </>
  );
}
