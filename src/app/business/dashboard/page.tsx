

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import BusinessProtected from "@/components/BusinessProtected";

import { auth, db } from "@/lib/firebase";

import {
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

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
  increment,
} from "firebase/firestore";

import QRCode from "qrcode";

interface PendingRedemption {
  id: string;

  studentId?: string;

  studentName?: string;

  studentCardNumber?: string;

  studentMobile?: string;

  offerId?: string;

  offerTitle?: string;

  discount?: string;

  businessId?: string;

  businessName?: string;

  status?: string;

  createdAt?: any;
}

const MAX_REDEMPTIONS = 4;

/*
 * SBC REDEMPTION POINTS
 *
 * 1st redemption = 20 points
 * 2nd redemption = 10 points
 * 3rd redemption = 5 points
 * 4th redemption = 5 points
 *
 * Maximum points from one business = 40.
 */
const REDEMPTION_POINTS = [20, 10, 5, 5];

export default function BusinessDashboard() {
  const router = useRouter();

  const [businessName, setBusinessName] =
    useState("Business");

  const [businessId, setBusinessId] =
    useState("");

  const [businessQr, setBusinessQr] =
    useState("");

  const [totalOffers, setTotalOffers] =
    useState(0);

  const [totalScans, setTotalScans] =
    useState(0);

  const [totalRedeemed, setTotalRedeemed] =
    useState(0);

  const [pendingRedemptions, setPendingRedemptions] =
    useState<PendingRedemption[]>([]);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [showPendingPopup, setShowPendingPopup] =
    useState(false);

  const [showBusinessQr, setShowBusinessQr] =
    useState(false);

  const [loadingBusinessQr, setLoadingBusinessQr] =
    useState(true);

  /*
   * ==========================================
   * GENERATE BUSINESS ID
   * ==========================================
   */

  const generateBusinessId = () => {
    const randomNumber =
      Math.floor(
        10000 +
          Math.random() *
            90000
      );

    return `SBC-BIZ-${randomNumber}`;
  };

  /*
   * ==========================================
   * CREATE / LOAD BUSINESS ID + QR
   * ==========================================
   */

  const setupBusinessQr = async (
    uid: string,
    currentBusinessName: string
  ) => {
    try {
      setLoadingBusinessQr(true);

      const businessRef =
        doc(
          db,
          "businesses",
          uid
        );

      const businessSnap =
        await getDoc(
          businessRef
        );

      let finalBusinessId = "";

      if (
        businessSnap.exists()
      ) {
        const data =
          businessSnap.data();

        finalBusinessId =
          data.businessId ||
          "";
      }

      /*
       * Existing business without Business ID
       */

      if (
        !finalBusinessId
      ) {
        finalBusinessId =
          generateBusinessId();

        /*
         * Re-read inside transaction
         * so two tabs don't create
         * different Business IDs.
         */

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const latestSnap =
              await transaction.get(
                businessRef
              );

            if (
              latestSnap.exists()
            ) {
              const latestData =
                latestSnap.data();

              if (
                latestData.businessId
              ) {
                finalBusinessId =
                  latestData.businessId;

                return;
              }
            }

            transaction.update(
              businessRef,
              {
                businessId:
                  finalBusinessId,

                businessIdCreatedAt:
                  serverTimestamp(),
              }
            );
          }
        );
      }

      setBusinessId(
        finalBusinessId
      );

      /*
       * BUSINESS QR DATA
       */

      const qrData =
        JSON.stringify({
          type:
            "SBC_BUSINESS",

          businessId:
            finalBusinessId,

          businessName:
            currentBusinessName,
        });

      const qrImage =
        await QRCode.toDataURL(
          qrData,
          {
            width: 500,

            margin: 3,

            errorCorrectionLevel:
              "H",
          }
        );

      setBusinessQr(
        qrImage
      );

    } catch (error) {
      console.error(
        "Business QR setup error:",
        error
      );
    } finally {
      setLoadingBusinessQr(
        false
      );
    }
  };

  /*
   * ==========================================
   * PRINT BUSINESS QR
   * ==========================================
   */

  const printBusinessQr = () => {
    if (
      !businessQr ||
      !businessId
    ) {
      return;
    }

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=700,height=800"
      );

    if (!printWindow) {
      alert(
        "Please allow popups to print your Business QR."
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            SBC Business QR
          </title>

          <style>

            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              text-align: center;
            }

            .card {
              max-width: 500px;
              margin: auto;
              border: 3px solid #16a34a;
              border-radius: 24px;
              padding: 35px;
            }

            h1 {
              color: #15803d;
              font-size: 30px;
              margin-bottom: 8px;
            }

            h2 {
              font-size: 24px;
              margin: 10px 0;
            }

            img {
              width: 350px;
              height: 350px;
              margin: 20px auto;
            }

            .id {
              background: #fef3c7;
              padding: 15px;
              border-radius: 12px;
              font-size: 24px;
              font-weight: bold;
              margin-top: 15px;
            }

            .instruction {
              font-size: 18px;
              color: #555;
              line-height: 1.5;
            }

            .footer {
              margin-top: 25px;
              color: #999;
              font-size: 13px;
            }

          </style>

        </head>

        <body>

          <div class="card">

            <h1>
              🎓 SBC
            </h1>

            <h2>
              ${businessName}
            </h2>

            <p class="instruction">
              Scan this QR to redeem
              SBC Student Benefits
            </p>

            <img
              src="${businessQr}"
              alt="SBC Business QR"
            />

            <div class="id">
              Business ID:
              ${businessId}
            </div>

            <p class="instruction">
              If QR scanning is unavailable,
              students can enter this
              Business ID manually.
            </p>

            <div class="footer">
              Student Benefit Card • SBC
            </div>

          </div>

          <script>

            window.onload = function() {
              window.print();
            };

          </script>

        </body>

      </html>
    `);

    printWindow.document.close();
  };

  /*
   * ==========================================
   * DOWNLOAD BUSINESS QR
   * ==========================================
   */

  const downloadBusinessQr = () => {
    if (
      !businessQr ||
      !businessId
    ) {
      return;
    }

    const link =
      document.createElement(
        "a"
      );

    link.href =
      businessQr;

    link.download =
      `${businessId}-SBC-QR.png`;

    document.body.appendChild(
      link
    );

    link.click();

    document.body.removeChild(
      link
    );
  };

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */

  const logout = async () => {
    await signOut(
      auth
    );

    router.replace(
      "/business/login"
    );
  };

  /*
   * ==========================================
   * AUTH + LOAD DASHBOARD
   * ==========================================
   */

  useEffect(() => {
    let unsubscribeRedemptions:
      | (() => void)
      | null = null;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        async (user) => {
          /*
           * NOT LOGGED IN
           */

          if (!user) {
            if (
              unsubscribeRedemptions
            ) {
              unsubscribeRedemptions();

              unsubscribeRedemptions =
                null;
            }

            return;
          }

          try {
            /*
             * ========================================
             * BUSINESS
             * ========================================
             */

            const businessSnap =
              await getDoc(
                doc(
                  db,
                  "businesses",
                  user.uid
                )
              );

            let currentBusinessName =
              "Business";

            if (
              businessSnap.exists()
            ) {
              const businessData =
                businessSnap.data();

              currentBusinessName =
                businessData.businessName ||
                "Business";

              setBusinessName(
                currentBusinessName
              );
            }

            /*
             * ========================================
             * BUSINESS QR
             * ========================================
             */

            await setupBusinessQr(
              user.uid,
              currentBusinessName
            );

            /*
             * ========================================
             * OFFERS
             * ========================================
             */

            const offersSnap =
              await getDocs(
                query(
                  collection(
                    db,
                    "offers"
                  ),

                  where(
                    "businessId",
                    "==",
                    user.uid
                  )
                )
              );

            setTotalOffers(
              offersSnap.size
            );

            /*
             * ========================================
             * EXISTING REDEMPTIONS
             * ========================================
             */

            const redeemSnap =
              await getDocs(
                query(
                  collection(
                    db,
                    "redemptions"
                  ),

                  where(
                    "businessId",
                    "==",
                    user.uid
                  )
                )
              );

            setTotalScans(
              redeemSnap.size
            );

            setTotalRedeemed(
              redeemSnap.size
            );

            /*
             * ========================================
             * REAL-TIME PENDING REQUESTS
             * ========================================
             */

            const pendingQuery =
              query(
                collection(
                  db,
                  "redemptionRequests"
                ),

                where(
                  "businessId",
                  "==",
                  user.uid
                ),

                where(
                  "status",
                  "==",
                  "pending"
                )
              );

            /*
             * Remove old listener if any.
             */

            if (
              unsubscribeRedemptions
            ) {
              unsubscribeRedemptions();

              unsubscribeRedemptions =
                null;
            }

            unsubscribeRedemptions =
              onSnapshot(
                pendingQuery,

                (snapshot) => {
                  const requests:
                    PendingRedemption[] =
                    snapshot.docs.map(
                      (
                        requestDoc
                      ) => {
                        const data =
                          requestDoc.data();

                        return {
                          id:
                            requestDoc.id,

                          studentId:
                            data.studentId,

                          studentName:
                            data.studentName ||
                            "SBC Student",

                          studentCardNumber:
                            data.studentCardNumber ||
                            "",

                          studentMobile:
                            data.studentMobile ||
                            "",

                          offerId:
                            data.offerId,

                          offerTitle:
                            data.offerTitle ||
                            "SBC Offer",

                          discount:
                            data.discount ||
                            "",

                          businessId:
                            data.businessId,

                          businessName:
                            data.businessName ||
                            currentBusinessName,

                          status:
                            data.status ||
                            "pending",

                          createdAt:
                            data.createdAt,
                        };
                      }
                    );

                  setPendingRedemptions(
                    requests
                  );

                  /*
                   * Automatically open popup
                   * whenever pending request exists.
                   */

                  if (
                    requests.length >
                    0
                  ) {
                    setShowPendingPopup(
                      true
                    );
                  } else {
                    setShowPendingPopup(
                      false
                    );
                  }
                },

                (error) => {
                  console.error(
                    "Pending redemption listener error:",
                    error
                  );
                }
              );

          } catch (error) {
            console.error(
              "Business dashboard loading error:",
              error
            );
          }
        }
      );

    return () => {
      unsubscribeAuth();

      if (
        unsubscribeRedemptions
      ) {
        unsubscribeRedemptions();

        unsubscribeRedemptions =
          null;
      }
    };
  }, []);

  /*
   * ==========================================
   * APPROVE REDEMPTION
   * ==========================================
   *
   * THIS IS THE IMPORTANT PART.
   *
   * Student request:
   *
   * redemptionRequests
   * status = pending
   *
   * Business clicks APPROVE.
   *
   * Transaction performs:
   *
   * 1. Verify request
   * 2. Verify business
   * 3. Verify offer
   * 4. Check 4-use limit
   * 5. Calculate redemption points
   * 6. Increase business usage
   * 7. Update student points
   * 8. Create redemptions document
   * 9. Mark request approved
   *
   * Student can then listen to
   * redemptionRequests in real time.
   */

  const approveRedemption =
    async (
      request: PendingRedemption
    ) => {
      /*
       * Prevent double click.
       */

      if (
        processingId
      ) {
        return;
      }

      const businessUser =
        auth.currentUser;

      if (!businessUser) {
        alert(
          "❌ Business login required."
        );

        return;
      }

      /*
       * Validate request data.
       */

      if (
        !request.studentId ||
        !request.offerId
      ) {
        alert(
          "❌ Invalid redemption request. Student or offer information is missing."
        );

        return;
      }

      /*
       * Make sure this request belongs
       * to currently logged-in business.
       */

      if (
        request.businessId &&
        request.businessId !==
          businessUser.uid
      ) {
        alert(
          "❌ This redemption request belongs to another business."
        );

        return;
      }

      try {
        setProcessingId(
          request.id
        );

        /*
         * ========================================
         * REFERENCES
         * ========================================
         */

        const requestRef =
          doc(
            db,
            "redemptionRequests",
            request.id
          );

        const usageDocId =
          `${businessUser.uid}_${request.studentId}`;

        const usageRef =
          doc(
            db,
            "businessStudentUsage",
            usageDocId
          );

        const offerRef =
          doc(
            db,
            "offers",
            request.offerId
          );

        /*
         * Student document.
         * Points are maintained on the student's
         * document and updated only after approval.
         */
        const studentRef =
          doc(
            db,
            "students",
            request.studentId
          );

        /*
         * ========================================
         * STUDENT REWARD POINTS DOCUMENT
         * ========================================
         *
         * The student dashboard listens to:
         *
         * studentPoints/{studentId}.totalPoints
         *
         * Keep this document synchronized with
         * students/{studentId}.points.
         */
        const studentPointsRef =
          doc(
            db,
            "studentPoints",
            request.studentId
          );

        /*
         * Create redemption ID before
         * transaction starts.
         */

        const redemptionRef =
          doc(
            collection(
              db,
              "redemptions"
            )
          );

        /*
         * ========================================
         * LEGACY COUNT
         * ========================================
         *
         * Existing old redemption records
         * are counted outside transaction.
         *
         * The new businessStudentUsage document
         * remains the primary counter.
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
              request.studentId
            ),

            where(
              "businessId",
              "==",
              businessUser.uid
            )
          );

        const existingRedemptionSnap =
          await getDocs(
            existingRedemptionQuery
          );

        const existingRedemptionCount =
          existingRedemptionSnap.size;

        let finalUsageCount =
          0;

        let pointsAwarded =
          0;

        let newStudentPoints =
          0;

        /*
         * ========================================
         * ATOMIC TRANSACTION
         * ========================================
         */

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            /*
             * ======================================
             * ALL READS FIRST
             * ======================================
             */

            const requestSnap =
              await transaction.get(
                requestRef
              );

            const usageSnap =
              await transaction.get(
                usageRef
              );

            const offerSnap =
              await transaction.get(
                offerRef
              );

            /*
             * ======================================
             * REQUEST VALIDATION
             * ======================================
             */

            if (
              !requestSnap.exists()
            ) {
              throw new Error(
                "REQUEST_NOT_FOUND"
              );
            }

            const requestData =
              requestSnap.data();

            /*
             * Business ownership.
             */

            if (
              requestData.businessId !==
              businessUser.uid
            ) {
              throw new Error(
                "INVALID_BUSINESS"
              );
            }

            /*
             * Duplicate approval protection.
             */

            if (
              requestData.status !==
              "pending"
            ) {
              throw new Error(
                "REQUEST_ALREADY_PROCESSED"
              );
            }

            /*
             * ======================================
             * OFFER VALIDATION
             * ======================================
             */

            if (
              !offerSnap.exists()
            ) {
              throw new Error(
                "OFFER_NOT_FOUND"
              );
            }

            const offerData =
              offerSnap.data();

            /*
             * Offer must belong to same business.
             */

            if (
              offerData.businessId !==
              businessUser.uid
            ) {
              throw new Error(
                "INVALID_OFFER_BUSINESS"
              );
            }

            /*
             * Offer must still be active.
             */

            if (
              offerData.status &&
              offerData.status !==
                "active"
            ) {
              throw new Error(
                "OFFER_NOT_ACTIVE"
              );
            }

            /*
             * ======================================
             * BUSINESS-WISE USAGE
             * ======================================
             *
             * Primary:
             *
             * businessStudentUsage
             *
             * Fallback:
             *
             * old redemptions
             *
             * Offer ID is NOT part of the count.
             */

            const storedUsageCount =
              usageSnap.exists()
                ? Number(
                    usageSnap.data()
                      .count || 0
                  )
                : 0;

            const currentUsageCount =
              Math.max(
                storedUsageCount,
                existingRedemptionCount
              );

            /*
             * ======================================
             * HARD 4-USE LIMIT
             * ======================================
             */

            if (
              currentUsageCount >=
              MAX_REDEMPTIONS
            ) {
              throw new Error(
                "LIMIT_REACHED"
              );
            }

            finalUsageCount =
              currentUsageCount + 1;

            /*
             * ======================================
             * CALCULATE REDEMPTION POINTS
             * ======================================
             *
             * 1 -> 20
             * 2 -> 10
             * 3 -> 5
             * 4 -> 5
             */
            pointsAwarded =
              REDEMPTION_POINTS[
                finalUsageCount - 1
              ] || 0;

            /*
             * ======================================
             * CUMULATIVE STUDENT POINTS
             * ======================================
             *
             * Keep the higher value if an older
             * studentPoints document is behind the
             * student's main points field.
             */
            /*
             * Do not read private student points documents
             * from the business transaction.
             * Update points atomically instead.
             */
            newStudentPoints =
              pointsAwarded;

            /*
             * ======================================
             * UPDATE USAGE
             * ======================================
             */

            transaction.set(
              usageRef,

              {
                studentId:
                  request.studentId,

                businessId:
                  businessUser.uid,

                count:
                  finalUsageCount,

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
             * ======================================
             * UPDATE STUDENT POINTS
             * ======================================
             */

            transaction.set(
              studentRef,
              {
                points:
                  increment(pointsAwarded),

                totalPointsEarned:
                  increment(pointsAwarded),

                lastPointsEarned:
                  pointsAwarded,

                lastPointsEarnedAt:
                  serverTimestamp(),

                lastPointsBusinessId:
                  businessUser.uid,

                lastPointsBusinessName:
                  requestData.businessName ||
                  businessName,

                lastPointsRedemptionId:
                  redemptionRef.id,

                updatedAt:
                  serverTimestamp(),
              },
              {
                merge: true,
              }
            );

            /*
             * ======================================
             * UPDATE STUDENT POINTS DOCUMENT
             * ======================================
             *
             * The student dashboard reads:
             *
             * studentPoints/{studentId}.totalPoints
             *
             * Therefore keep this document in sync
             * with students/{studentId}.points.
             */
            transaction.set(
              studentPointsRef,
              {
                studentId:
                  request.studentId,

                totalPoints:
                  increment(pointsAwarded),

                pointsAwarded:
                  pointsAwarded,

                lastPointsEarned:
                  pointsAwarded,

                lastPointsBusinessId:
                  businessUser.uid,

                lastPointsBusinessName:
                  requestData.businessName ||
                  businessName,

                lastPointsRedemptionId:
                  redemptionRef.id,

                updatedAt:
                  serverTimestamp(),
              },
              {
                merge: true,
              }
            );

            /*
             * ======================================
             * CREATE ACTUAL REDEMPTION
             * ======================================
             */

            transaction.set(
              redemptionRef,

              {
                studentId:
                  request.studentId,

                studentName:
                  requestData.studentName ||
                  "",

                studentMobile:
                  requestData.studentMobile ||
                  "",

                studentCardNumber:
                  requestData.studentCardNumber ||
                  "",

                businessId:
                  businessUser.uid,

                businessName:
                  requestData.businessName ||
                  businessName,

                offerId:
                  request.offerId,

                offerTitle:
                  requestData.offerTitle ||
                  offerData.title ||
                  "",

                discount:
                  requestData.discount ||
                  offerData.discount ||
                  "",

                requestId:
                  request.id,

                pointsAwarded:
                  pointsAwarded,

                redemptionNumber:
                  finalUsageCount,


                redeemedAt:
                  serverTimestamp(),

                status:
                  "redeemed",
              }
            );

            /*
             * ======================================
             * APPROVE REQUEST
             * ======================================
             */

            transaction.update(
              requestRef,

              {
                status:
                  "approved",

                approvedAt:
                  serverTimestamp(),

                approvedBy:
                  businessUser.uid,

                redemptionId:
                  redemptionRef.id,

                usageCount:
                  finalUsageCount,

                pointsAwarded:
                  pointsAwarded,

              }
            );
          }
        );

        /*
         * ========================================
         * DASHBOARD STATISTICS
         * ========================================
         */

        setTotalRedeemed(
          (current) =>
            current + 1
        );

        setTotalScans(
          (current) =>
            current + 1
        );

        /*
         * ========================================
         * SUCCESS MESSAGE
         * ========================================
         */

        if (
          finalUsageCount ===
          1
        ) {
          alert(
            `🌟 First Time Use\n\nRedemption approved successfully!\n\nUsed: 1/4\nPoints Earned: +${pointsAwarded}`
          );
        } else if (
          finalUsageCount ===
          MAX_REDEMPTIONS
        ) {
          alert(
            `🏆 Final Use (4/4)\n\nRedemption approved successfully!\n\nThis student has reached the maximum 4 uses at this business.\n\nPoints Earned: +${pointsAwarded}`
          );
        } else {
          alert(
            `✅ Redemption Approved!\n\nUsed: ${finalUsageCount}/4\n\nPoints Earned: +${pointsAwarded}\nRemaining: ${
              MAX_REDEMPTIONS -
              finalUsageCount
            }`
          );
        }

      } catch (error: any) {
        console.error(
          "Approve redemption error:",
          error
        );

        if (
          error?.message ===
          "LIMIT_REACHED"
        ) {
          alert(
            "❌ Limit Reached\n\nThis student has already used the SBC benefit 4/4 times at this business."
          );
        } else if (
          error?.message ===
          "REQUEST_ALREADY_PROCESSED"
        ) {
          alert(
            "ℹ️ This redemption request has already been processed."
          );
        } else if (
          error?.message ===
          "REQUEST_NOT_FOUND"
        ) {
          alert(
            "❌ Redemption request no longer exists."
          );
        } else if (
          error?.message ===
          "OFFER_NOT_FOUND"
        ) {
          alert(
            "❌ The selected offer no longer exists."
          );
        } else if (
          error?.message ===
          "OFFER_NOT_ACTIVE"
        ) {
          alert(
            "❌ This offer is no longer active."
          );
        } else if (
          error?.message ===
          "INVALID_BUSINESS"
        ) {
          alert(
            "❌ Business verification failed."
          );
        } else if (
          error?.message ===
          "INVALID_OFFER_BUSINESS"
        ) {
          alert(
            "❌ This offer does not belong to your business."
          );
        } else {
          alert(
            "❌ Unable to approve redemption. Please try again."
          );
        }

      } finally {
        setProcessingId(
          null
        );
      }
    };

  /*
   * ==========================================
   * REJECT REDEMPTION
   * ==========================================
   */

  const rejectRedemption =
    async (
      request: PendingRedemption
    ) => {
      if (
        processingId
      ) {
        return;
      }

      const businessUser =
        auth.currentUser;

      if (!businessUser) {
        alert(
          "❌ Business login required."
        );

        return;
      }

      try {
        setProcessingId(
          request.id
        );

        const requestRef =
          doc(
            db,
            "redemptionRequests",
            request.id
          );

        await runTransaction(
          db,
          async (
            transaction
          ) => {
            const requestSnap =
              await transaction.get(
                requestRef
              );

            if (
              !requestSnap.exists()
            ) {
              throw new Error(
                "REQUEST_NOT_FOUND"
              );
            }

            const requestData =
              requestSnap.data();

            /*
             * Business ownership.
             */

            if (
              requestData.businessId !==
              businessUser.uid
            ) {
              throw new Error(
                "INVALID_BUSINESS"
              );
            }

            /*
             * Only pending requests
             * can be rejected.
             */

            if (
              requestData.status !==
              "pending"
            ) {
              throw new Error(
                "REQUEST_ALREADY_PROCESSED"
              );
            }

            transaction.update(
              requestRef,

              {
                status:
                  "rejected",

                rejectedAt:
                  serverTimestamp(),

                rejectedBy:
                  businessUser.uid,
              }
            );
          }
        );

      } catch (error: any) {
        console.error(
          "Reject redemption error:",
          error
        );

        if (
          error?.message ===
          "REQUEST_ALREADY_PROCESSED"
        ) {
          alert(
            "ℹ️ This redemption request has already been processed."
          );
        } else if (
          error?.message ===
          "REQUEST_NOT_FOUND"
        ) {
          alert(
            "❌ Redemption request no longer exists."
          );
        } else {
          alert(
            "❌ Unable to reject redemption. Please try again."
          );
        }

      } finally {
        setProcessingId(
          null
        );
      }
    };

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <BusinessProtected>

      <main className="min-h-screen bg-slate-100 p-8">

        <div className="mx-auto max-w-6xl">

          {/* HEADER */}

          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-4xl font-bold text-green-700">
                👋 Welcome {businessName}
              </h1>

              <p className="mt-2 text-gray-600">
                Business Dashboard
              </p>

            </div>

            <button
              onClick={
                logout
              }
              className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-700"
            >
              Logout
            </button>

          </div>

          {/* =====================================
              BUSINESS QR CARD
          ====================================== */}

          <div className="mb-8 rounded-3xl bg-white p-8 shadow-xl">

            <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">

              <div className="flex-1">

                <div className="inline-flex rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                  🎓 SBC Business Verification
                </div>

                <h2 className="mt-4 text-3xl font-extrabold text-slate-800">
                  Your Business QR
                </h2>

                <p className="mt-3 text-gray-600">
                  Students can scan this QR to
                  verify your business before
                  redeeming an SBC benefit.
                </p>

                <div className="mt-6 rounded-2xl bg-yellow-50 p-5">

                  <p className="text-sm font-bold text-gray-500">
                    SBC BUSINESS ID
                  </p>

                  <p className="mt-2 break-all text-2xl font-extrabold tracking-wide text-green-700">
                    {loadingBusinessQr
                      ? "Generating..."
                      : businessId ||
                        "Not available"}
                  </p>

                </div>

                <div className="mt-5 flex flex-wrap gap-3">

                  <button
                    onClick={() =>
                      setShowBusinessQr(
                        true
                      )
                    }
                    disabled={
                      !businessQr
                    }
                    className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    📷 View QR
                  </button>

                  <button
                    onClick={
                      downloadBusinessQr
                    }
                    disabled={
                      !businessQr
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    ⬇️ Download QR
                  </button>

                  <button
                    onClick={
                      printBusinessQr
                    }
                    disabled={
                      !businessQr
                    }
                    className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    🖨️ Print QR
                  </button>

                </div>

              </div>

              {/* QR PREVIEW */}

              <div className="flex justify-center">

                {loadingBusinessQr ? (

                  <div className="flex h-64 w-64 items-center justify-center rounded-3xl bg-gray-100">

                    <div className="text-center">

                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />

                      <p className="mt-3 text-sm text-gray-500">
                        Creating QR...
                      </p>

                    </div>

                  </div>

                ) : businessQr ? (

                  <div className="rounded-3xl border-4 border-green-100 bg-white p-5 shadow-lg">

                    <img
                      src={
                        businessQr
                      }
                      alt="SBC Business QR"
                      className="h-56 w-56"
                    />

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

          {/* =====================================
              PENDING ALERT
          ====================================== */}

          {pendingRedemptions.length >
            0 && (

            <div className="mb-8 rounded-3xl border-2 border-yellow-300 bg-yellow-50 p-6 shadow-lg">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h2 className="text-2xl font-extrabold text-yellow-800">
                    🔔 Pending SBC Redemptions
                  </h2>

                  <p className="mt-2 text-yellow-700">

                    You have{" "}

                    <span className="font-extrabold">
                      {
                        pendingRedemptions.length
                      }
                    </span>{" "}

                    student redemption request
                    {
                      pendingRedemptions.length ===
                      1
                        ? ""
                        : "s"
                    }{" "}
                    waiting for approval.

                  </p>

                </div>

                <button
                  onClick={() =>
                    setShowPendingPopup(
                      true
                    )
                  }
                  className="rounded-xl bg-yellow-500 px-6 py-3 font-bold text-white hover:bg-yellow-600"
                >
                  🔔 View Requests
                </button>

              </div>

            </div>
          )}

          {/* =====================================
              STATISTICS
          ====================================== */}

          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🎁 Total Offers
              </p>

              <h2 className="mt-4 text-5xl font-bold text-green-700">
                {totalOffers}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                📷 Total Scans
              </p>

              <h2 className="mt-4 text-5xl font-bold text-blue-700">
                {totalScans}
              </h2>

            </div>

            <div className="rounded-3xl bg-white p-8 shadow-xl">

              <p className="text-gray-500">
                🎉 Total Redeemed
              </p>

              <h2 className="mt-4 text-5xl font-bold text-orange-600">
                {totalRedeemed}
              </h2>

            </div>

          </div>

          {/* =====================================
              QUICK ACTIONS
          ====================================== */}

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <Link
              href="/business/add-offer"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >

              <h2 className="text-2xl font-bold text-green-700">
                ➕ Add Offer
              </h2>

              <p className="mt-3 text-gray-600">
                Create new offers for students.
              </p>

            </Link>

            <Link
              href="/business/my-offers"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >

              <h2 className="text-2xl font-bold text-blue-700">
                🎁 My Offers
              </h2>

              <p className="mt-3 text-gray-600">
                View and manage your offers.
              </p>

            </Link>

            <Link
              href="/business/scan"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >

              <h2 className="text-2xl font-bold text-purple-700">
                📷 Redeem Student Offer
              </h2>

              <p className="mt-3 text-gray-600">
                Redeem Student Offer here.
              </p>

            </Link>

            <Link
              href="/business/history"
              className="rounded-3xl bg-white p-8 shadow-xl transition hover:scale-105"
            >

              <h2 className="text-2xl font-bold text-orange-700">
                📊 Redemption History
              </h2>

              <p className="mt-3 text-gray-600">
                View all redeemed offer history.
              </p>

            </Link>

          </div>

          {/* =====================================
              PORTAL INFO
          ====================================== */}

          <div className="mt-10 rounded-3xl bg-white p-8 shadow-xl">

            <h2 className="text-3xl font-bold text-green-700">
              🚀 SBC Business Portal
            </h2>

            <p className="mt-4 text-lg text-gray-600">
              Manage your offers, display your
              Business QR, receive student
              redemption requests and track all
              redemptions from one secure dashboard.
            </p>

          </div>

        </div>

      </main>

      {/* ==========================================
          BUSINESS QR MODAL
      =========================================== */}

      {showBusinessQr &&
        businessQr && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

            <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-2xl font-extrabold text-green-700">
                    📷 SBC Business QR
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {businessName}
                  </p>

                </div>

                <button
                  onClick={() =>
                    setShowBusinessQr(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-bold hover:bg-gray-200"
                >
                  ✕
                </button>

              </div>

              <div className="mt-6 rounded-3xl border-4 border-green-100 bg-white p-6">

                <img
                  src={
                    businessQr
                  }
                  alt="SBC Business QR"
                  className="mx-auto w-full max-w-xs"
                />

              </div>

              <div className="mt-5 rounded-2xl bg-yellow-50 p-4 text-center">

                <p className="text-xs font-bold text-gray-500">
                  BUSINESS ID
                </p>

                <p className="mt-1 text-xl font-extrabold text-green-700">
                  {businessId}
                </p>

              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">

                <button
                  onClick={
                    downloadBusinessQr
                  }
                  className="rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700"
                >
                  ⬇️ Download
                </button>

                <button
                  onClick={
                    printBusinessQr
                  }
                  className="rounded-xl bg-purple-600 py-3 font-bold text-white hover:bg-purple-700"
                >
                  🖨️ Print
                </button>

              </div>

            </div>

          </div>
        )}

      {/* ==========================================
          PENDING REDEMPTION POPUP
      =========================================== */}

      {showPendingPopup &&
        pendingRedemptions.length >
          0 && (

          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">

            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">

              {/* HEADER */}

              <div className="sticky top-0 border-b bg-white p-6">

                <div className="flex items-center justify-between">

                  <div>

                    <h2 className="text-2xl font-extrabold text-green-700">
                      🔔 New SBC Redemption
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Student requests waiting for approval
                    </p>

                  </div>

                  <button
                    onClick={() =>
                      setShowPendingPopup(
                        false
                      )
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-bold hover:bg-gray-200"
                  >
                    ✕
                  </button>

                </div>

              </div>

              {/* REQUESTS */}

              <div className="space-y-5 p-6">

                {pendingRedemptions.map(
                  (
                    request
                  ) => {

                    const isProcessing =
                      processingId ===
                      request.id;

                    return (
                      <div
                        key={
                          request.id
                        }
                        className="rounded-2xl border-2 border-yellow-200 bg-yellow-50 p-5"
                      >

                        {/* STUDENT */}

                        <div className="mb-4">

                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            Student
                          </p>

                          <h3 className="mt-1 text-xl font-extrabold text-gray-800">
                            👤{" "}
                            {request.studentName ||
                              "SBC Student"}
                          </h3>

                          {request.studentCardNumber && (

                            <p className="mt-1 text-sm font-semibold text-gray-500">
                              Card No:{" "}
                              {
                                request.studentCardNumber
                              }
                            </p>

                          )}

                        </div>

                        {/* OFFER */}

                        <div className="rounded-xl bg-white p-4">

                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                            Offer
                          </p>

                          <p className="mt-1 text-lg font-extrabold text-green-700">
                            🎁{" "}
                            {request.offerTitle ||
                              "SBC Offer"}
                          </p>

                          {request.discount && (

                            <p className="mt-1 text-sm font-bold text-blue-600">
                              {request.discount}
                            </p>

                          )}

                        </div>

                        {/* STATUS */}

                        <div className="mt-4 rounded-xl bg-yellow-100 p-3 text-center">

                          <p className="text-sm font-bold text-yellow-800">
                            ⏳ Waiting for Business Approval
                          </p>

                        </div>

                        {/* ACTIONS */}

                        <div className="mt-5 grid grid-cols-2 gap-3">

                          <button
                            onClick={() =>
                              rejectRedemption(
                                request
                              )
                            }
                            disabled={
                              isProcessing
                            }
                            className="rounded-xl bg-red-600 py-4 font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >

                            {isProcessing
                              ? "Please wait..."
                              : "✕ Reject"}

                          </button>

                          <button
                            onClick={() =>
                              approveRedemption(
                                request
                              )
                            }
                            disabled={
                              isProcessing
                            }
                            className="rounded-xl bg-green-600 py-4 font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                          >

                            {isProcessing
                              ? "Please wait..."
                              : "✓ Approve"}

                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

          </div>
        )}

    </BusinessProtected>
  );
}