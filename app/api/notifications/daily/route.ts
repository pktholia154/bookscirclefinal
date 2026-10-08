import { NextRequest, NextResponse } from 'next/server';

const ONESIGNAL_APP_ID = '7e7c93db-4e5d-4fcb-9d6d-ab33a1fe44be';

export async function POST(req: NextRequest) {
  try {
    const origin = req.nextUrl.origin || 'https://ais-dev-kix7q2nneqt2lmktmciuv6-513220259814.asia-southeast1.run.app';
    const body = await req.json().catch(() => ({}));
    const apiKey = body.apiKey || process.env.ONESIGNAL_REST_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'ONESIGNAL_REST_API_KEY is required to send push notifications via REST API.',
          help: 'You can generate your REST API Key inside OneSignal Dashboard -> Settings -> Keys & IDs. Alternatively, set up a Daily Recurring Message directly inside OneSignal Dashboard -> Messages -> Automated.',
          appId: ONESIGNAL_APP_ID,
        },
        { status: 400 }
      );
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['Total Subscriptions'],
      headings: { en: 'BooksCircle' },
      contents: { en: 'Check Out New Books!' },
      chrome_web_icon: `${origin}/booksCircle%20(3).png`,
      chrome_web_badge: `${origin}/favicon-32x32.png`,
      firefox_icon: `${origin}/booksCircle%20(3).png`,
      url: origin,
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Daily notification dispatched to all subscribed users',
      data,
    });
  } catch (error: any) {
    console.error('Error dispatching OneSignal notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'configured',
    appId: ONESIGNAL_APP_ID,
    notificationPreview: {
      title: 'BooksCircle',
      body: 'Check Out New Books!',
      icon: '/booksCircle%20(3).png',
    },
    message: 'To send notification via API, send POST with your OneSignal REST API key, or use OneSignal Dashboard automated daily recurring schedule.',
  });
}
