import { Router } from "express";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getDb } from "../lib/firebase-admin";
import { toDate } from "../lib/dates";
import {
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
} from "../lib/http";
import { currentUser } from "../middleware/auth";
import { requireRedeemApproval } from "../middleware/redeemApprovalAuth";

export const redeemApprovalRouter = Router();

redeemApprovalRouter.use(requireRedeemApproval);

const MAX_REDEMPTIONS = 6;

function getPointsForUsage(usageNumber: number): number {
  if (usageNumber === 1) return 20;
  if (usageNumber === 2) return 10;
  return 5;
}

async function verifyApprovalAccess(uid: string) {
  const snap = await getDb()
    .collection("redeemApprovalAdmins")
    .doc(uid)
    .get();

  if (!snap.exists || snap.data()?.active !== true) {
    throw forbidden("Redeem Approval access denied.");
  }

  if (snap.data()?.accessAllBusinesses !== true) {
    throw forbidden("All-business access is not enabled for this account.");
  }
}

function serializeTimestamp(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime())
      ? date.toISOString()
      : null;
  }

  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function serializeRequest(id: string, data: Record<string, unknown>) {
  return {
    ...data,
    id,
    createdAt: serializeTimestamp(data.createdAt),
    approvedAt: serializeTimestamp(data.approvedAt),
    rejectedAt: serializeTimestamp(data.rejectedAt),
    updatedAt: serializeTimestamp(data.updatedAt),
  };
}


// GET /api/redeem-approval/businesses
redeemApprovalRouter.get(
  "/businesses",
  asyncHandler(async (req, res) => {
    await verifyApprovalAccess(currentUser(req).uid);

    const db = getDb();
    const [businessesSnap, redemptionsSnap] = await Promise.all([
      db.collection("businesses").get(),
      db.collection("redemptions")
        .where("status", "==", "redeemed")
        .get(),
    ]);

    const counts = new Map<string, number>();

    for (const doc of redemptionsSnap.docs) {
      const id = String(doc.data().businessId || "");
      if (id) counts.set(id, (counts.get(id) || 0) + 1);
    }

    const businesses = businessesSnap.docs.map((doc) => ({
      id: doc.id,
      name: String(
        doc.data().businessName || doc.data().name || "Unnamed Business"
      ),
      successfulRedemptions: counts.get(doc.id) || 0,
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.json({ success: true, businesses });
  })
);

// GET /api/redeem-approval/history
// Cursor-based pagination for large redemption histories.
redeemApprovalRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    await verifyApprovalAccess(currentUser(req).uid);

    const businessId = String(req.query.businessId || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const cursor = String(req.query.cursor || "").trim();

    const requestedSize = Number(req.query.limit || 25);
    const pageSize = Number.isFinite(requestedSize)
      ? Math.min(100, Math.max(1, Math.floor(requestedSize)))
      : 25;

    const validDate = (value: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
    };

    if ((from && !validDate(from)) || (to && !validDate(to))) {
      throw badRequest("Dates must use YYYY-MM-DD format.");
    }
    if (from && to && from > to) {
      throw badRequest("Start date must not be after end date.");
    }

    const db = getDb();
    let query = db.collection("redemptions")
      .where("status", "==", "redeemed");

    if (businessId) {
      query = query.where("businessId", "==", businessId);
    }

    // Date boundaries use India Standard Time (UTC+05:30).
    if (from) {
      query = query.where(
        "redeemedAt",
        ">=",
        Timestamp.fromDate(new Date(`${from}T00:00:00+05:30`))
      );
    }
    if (to) {
      query = query.where(
        "redeemedAt",
        "<=",
        Timestamp.fromDate(new Date(`${to}T23:59:59.999+05:30`))
      );
    }

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    let pageQuery = query.orderBy("redeemedAt", "desc");

    if (cursor) {
      const cursorSnapshot = await db
        .collection("redemptions")
        .doc(cursor)
        .get();

      if (!cursorSnapshot.exists) {
        throw badRequest("Invalid pagination cursor. Please refresh history.");
      }

      pageQuery = pageQuery.startAfter(cursorSnapshot);
    }

    const pageSnapshot = await pageQuery.limit(pageSize + 1).get();
    const hasMore = pageSnapshot.docs.length > pageSize;
    const pageDocs = pageSnapshot.docs.slice(0, pageSize);

    const history = pageDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        businessId: String(data.businessId || ""),
        businessName: String(data.businessName || ""),
        studentName: String(data.studentName || ""),
        studentCardNumber: String(data.studentCardNumber || ""),
        offerTitle: String(data.offerTitle || ""),
        discount: String(data.discount || ""),
        pointsAwarded: Number(data.pointsAwarded || 0),
        status: String(data.status || ""),
        redeemedAt: serializeTimestamp(data.redeemedAt),
      };
    });

    res.json({
      success: true,
      total,
      pageSize,
      history,
      nextCursor: hasMore ? pageDocs[pageDocs.length - 1]?.id || null : null,
    });
  })
);


