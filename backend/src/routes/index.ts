import { Router } from "express";

import { adminRouter } from "./admin.routes";
import { businessRouter } from "./business.routes";
import { paymentRouter } from "./payment.routes";
import { payoutRouter } from "./payout.routes";
import { redemptionRouter } from "./redemption.routes";
import { referralRouter } from "./referral.routes";
import { studentRouter } from "./student.routes";

/*
|--------------------------------------------------------------------------
| SBC API ROUTES
|--------------------------------------------------------------------------
|
| Mounted at /api, so every path below matches the Next.js route handler
| it replaced one-for-one:
|
|   POST   /api/admin/check-email
|   POST   /api/admin/notifications/send      (admin)
|   GET    /api/admin/payouts                 (admin)
|   PATCH  /api/admin/payouts                 (admin)
|   POST   /api/business/check-mobile
|   POST   /api/business/reset-password       (phone-verified user)
|   POST   /api/payment/create-order          (user)
|   POST   /api/payment/verify                (user)
|   GET    /api/payout/history                (user)
|   POST   /api/payout/request                (user)
|   POST   /api/redemption/create             (user)
|   POST   /api/referral/process              (user)
|   POST   /api/referral/reconcile            (user)
|   POST   /api/student/check-mobile
|
*/

export const apiRouter = Router();

apiRouter.use("/admin", adminRouter);
apiRouter.use("/business", businessRouter);
apiRouter.use("/payment", paymentRouter);
apiRouter.use("/payout", payoutRouter);
apiRouter.use("/redemption", redemptionRouter);
apiRouter.use("/referral", referralRouter);
apiRouter.use("/student", studentRouter);
