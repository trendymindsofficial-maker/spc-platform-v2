"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BusinessProtected from "@/components/BusinessProtected";
import { auth, db } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import QRCode from "qrcode";


export default function BusinessDashboard() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("Business");
  const [businessId, setBusinessId] = useState("");
  const [businessQr, setBusinessQr] = useState("");
  const [totalOffers, setTotalOffers] = useState(0);
  const [totalScans, setTotalScans] = useState(0);
  const [totalRedeemed, setTotalRedeemed] = useState(0);
  const [showBusinessQr, setShowBusinessQr] = useState(false);
  const [loadingBusinessQr, setLoadingBusinessQr] = useState(true);

  const generateBusinessId = () => {
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `SBC-BIZ-${randomNumber}`;
  };

  const setupBusinessQr = async (uid: string, currentBusinessName: string) => {
    try {
      setLoadingBusinessQr(true);

      const businessRef = doc(db, "businesses", uid);
      const businessSnap = await getDoc(businessRef);

      let finalBusinessId = businessSnap.exists()
        ? businessSnap.data().businessId || ""
        : "";

      if (!finalBusinessId) {
        finalBusinessId = generateBusinessId();

        await runTransaction(db, async (transaction) => {
          const latestSnap = await transaction.get(businessRef);

          if (latestSnap.exists() && latestSnap.data().businessId) {
            finalBusinessId = latestSnap.data().businessId;
            return;
          }

          transaction.update(businessRef, {
            businessId: finalBusinessId,
            businessIdCreatedAt: serverTimestamp(),
          });
        });
      }

      setBusinessId(finalBusinessId);

      const qrData = JSON.stringify({
        type: "SBC_BUSINESS",
        businessId: finalBusinessId,
        businessName: currentBusinessName,
      });

      const qrImage = await QRCode.toDataURL(qrData, {
        width: 500,
        margin: 3,
        errorCorrectionLevel: "H",
      });

      setBusinessQr(qrImage);
    } catch (error) {
      console.error("Business QR setup error:", error);
    } finally {
      setLoadingBusinessQr(false);
    }
  };

  const printBusinessQr = () => {
    if (!businessQr || !businessId) return;

    const printWindow = window.open("", "_blank", "width=700,height=800");

    if (!printWindow) {
      alert("Please allow popups to print your Business QR.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SBC Business QR</title>
          <style>
            body { margin:0; padding:40px; font-family:Arial,sans-serif; text-align:center; }
            .card { max-width:500px; margin:auto; border:3px solid #16a34a; border-radius:24px; padding:35px; }
            h1 { color:#15803d; font-size:30px; margin-bottom:8px; }
            h2 { font-size:24px; margin:10px 0; }
            img { width:350px; height:350px; margin:20px auto; }
            .id { background:#fef3c7; padding:15px; border-radius:12px; font-size:24px; font-weight:bold; margin-top:15px; }
            .instruction { font-size:18px; color:#555; line-height:1.5; }
            .footer { margin-top:25px; color:#999; font-size:13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>🎓 SBC</h1>
            <h2>${businessName}</h2>
            <p class="instruction">Scan this QR to redeem SBC Student Benefits</p>
            <img src="${businessQr}" alt="SBC Business QR" />
            <div class="id">Business ID: ${businessId}</div>
            <p class="instruction">
              If QR scanning is unavailable, students can enter this Business ID manually.
            </p>
            <div class="footer">Student Benefit Card • SBC</div>
          </div>
          <script>window.onload=function(){window.print();};</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const downloadBusinessQr = () => {
    if (!businessQr || !businessId) return;

    const link = document.createElement("a");
    link.href = businessQr;
    link.download = `${businessId}-SBC-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const logout = async () => {
    await signOut(auth);
    router.replace("/business/login");
  };

  useEffect(() => {

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        return;
      }

      try {
        const businessSnap = await getDoc(doc(db, "businesses", user.uid));
        let currentBusinessName = "Business";

        if (businessSnap.exists()) {
          currentBusinessName = businessSnap.data().businessName || "Business";
          setBusinessName(currentBusinessName);
        }

        await setupBusinessQr(user.uid, currentBusinessName);

        const offersSnap = await getDocs(
          query(collection(db, "offers"), where("businessId", "==", user.uid))
        );
        setTotalOffers(offersSnap.size);

        const redeemSnap = await getDocs(
          query(collection(db, "redemptions"), where("businessId", "==", user.uid))
        );
        setTotalScans(redeemSnap.size);
        setTotalRedeemed(redeemSnap.size);

      } catch (error) {
        console.error("Business dashboard loading error:", error);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  return (
    <BusinessProtected>
      <main className="min-h-screen bg-[#f5f3ed] px-4 py-6 text-slate-900 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#07111f] sm:text-4xl">
                👋 Welcome {businessName}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-500">Premium Business Dashboard</p>
            </div>

            <button
              onClick={logout}
              className="rounded-full border border-white/15 bg-[#07111f] px-6 py-3 font-bold text-white transition hover:border-[#d4af37]/60 hover:bg-[#122039]"
            >
              Logout
            </button>
          </div>

          <div className="mb-8 rounded-[2rem] border border-[#d4af37]/20 bg-gradient-to-br from-[#07111f] via-[#101b2b] to-[#17243a] p-6 text-white shadow-[0_20px_60px_rgba(7,17,31,0.14)] sm:p-8">
            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="inline-flex rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-4 py-2 text-sm font-bold text-[#f1cf63]">
                  🎓 SBC Business Verification
                </div>

                <h2 className="mt-4 text-3xl font-black text-white">
                  Your Business QR
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Students can scan this QR to verify your business before redeeming an SBC benefit.
                </p>

                <div className="mt-6 rounded-2xl border border-[#d4af37]/25 bg-white/[0.06] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f1cf63]">SBC BUSINESS ID</p>
                  <p className="mt-2 break-all text-2xl font-extrabold tracking-wide text-green-700">
                    {loadingBusinessQr ? "Generating..." : businessId || "Not available"}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowBusinessQr(true)}
                    disabled={!businessQr}
                    className="rounded-xl bg-gradient-to-r from-[#b98a16] via-[#d4af37] to-[#f1cf63] px-6 py-3 font-black text-[#07111f] transition hover:brightness-105 disabled:bg-gray-400"
                  >
                    📷 View QR
                  </button>

                  <button
                    onClick={downloadBusinessQr}
                    disabled={!businessQr}
                    className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    ⬇️ Download QR
                  </button>

                  <button
                    onClick={printBusinessQr}
                    disabled={!businessQr}
                    className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-6 py-3 font-bold text-[#f1cf63] transition hover:bg-[#d4af37]/20 disabled:opacity-50"
                  >
                    🖨️ Print QR
                  </button>
                </div>
              </div>

              <div className="flex justify-center">
                {loadingBusinessQr ? (
                  <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-gray-100">
                    <div className="text-center">
                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
                      <p className="mt-3 text-sm text-gray-500">Creating QR...</p>
                    </div>
                  </div>
                ) : businessQr ? (
                  <div className="rounded-3xl border-4 border-green-100 bg-white p-5 shadow-lg">
                    <img src={businessQr} alt="SBC Business QR" className="h-56 w-56" />
                    <p className="mt-3 text-center text-xs font-bold text-gray-500">
                      Scan to verify business
                    </p>
                  </div>
                ) : (
                  <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-red-50 text-center text-sm font-bold text-red-600">
                    Unable to generate QR
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-[#d4af37]/20 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <p className="text-sm font-bold text-slate-500">🎁 Total Offers</p>
              <h2 className="mt-4 text-4xl font-black text-[#b18a16] sm:text-5xl">{totalOffers}</h2>
            </div>

            <div className="rounded-[1.75rem] border border-[#d4af37]/20 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <p className="text-sm font-bold text-slate-500">📷 Total Scans</p>
              <h2 className="mt-4 text-4xl font-black text-[#07111f] sm:text-5xl">{totalScans}</h2>
            </div>

            <div className="rounded-[1.75rem] border border-[#d4af37]/20 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <p className="text-sm font-bold text-slate-500">🎉 Total Redeemed</p>
              <h2 className="mt-4 text-4xl font-black text-[#b18a16] sm:text-5xl">{totalRedeemed}</h2>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            

            <Link href="/business/my-offers" className="rounded-[1.75rem] border border-[#d4af37]/20 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 transition hover:scale-105">
              <h2 className="text-2xl font-black text-[#07111f]">🎁 My Offers</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">View and manage your offers.</p>
            </Link>

            

            <Link href="/business/history" className="rounded-[1.75rem] border border-[#d4af37]/20 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8 transition hover:scale-105">
              <h2 className="text-2xl font-black text-[#07111f]">📊 Redemption History</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">View all redeemed offer history.</p>
            </Link>
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-[#d4af37]/20 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
            <h2 className="text-3xl font-black text-[#07111f]">
  <span className="text-[#b18a16]">🚀 SBC</span> Business Portal
</h2>
            <p className="mt-4 text-base leading-7 text-white/65">
              Manage your offers, display your Business QR, receive student redemption requests,
              award SBC points and track all redemptions from one secure dashboard.
            </p>
          </div>
        </div>
      </main>

      {showBusinessQr && businessQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-green-700">📷 SBC Business QR</h2>
                <p className="mt-1 text-sm text-gray-500">{businessName}</p>
              </div>

              <button
                onClick={() => setShowBusinessQr(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-bold hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-3xl border-4 border-green-100 bg-white p-6">
              <img src={businessQr} alt="SBC Business QR" className="mx-auto w-full max-w-xs" />
            </div>

            <div className="mt-5 rounded-2xl bg-yellow-50 p-4 text-center">
              <p className="text-xs font-bold text-gray-500">BUSINESS ID</p>
              <p className="mt-1 text-xl font-extrabold text-green-700">{businessId}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button onClick={downloadBusinessQr} className="rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">
                ⬇️ Download
              </button>
              <button onClick={printBusinessQr} className="rounded-xl bg-purple-600 py-3 font-bold text-white hover:bg-purple-700">
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}

    </BusinessProtected>
  );
}
