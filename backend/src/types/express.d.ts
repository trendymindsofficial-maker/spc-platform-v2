import { DecodedIdToken } from "firebase-admin/auth";

/*
|--------------------------------------------------------------------------
| EXPRESS REQUEST AUGMENTATION
|--------------------------------------------------------------------------
|
| requireUser / requireAdmin attach the verified Firebase token to the
| request so downstream handlers can trust req.user.uid.
|
*/

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      isAdmin?: boolean;
      /**
       * Exact request bytes, captured by express.json's verify hook.
       * Required for Razorpay webhook signature verification.
       */
      rawBody?: Buffer;
    }
  }
}

export {};
