import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const orderId =
      String(body?.razorpay_order_id || "").trim();
    const paymentId =
      String(body?.razorpay_payment_id || "").trim();
    const signature =
      String(body?.razorpay_signature || "").trim();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing Razorpay payment verification fields.",
        },
        { status: 400 }
      );
    }

    const secret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      console.error(
        "RAZORPAY_KEY_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error: "Payment verification is not configured.",
        },
        { status: 500 }
      );
    }

    const expectedSignature =
      crypto
        .createHmac("sha256", secret)
        .update(
          `${orderId}|${paymentId}`
        )
        .digest("hex");

    const valid =
      expectedSignature.length ===
        signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      );

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment signature.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentId,
      orderId,
    });
  } catch (error) {
    console.error(
      "Razorpay verification error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to verify payment.",
      },
      { status: 500 }
    );
  }
}
