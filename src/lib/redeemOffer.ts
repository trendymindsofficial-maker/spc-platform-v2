import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  runTransaction,
  doc,
  Firestore,
} from "firebase/firestore";

import {
  Student,
  Offer,
  RedemptionResult,
} from "@/types/student";

interface RedeemParams {
  db: Firestore;
  businessId: string;
  student: Student;
  offer: Offer;
}

export async function redeemOffer({
  db,
  businessId,
  student,
  offer,
}: RedeemParams): Promise<RedemptionResult> {
  try {
    const offerRef = doc(db, "offers", offer.id);

    return await runTransaction(db, async (transaction) => {
      const offerSnap = await transaction.get(offerRef);

      if (!offerSnap.exists()) {
        throw new Error("Offer not found.");
      }

      const offerData = offerSnap.data();

      if (offerData.status !== "active") {
        throw new Error("Offer is inactive.");
      }

      const redemptionQuery = query(
        collection(db, "redemptions"),
        where("studentId", "==", student.id),
        where("offerId", "==", offer.id)
      );

      const redemptionSnap = await getDocs(redemptionQuery);

      const usedCount = redemptionSnap.size;

      if (usedCount >= 4) {
        return {
          success: false,
          message: "Limit Reached",
          usedCount,
        };
      }

      await addDoc(collection(db, "redemptions"), {
        businessId,
        studentId: student.id,
        studentName: student.fullName,
        studentMobile: student.mobile,
        offerId: offer.id,
        offerTitle: offer.title,
        discount: offer.discount,
        redeemedAt: serverTimestamp(),
        status: "redeemed",
      });

      return {
        success: true,
        message:
          usedCount === 0
            ? "First Time Use"
            : `Used ${usedCount + 1}/4`,
        usedCount: usedCount + 1,
      };
    });
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Redeem failed",
      usedCount: 0,
    };
  }
}