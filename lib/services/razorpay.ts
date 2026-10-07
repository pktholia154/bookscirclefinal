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
  userId?: string;
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

let razorpayScriptPromise: Promise<boolean> | null = null;

// Dynamically load & prewarm Razorpay SDK in the browser with lightning speed
export const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise = new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      if ((existingScript as any).dataset?.loaded === 'true') {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true), { once: true });
      existingScript.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    // Safeguard: make sure window.fetch has a setter if an SDK attempts assignment
    try {
      if (typeof window !== 'undefined' && window.fetch) {
        const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
        if (!desc || !desc.writable || !desc.set) {
          const originalFetch = window.fetch;
          try {
            Object.defineProperty(window, 'fetch', {
              value: originalFetch,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          } catch {
            let activeFetch = originalFetch;
            Object.defineProperty(window, 'fetch', {
              get: () => activeFetch,
              set: (newFetch) => {
                activeFetch = newFetch;
              },
              configurable: true,
              enumerable: true,
            });
          }
        }
      }
    } catch {
      // Ignored
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve(true);
    };
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
};

// Lazy load Razorpay script on demand when checkout is actually initiated, avoiding unsolicited execution errors
export async function processRazorpayPayment(options: RazorpayCheckoutOptions): Promise<void> {
  const {
    amountInRupees,
    bookIds = [],
    bookTitles = [],
    userId = 'guest_user',
    userName = '',
    userEmail = '',
    userPhone = '',
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

    let orderData: any = {};
    try {
      const orderText = await orderResponse.text();
      if (!orderText.trim().startsWith('<')) {
        orderData = JSON.parse(orderText);
      }
    } catch {
      orderData = {};
    }

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
              userId,
              userEmail,
              userName,
              bookIds,
              bookTitles,
              amount: amountInRupees,
            }),
          });

          let verifyData: any = {};
          try {
            const verifyText = await verifyResponse.text();
            if (!verifyText.trim().startsWith('<')) {
              verifyData = JSON.parse(verifyText);
            }
          } catch {
            verifyData = {};
          }

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
        color: '#5e17eb', // BooksCircle theme vibrant purple
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
