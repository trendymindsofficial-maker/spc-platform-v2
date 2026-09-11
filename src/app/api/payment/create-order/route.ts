import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const amount =
      typeof body?.amount === "number" && body.amount > 0
        ? body.amount
        : 199;

    const purpose =
      typeof body?.purpose === "string" && body.purpose.trim()
        ? body.purpose.trim()
        : "SBC student membership";

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay environment variables are missing.");
      return NextResponse.json(
        {
          success: false,
          error: "Razorpay payment is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `sbc_${Date.now()}`,
      notes: {
        purpose,
      },
    });

    return NextResponse.json({
      success: true,
      order,
      // Safe to expose to the browser. This is the Razorpay Key ID,
      // not the secret key.
      keyId,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create payment order.",
      },
      { status: 500 }
    );
  }
}
