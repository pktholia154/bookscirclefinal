'use client';

// Extend global window object for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCheckoutOptions {
  amountInRupees: number;
  bookIds?: string[];
  bookTitles?: string[];
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  onSuccess: (paymentData: {
    order_id: string;
    payment_id: string;
    signature: string;
    amountInRupees: number;
  }) => void;
  onError?: (errorMessage: string) => void;
  onDismiss?: () => void;
}

// Dynamically load Razorpay SDK in the browser
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export async function processRazorpayPayment(options: RazorpayCheckoutOptions): Promise<void> {
  const {
    amountInRupees,
    bookIds = [],
    bookTitles = [],
    userName = 'Pardeep Kumar',
    userEmail = 'pardeep1984@gmail.com',
    userPhone = '9876543210',
    onSuccess,
    onError,
    onDismiss,
  } = options;

  try {
    // 1. Ensure Razorpay SDK is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Failed to load Razorpay payment gateway. Please check your network connection.');
    }

    // 2. Amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amountInRupees * 100);
    if (amountInPaise < 100) {
      throw new Error('Minimum payment amount is ₹1.00');
    }

    // 3. Create order on server
    const orderResponse = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `bk_rcpt_${Date.now()}`,
        notes: {
          book_count: bookIds.length.toString(),
          book_ids: bookIds.join(','),
          titles: bookTitles.slice(0, 3).join(', '),
        },
      }),
    });

    const orderData = await orderResponse.json();
    if (!orderResponse.ok || !orderData.order_id) {
      throw new Error(orderData.error || 'Failed to initialize payment order on server.');
    }

    const keyId =
      orderData.key_id ||
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
      'rzp_live_TJc8qwXIssrTXY';

    // 4. Configure Razorpay Standard Checkout modal
    const checkoutOptions = {
      key: keyId,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'BooksCircle',
      description: bookTitles.length > 0
        ? `eBook Purchase: ${bookTitles[0]}${bookTitles.length > 1 ? ` (+${bookTitles.length - 1} more)` : ''}`
        : 'Digital PDF E-Book Purchase',
      order_id: orderData.order_id,
      image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=200&auto=format&fit=crop',
      handler: async function (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) {
        try {
          // 5. Verify payment signature on server
          const verifyResponse = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyData = await verifyResponse.json();
          if (verifyResponse.ok && verifyData.success) {
            onSuccess({
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amountInRupees,
            });
          } else {
            const err = verifyData.error || 'Payment signature verification failed.';
            if (onError) onError(err);
          }
        } catch (verifyErr: any) {
          console.error('Payment verification error:', verifyErr);
          if (onError) onError(verifyErr.message || 'Payment verification encountered a network error.');
        }
      },
      prefill: {
        name: userName,
        email: userEmail,
        contact: userPhone,
      },
      notes: {
        platform: 'BooksCircle Web & PWA',
        item_count: bookIds.length.toString(),
      },
      theme: {
        color: '#4029AB', // BooksCircle theme purple
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
    };

    const paymentWindow = new window.Razorpay(checkoutOptions);
    
    // Handle payment failures
    paymentWindow.on('payment.failed', function (response: any) {
      console.error('Razorpay payment failed:', response.error);
      if (onError) {
        onError(response.error?.description || 'Payment was declined or cancelled by bank.');
      }
    });

    paymentWindow.open();
  } catch (error: any) {
    console.error('Razorpay checkout error:', error);
    if (onError) {
      onError(error.message || 'An unexpected checkout error occurred.');
    }
  }
}
