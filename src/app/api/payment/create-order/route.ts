import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST() {
  try {
    const order = await razorpay.orders.create({
      amount: 19900,
      currency: "INR",
      receipt: `sbc_${Date.now()}`,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create payment order",
      },
      { status: 500 }
    );
  }
}
