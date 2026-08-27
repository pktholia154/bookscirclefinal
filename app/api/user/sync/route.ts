import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_API_KEY = "AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk";
const PROJECT_ID = "bookscircle-d579d";

/**
 * Converts a JS object to Firestore REST API formatted fields
 */
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: item.toString() } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: String(item) };
          }),
        },
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

/**
 * Server-side endpoint to guarantee writing user documents to Firestore across both
 * the 'bookscircle' named database and '(default)' database using the Firestore REST API.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, email, displayName, photoURL, providerId, purchasedBooks, role, totalSpent } = body;

    if (!uid) {
      return NextResponse.json({ success: false, error: 'Missing uid' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const userDocData = {
      uid,
      email: email || '',
      displayName: displayName || (email ? email.split('@')[0] : 'Reader'),
      photoURL: photoURL || '',
      providerId: providerId || 'google.com',
      role: role || 'user',
      purchasedBooks: Array.isArray(purchasedBooks) ? purchasedBooks : [],
      purchasesCount: Array.isArray(purchasedBooks) ? purchasedBooks.length : 0,
      totalSpent: typeof totalSpent === 'number' ? totalSpent : 0,
      lastLoginAt: now,
      updatedAt: now,
      createdAt: body.createdAt || now,
    };

    const databases = ['bookscircle', '(default)'];
    const results: Record<string, any> = {};

    for (const dbName of databases) {
      const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents/users/${encodeURIComponent(
        uid
      )}?key=${FIREBASE_API_KEY}`;

      try {
        const firestoreFields = toFirestoreFields(userDocData);
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: firestoreFields }),
        });

        const data = await res.json();
        results[dbName] = { status: res.status, ok: res.ok, data };
      } catch (err: any) {
        results[dbName] = { status: 'error', error: err?.message || String(err) };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User profile synced to Firestore',
      results,
    });
  } catch (error: any) {
    console.error('Server sync user error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync user' },
      { status: 500 }
    );
  }
}
