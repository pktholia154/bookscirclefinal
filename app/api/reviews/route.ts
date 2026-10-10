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

function parseFirestoreRestValue(valObj: any): any {
  if (!valObj) return undefined;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    return Array.isArray(valObj.arrayValue?.values)
      ? valObj.arrayValue.values.map(parseFirestoreRestValue)
      : [];
  }
  if ('mapValue' in valObj) {
    const res: Record<string, any> = {};
    const fields = valObj.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreRestValue(v);
    }
    return res;
  }
  return valObj;
}

function parseFirestoreRestDoc(docObj: any): { id: string; [key: string]: any } {
  const fields = docObj.fields || {};
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    res[k] = parseFirestoreRestValue(v);
  }
  const parts = (docObj.name || '').split('/');
  res.id = res.id || parts[parts.length - 1] || '';
  return res as { id: string; [key: string]: any };
}

/**
 * GET /api/reviews?bookId=...
 * Retrieves all approved reviews for a specific book item from Firestore
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ success: false, error: 'bookId is required' }, { status: 400 });
    }

    const databases = ['bookscircle', '(default)'];
    let reviews: any[] = [];

    // Query collection 'reviews'
    for (const dbName of databases) {
      try {
        const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents:runQuery?key=${FIREBASE_API_KEY}`;
        const queryBody = {
          structuredQuery: {
            from: [{ collectionId: 'reviews' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'bookId' },
                op: 'EQUAL',
                value: { stringValue: bookId },
              },
            },
            limit: 100,
          },
        };

        const res = await fetch(queryUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryBody),
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const item of data) {
              if (item.document) {
                const parsed = parseFirestoreRestDoc(item.document);
                reviews.push(parsed);
              }
            }
          }
          if (reviews.length > 0) break;
        }
      } catch {
        // Continue to fallback
      }
    }

    // Sort by createdAt descending
    reviews.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      reviews,
      count: reviews.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reviews
 * Creates a review or updates helpful votes in Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a helpful vote action
    if (body.action === 'vote_helpful') {
      const { reviewId, helpfulCount } = body;
      if (!reviewId) {
        return NextResponse.json({ success: false, error: 'reviewId is required' }, { status: 400 });
      }

      const newCount = typeof helpfulCount === 'number' ? helpfulCount : 1;
      const databases = ['bookscircle', '(default)'];

      for (const dbName of databases) {
        try {
          const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents/reviews/${encodeURIComponent(
            reviewId
          )}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=helpfulCount`;

          await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                helpfulCount: { integerValue: newCount.toString() },
              },
            }),
          });
        } catch {}
      }

      return NextResponse.json({ success: true, helpfulCount: newCount });
    }

    // Standard Review Creation
    const {
      id,
      bookId,
      rating,
      comment,
      title,
      userName,
      userAvatar,
      userId,
      verifiedPurchase,
    } = body;

    if (!bookId) {
      return NextResponse.json({ success: false, error: 'Missing bookId' }, { status: 400 });
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json({ success: false, error: 'Review comment cannot be empty' }, { status: 400 });
    }

    const reviewId = id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const reviewRecord = {
      id: reviewId,
      bookId,
      userId: userId || null,
      userName: (userName && String(userName).trim()) || 'Candidate Student',
      user: (userName && String(userName).trim()) || 'Candidate Student',
      userAvatar: userAvatar || '',
      avatar: userAvatar || '',
      rating: Math.round(numRating),
      comment: comment.trim(),
      title: (title && String(title).trim()) || '',
      date: formattedDate,
      createdAt: nowIso,
      verifiedPurchase: Boolean(verifiedPurchase),
      helpfulCount: 0,
    };

    const firestoreFields = toFirestoreFields(reviewRecord);
    const databases = ['bookscircle', '(default)'];

    // 1. Write review to /reviews/{reviewId} and /books/{bookId}/reviews/{reviewId}
    for (const dbName of databases) {
      try {
        const rootUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents/reviews/${encodeURIComponent(
          reviewId
        )}?key=${FIREBASE_API_KEY}`;

        await fetch(rootUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: firestoreFields }),
        });

        // Also write to subcollection for relational structure
        const subUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents/books/${encodeURIComponent(
          bookId
        )}/reviews/${encodeURIComponent(reviewId)}?key=${FIREBASE_API_KEY}`;

        await fetch(subUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: firestoreFields }),
        });
      } catch (err: any) {
        console.warn(`Error writing review to ${dbName}:`, err?.message || err);
      }
    }

    // 2. Fetch existing book data to dynamically update book's rating and review count
    for (const dbName of databases) {
      try {
        const bookUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${dbName}/documents/books/${encodeURIComponent(
          bookId
        )}?key=${FIREBASE_API_KEY}`;

        const bookRes = await fetch(bookUrl, { cache: 'no-store' });
        if (bookRes.ok) {
          const bookDoc = await bookRes.json();
          const bookData = parseFirestoreRestDoc(bookDoc);

          const currentRating = Number(bookData.rating || bookData.averageRating || 4.8);
          const currentCount = Number(bookData.rating_count || bookData.reviewCount || 100);

          const newCount = currentCount + 1;
          const newRating = Number(((currentRating * currentCount + numRating) / newCount).toFixed(1));

          const patchFields = toFirestoreFields({
            rating: newRating,
            averageRating: newRating,
            rating_count: newCount,
            reviewCount: newCount,
            ratings_count: newCount,
          });

          await fetch(
            `${bookUrl}&updateMask.fieldPaths=rating&updateMask.fieldPaths=averageRating&updateMask.fieldPaths=rating_count&updateMask.fieldPaths=reviewCount&updateMask.fieldPaths=ratings_count`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fields: patchFields }),
            }
          );
        }
      } catch (err: any) {
        console.warn(`Error updating book ratings in ${dbName}:`, err?.message || err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Review saved successfully to Firebase',
      review: reviewRecord,
    });
  } catch (err: any) {
    console.error('Error creating review:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to submit review' },
      { status: 500 }
    );
  }
}
