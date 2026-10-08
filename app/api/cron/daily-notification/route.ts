import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_APP_ID = '7e7c93db-4e5d-4fcb-9d6d-ab33a1fe44be';
const DEFAULT_URL = 'https://bookscircle.org/';
const DEFAULT_ICON = 'https://bookscircle.org/booksCircle%20(3).png';
const DEFAULT_BADGE = 'https://bookscircle.org/favicon-32x32.png';

async function dispatchOneSignalDailyNotification(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    // 1. Resolve OneSignal REST API Key
    const authHeader = req.headers.get('authorization') || '';
    let extractedKey = '';
    if (authHeader.startsWith('Key ')) extractedKey = authHeader.replace('Key ', '').trim();
    else if (authHeader.startsWith('Basic ')) extractedKey = authHeader.replace('Basic ', '').trim();
    else if (authHeader.startsWith('Bearer ')) extractedKey = authHeader.replace('Bearer ', '').trim();

    const apiKey =
      body.apiKey ||
      searchParams.get('key') ||
      searchParams.get('apiKey') ||
      req.headers.get('x-onesignal-key') ||
      extractedKey ||
      process.env.ONESIGNAL_REST_API_KEY ||
      '';

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing OneSignal REST API Key.',
          instructions: {
            step1: 'Get your REST API Key from OneSignal Dashboard -> Settings -> Keys & IDs',
            step2: 'In cron-job.org, schedule a daily request at 18:00 IST (12:30 UTC)',
            sampleUrl: `${DEFAULT_URL}api/cron/daily-notification?key=YOUR_REST_API_KEY`,
            headerAlternative: 'Header: Authorization: Key YOUR_REST_API_KEY',
          },
        },
        { status: 400 }
      );
    }

    const appId = body.app_id || searchParams.get('app_id') || process.env.ONESIGNAL_APP_ID || DEFAULT_APP_ID;

    // 2. Build OneSignal Push Notification Payload
    const payload = {
      app_id: appId,
      included_segments: ['Total Subscriptions'],
      headings: { en: 'Books Circle' },
      contents: { en: 'Check out new Books today! 📚' },
      url: DEFAULT_URL,
      chrome_web_icon: DEFAULT_ICON,
      chrome_web_badge: DEFAULT_BADGE,
      firefox_icon: DEFAULT_ICON,
    };

    // 3. Dispatch to OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // If "Key" prefix fails on legacy tokens, attempt "Basic"
      if (response.status === 400 || response.status === 401) {
        const fallbackRes = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          return NextResponse.json({
            success: true,
            scheduledFor: 'Daily at 6:00 PM IST (12:30 UTC)',
            message: 'Daily notification dispatched to all subscribers!',
            result: fallbackData,
          });
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'OneSignal API rejected the request',
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      scheduledFor: 'Daily at 6:00 PM IST (12:30 UTC)',
      message: 'Daily notification dispatched successfully to all subscribers!',
      result: data,
    });
  } catch (err: any) {
    console.error('Daily notification cron error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return dispatchOneSignalDailyNotification(req);
}

export async function POST(req: NextRequest) {
  return dispatchOneSignalDailyNotification(req);
}
