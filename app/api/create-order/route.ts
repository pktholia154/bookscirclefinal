export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, currency = "INR", receipt, notes } = body;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_TJc8qwXIssrTXY";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "9a5bbmZLhY27bp41KKKVxJNC";

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay API credentials are missing on the server." },
        { status: 500 }
      );
    }

    // Razorpay accepts values in minor units (e.g., paise for INR)
    // If amount is passed in Rupees (e.g. ₹499), convert to paise (49900) if < 1000 and not already in paise
    let parsedAmount = Math.round(Number(amount));
    
    if (isNaN(parsedAmount) || parsedAmount < 100) {
      return NextResponse.json(
        { error: "Order amount must be at least 100 paise (₹1)." },
        { status: 400 }
      );
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const orderOptions = {
      amount: parsedAmount, // in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: notes || {},
    };

    const order = await instance.orders.create(orderOptions);

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: keyId,
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Razorpay order" },
      { status: 500 }
    );
  }
}
