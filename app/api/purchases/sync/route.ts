export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

const FIREBASE_API_KEY = "AIzaSyB0unAiOkII7OK44Kx_oaJ6C68ey-javnk";
const PROJECT_ID = "bookscircle-d579d";

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
            if (typeof item === 'object') return { mapValue: { fields: toFirestoreFields(item) } };
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
 * Server-side endpoint to guarantee writing purchase transaction records and user library
 * entitlements to Firestore across both 'bookscircle' and '(default)' databases.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, orderId, userId, userEmail, bookIds, amount, currency, status, items } = body;

    if (!paymentId || !orderId) {
      return NextResponse.json({ success: false, error: 'Missing paymentId or orderId' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const purchaseRecord = {
      orderId,
      paymentId,
      amount: typeof amount === 'number' ? amount : 0,
      currency: currency || 'INR',
      status: status || 'verified',
      purchasedAt: body.purchasedAt || now,
      userId: userId || 'guest_user',
      userEmail: userEmail || '',
      bookIds: Array.isArray(bookIds) ? bookIds : [],
      booksCount: Array.isArray(bookIds) ? bookIds.length : 0,
    };

    const databases = ['bookscircle', '(default)'];
    const results: Record<string, any> = {};

    for (const dbName of databases) {
      const dbBaseUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents`;

      try {
        // 1. Update /users/{userId} and subcollection /users/{userId}/purchases/{paymentId}
        if (userId && userId !== 'guest_user') {
          const userDocUrl = `${dbBaseUrl}/users/${encodeURIComponent(userId)}?key=${FIREBASE_API_KEY}`;
          
          let existingPurchased: string[] = [];
          try {
            const getRes = await fetch(userDocUrl);
            if (getRes.ok) {
              const getJson = await getRes.json();
              const fields = getJson?.fields || {};
              if (fields.purchasedBooks?.arrayValue?.values) {
                existingPurchased = fields.purchasedBooks.arrayValue.values
                  .map((v: any) => v.stringValue)
                  .filter(Boolean);
              }
            }
          } catch (e) {
            // Ignore fetch error, start with empty
          }

          const combinedBooks = Array.from(new Set([...existingPurchased, ...(purchaseRecord.bookIds || [])]));

          const updateFields = ['uid', 'email', 'purchasedBooks', 'purchasesCount', 'lastPurchasedAt', 'lastOrderId', 'lastPaymentId', 'updatedAt'];
          const maskParams = updateFields.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
          const patchUrl = `${userDocUrl}&${maskParams}`;

          await fetch(patchUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: toFirestoreFields({
                uid: userId,
                email: userEmail || '',
                purchasedBooks: combinedBooks,
                purchasesCount: combinedBooks.length,
                lastPurchasedAt: now,
                lastOrderId: orderId,
                lastPaymentId: paymentId,
                updatedAt: now,
              }),
            }),
          });

          // 2. Subcollection record /users/{userId}/purchases/{paymentId}
          const subPurchaseUrl = `${dbBaseUrl}/users/${encodeURIComponent(userId)}/purchases/${encodeURIComponent(
            paymentId
          )}?key=${FIREBASE_API_KEY}`;
          await fetch(subPurchaseUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: toFirestoreFields(purchaseRecord) }),
          });

          // 3. Top-level /user_purchases/{userId}
          const userPurchasesUrl = `${dbBaseUrl}/user_purchases/${encodeURIComponent(userId)}?key=${FIREBASE_API_KEY}`;
          await fetch(userPurchasesUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: toFirestoreFields({
                userId,
                userEmail: userEmail || '',
                purchasedBooks: combinedBooks,
                totalBooksCount: combinedBooks.length,
                totalSpent: purchaseRecord.amount,
                lastPurchasedAt: now,
                lastOrderId: orderId,
                lastPaymentId: paymentId,
                lastUpdated: now,
              }),
            }),
          });

          // 4. Top-level /user_purchases_by_email/{emailKey}
          if (userEmail) {
            const normalizedEmailKey = userEmail.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
            const emailPurchasesUrl = `${dbBaseUrl}/user_purchases_by_email/${encodeURIComponent(normalizedEmailKey)}?key=${FIREBASE_API_KEY}`;
            await fetch(emailPurchasesUrl, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: toFirestoreFields({
                  userEmail,
                  userId,
                  purchasedBooks: combinedBooks,
                  totalBooksCount: combinedBooks.length,
                  totalSpent: purchaseRecord.amount,
                  lastPurchasedAt: now,
                  lastOrderId: orderId,
                  lastPaymentId: paymentId,
                  lastUpdated: now,
                }),
              }),
            });
          }
        }

        // 5. Top-level /purchases/{paymentId}
        const topPurchaseUrl = `${dbBaseUrl}/purchases/${encodeURIComponent(paymentId)}?key=${FIREBASE_API_KEY}`;
        await fetch(topPurchaseUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: toFirestoreFields(purchaseRecord) }),
        });

        // 6. Top-level /orders/{orderId}
        const topOrderUrl = `${dbBaseUrl}/orders/${encodeURIComponent(orderId)}?key=${FIREBASE_API_KEY}`;
        await fetch(topOrderUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: toFirestoreFields({
              orderId,
              paymentId,
              amount,
              currency: currency || 'INR',
              status: status || 'verified',
              purchasedAt: now,
              userId: userId || 'guest_user',
              userEmail: userEmail || '',
              bookIds: purchaseRecord.bookIds,
              updatedAt: now,
            }),
          }),
        });

        // 7. /book_analytics/{bookId}
        if (Array.isArray(bookIds)) {
          for (const bId of bookIds) {
            const analyticsUrl = `${dbBaseUrl}/book_analytics/${encodeURIComponent(bId)}?key=${FIREBASE_API_KEY}`;
            await fetch(analyticsUrl, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: toFirestoreFields({
                  bookId: bId,
                  lastPurchasedAt: now,
                }),
              }),
            });
          }
        }

        results[dbName] = { ok: true };
      } catch (err: any) {
        results[dbName] = { error: err?.message || String(err) };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Purchase synced to Firestore across databases',
      results,
    });
  } catch (error: any) {
    console.error('Server sync purchase error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync purchase' },
      { status: 500 }
    );
  }
}