async function sendRedemptionCsv(
  res: import("express").Response,
  businessId: string,
  from: string,
  to: string,
  filename: string
) {
  const snapshot = await getDb()
    .collection("redemptions")
    .where("status", "==", "redeemed")
    .get();

  const rows = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      businessId: String(data.businessId || ""),
      businessName: String(data.businessName || ""),
      studentName: String(data.studentName || ""),
      studentCardNumber: String(data.studentCardNumber || ""),
      offerTitle: String(data.offerTitle || ""),
      discount: String(data.discount || ""),
      pointsAwarded: Number(data.pointsAwarded || 0),
      status: String(data.status || ""),
      redeemedAt: serializeTimestamp(data.redeemedAt),
    };
  }).filter((item) => {
    if (businessId && item.businessId !== businessId) return false;
    if (!from && !to) return true;
    if (!item.redeemedAt) return false;

    const localDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(item.redeemedAt));

    return (!from || localDate >= from) && (!to || localDate <= to);
  }).sort((a, b) =>
    (b.redeemedAt || "").localeCompare(a.redeemedAt || "")
  );

  const headers = [
    "Business Name",
    "Student Name",
    "Card Number",
    "Offer",
    "Discount",
    "Points Awarded",
    "Redeemed At",
    "Status",
  ];

  const lines = [
    headers,
    ...rows.map((item) => [
      item.businessName,
      item.studentName,
      item.studentCardNumber,
      item.offerTitle,
      item.discount,
      item.pointsAwarded,
      item.redeemedAt || "",
      item.status,
    ]),
  ];

  const csv = "\uFEFF" + lines
    .map((row) => row.map((value) => {
      let text = String(value ?? "");
      if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    }).join(","))
    .join("\r\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"`
  );
  res.send(csv);
}

// GET /api/redeem-approval/history/export
redeemApprovalRouter.get(
  "/history/export",
  asyncHandler(async (req, res) => {
    await verifyApprovalAccess(currentUser(req).uid);
    const businessId = String(req.query.businessId || "").trim();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const validDate = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

    if ((from && !validDate(from)) || (to && !validDate(to))) {
      throw badRequest("Dates must use YYYY-MM-DD format.");
    }
    if (from && to && from > to) {
      throw badRequest("Start date must not be after end date.");
    }
    if (!businessId) {
      throw badRequest("Business ID is required.");
    }

    await sendRedemptionCsv(
      res, businessId, from, to, "business-redemption-history.csv"
    );
  })
);

// GET /api/redeem-approval/history/export-all
redeemApprovalRouter.get(
  "/history/export-all",
  asyncHandler(async (req, res) => {
    await verifyApprovalAccess(currentUser(req).uid);
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();

    const validDate = (value: string) =>
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

    if ((from && !validDate(from)) || (to && !validDate(to))) {
      throw badRequest("Dates must use YYYY-MM-DD format.");
    }
    if (from && to && from > to) {
      throw badRequest("Start date must not be after end date.");
    }

    await sendRedemptionCsv(
      res, "", from, to, "all-redemptions.csv"
    );
  })
);

// GET /api/redeem-approval/requests
redeemApprovalRouter.get(
  "/requests",
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    await verifyApprovalAccess(uid);

    const snapshot = await getDb()
      .collection("redemptionRequests")
      .where("status", "==", "pending")
      .get();

    const requests = snapshot.docs.map((item) =>
      serializeRequest(
        item.id,
        item.data() as Record<string, unknown>
      )
    );

    res.json({ success: true, requests });
  })
);

// POST /api/redeem-approval/requests/:id/approve
redeemApprovalRouter.post(
  "/requests/:id/approve",
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    await verifyApprovalAccess(uid);

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      throw badRequest("Request ID is required.");
    }

    const db = getDb();
    const requestRef = db.collection("redemptionRequests").doc(requestId);

    const result = await db.runTransaction(async (transaction) => {
      // Read the request first.
      const requestSnap = await transaction.get(requestRef);

      if (!requestSnap.exists) {
        throw notFound("Redemption request not found.");
      }

      const request = requestSnap.data() || {};

      if (request.status !== "pending") {
        throw badRequest("This request has already been processed.");
      }

      const studentAuthUid = String(request.studentId || "");
      const businessId = String(request.businessId || "");
      const offerId = String(request.offerId || "");

      if (!studentAuthUid || !businessId || !offerId) {
        throw badRequest("The redemption request is missing required information.");
      }

      // Canonical membership document: students/<Firebase Auth UID>
      const canonicalStudentRef = db
        .collection("students")
        .doc(studentAuthUid);

      const canonicalStudentSnap = await transaction.get(
        canonicalStudentRef
      );

      if (!canonicalStudentSnap.exists) {
        throw notFound("Student account was not found.");
      }

      const canonicalStudent = canonicalStudentSnap.data() || {};
      const currentCycleId = String(
        canonicalStudent.membershipCycleId || ""
      ).trim();

      const membershipExpiry = toDate(
        canonicalStudent.membershipExpiryDate
      );

      if (
        canonicalStudent.membershipStatus !== "active" ||
        canonicalStudent.status !== "active" ||
        canonicalStudent.paymentStatus !== "paid" ||
        !membershipExpiry ||
        membershipExpiry.getTime() <= Date.now()
      ) {
        throw forbidden(
          "Student membership is inactive or expired. Please renew before redeeming."
        );
      }

      if (!currentCycleId) {
        throw forbidden(
          "Membership cycle verification is required."
        );
      }

      // Do not approve requests from a previous or unverified cycle.
      if (
        String(request.membershipCycleId || "") !== currentCycleId
      ) {
        throw badRequest(
          "This redemption request belongs to an old membership cycle. Please create a new request."
        );
      }

      const offerRef = db.collection("offers").doc(offerId);
      const usageRef = db
        .collection("businessStudentUsage")
        .doc(`${businessId}_${studentAuthUid}`);

      // Match the same student profile lookup used by the student dashboard.
      const studentQuery = db
        .collection("students")
        .where("uid", "==", studentAuthUid);

      const studentQuerySnap = await transaction.get(studentQuery);

      const studentDoc =
        studentQuerySnap.docs.find((item) => {
          const data = item.data();
          return Boolean(data.fullName && data.cardNumber);
        }) || studentQuerySnap.docs[0];

      let studentRef = studentDoc?.ref;

      // Match the dashboard's fallback when no profile is found by uid query.
      if (!studentRef) {
        const fallbackRef = db.collection("students").doc(studentAuthUid);
        const fallbackSnap = await transaction.get(fallbackRef);

        if (fallbackSnap.exists) {
          studentRef = fallbackRef;
        }
      }

      if (!studentRef) {
        throw notFound("Student profile not found. Approval was not completed.");
      }

      const offerSnap = await transaction.get(offerRef);
      const usageSnap = await transaction.get(usageRef);

      const redemptionsQuery = db
        .collection("redemptions")
        .where("studentId", "==", studentAuthUid)
        .where("businessId", "==", businessId);

      const redemptionsSnap = await transaction.get(redemptionsQuery);

      // Guard against a redemption already created for this same request.
      const sameRequestQuery = db
        .collection("redemptions")
        .where("requestId", "==", requestId);

      const sameRequestSnap = await transaction.get(sameRequestQuery);

      if (!offerSnap.exists) {
        throw notFound("Offer not found.");
      }

      const offer = offerSnap.data() || {};

      if (String(offer.businessId || "") !== businessId) {
        throw badRequest("This offer does not belong to the requesting business.");
      }

      if (String(offer.status || "").toLowerCase() !== "active") {
        throw badRequest("This offer is no longer active.");
      }

      if (!studentDoc && studentRef.id !== studentAuthUid) {
        throw notFound("Student profile could not be verified.");
      }

      if (sameRequestSnap.size > 0) {
        throw badRequest(
          "A redemption record already exists for this request. Please check the redemption history."
        );
      }

      // Only successful redemptions belonging to this membership cycle count.
      const cycleRedemptionCount = redemptionsSnap.docs.filter((doc) => {
        const data = doc.data();

        return (
          data.status === "redeemed" &&
          String(data.membershipCycleId || "") === currentCycleId
        );
      }).length;

      // Ignore usage counters belonging to an older membership cycle.
      const usageData = usageSnap.exists
        ? usageSnap.data() || {}
        : {};

      const storedCount =
        String(usageData.membershipCycleId || "") === currentCycleId
          ? Math.max(0, Number(usageData.count || 0))
          : 0;

      const currentCount = Math.max(
        storedCount,
        cycleRedemptionCount
      );

      if (currentCount >= MAX_REDEMPTIONS) {
        throw badRequest(
          `This student has already used the benefit ${MAX_REDEMPTIONS}/${MAX_REDEMPTIONS} times at this business.`
        );
      }

      const usageNumber = currentCount + 1;
      const pointsAwarded = getPointsForUsage(usageNumber);

      // Points document ID must match the student's profile document ID.
      const pointsRef = db.collection("studentPoints").doc(studentRef.id);
      const pointsSnap = await transaction.get(pointsRef);
      const studentSnap = await transaction.get(studentRef);

      if (!studentSnap.exists) {
        throw notFound("Student profile not found.");
      }

      const studentData = studentSnap.data() || {};
      const pointsData = pointsSnap.exists ? pointsSnap.data() || {} : {};
      const currentPoints = Number(pointsData.totalPoints || 0);
      const newTotalPoints = currentPoints + pointsAwarded;

      const redemptionRef = db.collection("redemptions").doc();
      const now = FieldValue.serverTimestamp();

      // All reads are complete. Apply all writes atomically.
      transaction.set(
        usageRef,
        {
          studentId: studentAuthUid,
          businessId,
          membershipCycleId: currentCycleId,
          count: usageNumber,
          maxAllowed: MAX_REDEMPTIONS,
          updatedAt: now,
        },
        { merge: true }
      );

      transaction.set(
        pointsRef,
        {
          studentId: studentRef.id,
          uid: studentAuthUid,
          totalPoints: newTotalPoints,
          lastPointsAwarded: pointsAwarded,
          lastPointsBusinessId: businessId,
          lastPointsRedemptionId: redemptionRef.id,
          updatedAt: now,
        },
        { merge: true }
      );

      // Keep the legacy student profile balance in sync.
      transaction.set(
        studentRef,
        {
          points: newTotalPoints,
          pointsUpdatedAt: now,
          lastPointsAwarded: pointsAwarded,
          lastPointsBusinessId: businessId,
          lastPointsRedemptionId: redemptionRef.id,
        },
        { merge: true }
      );

      transaction.set(redemptionRef, {
        studentId: studentAuthUid,
        studentProfileId: studentRef.id,
        membershipCycleId: currentCycleId,
        studentName:
          request.studentName ||
          studentData.fullName ||
          studentData.name ||
          "SBC Student",
        studentMobile:
          request.studentMobile ||
          studentData.mobile ||
          studentData.phone ||
          "",
        studentCardNumber:
          request.studentCardNumber ||
          studentData.cardNumber ||
          studentData.studentCardNumber ||
          "",
        businessId,
        businessName:
          request.businessName || offer.businessName || "SBC Partner Business",
        offerId,
        offerTitle: request.offerTitle || offer.title || "SBC Offer",
        discount:
          request.discount ||
          request.offerDiscount ||
          offer.discount ||
          "",
        requestId,
        pointsAwarded,
        usageNumber,
        redeemedAt: now,
        status: "redeemed",
      });

      transaction.update(requestRef, {
        status: "approved",
        approvedAt: now,
        approvedBy: uid,
        updatedAt: now,
        redemptionId: redemptionRef.id,
        usageCount: usageNumber,
        pointsAwarded,
      });

      return {
        redemptionId: redemptionRef.id,
        usageNumber,
        pointsAwarded,
        totalPoints: newTotalPoints,
      };
    });

    res.json({
      success: true,
      message: "Redemption request approved.",
      requestId,
      ...result,
    });
  })
);

// POST /api/redeem-approval/requests/:id/reject
redeemApprovalRouter.post(
  "/requests/:id/reject",
  asyncHandler(async (req, res) => {
    const uid = currentUser(req).uid;
    await verifyApprovalAccess(uid);

    const requestId = String(req.params.id || "").trim();

    if (!requestId) {
      throw badRequest("Request ID is required.");
    }

    const db = getDb();
    const requestRef = db.collection("redemptionRequests").doc(requestId);

    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(requestRef);

      if (!snap.exists) {
        throw notFound("Redemption request not found.");
      }

      const request = snap.data() || {};

      if (request.status !== "pending") {
        throw badRequest("This request has already been processed.");
      }

      transaction.update(requestRef, {
        status: "rejected",
        rejectedAt: FieldValue.serverTimestamp(),
        rejectedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    res.json({
      success: true,
      message: "Redemption request rejected.",
      requestId,
    });
  })
);
