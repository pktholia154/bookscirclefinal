import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Review } from '../types';

export interface AddReviewInput {
  bookId: string;
  rating: number;
  comment: string;
  title?: string;
  userName?: string;
  userAvatar?: string;
  userId?: string;
  verifiedPurchase?: boolean;
}

export interface RatingStats {
  averageRating: number;
  totalCount: number;
  formattedCount: string;
  distribution: {
    stars: number;
    count: number;
    percentage: number;
  }[];
}

const REVIEW_CACHE_PREFIX = 'bookscircle_reviews_cache_';
const VOTED_REVIEWS_KEY = 'bookscircle_voted_reviews';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
  };
  console.warn('Firestore Review Operation Note: ', JSON.stringify(errInfo));
}

/**
 * Reads locally cached reviews for immediate 0ms initial render
 */
export function getCachedReviewsSync(bookId: string): Review[] {
  if (typeof window === 'undefined' || !bookId) return [];
  try {
    const raw = localStorage.getItem(`${REVIEW_CACHE_PREFIX}${bookId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Saves reviews to local storage cache
 */
export function setCachedReviewsSync(bookId: string, reviews: Review[]): void {
  if (typeof window === 'undefined' || !bookId) return;
  try {
    localStorage.setItem(`${REVIEW_CACHE_PREFIX}${bookId}`, JSON.stringify(reviews));
  } catch {}
}

/**
 * Checks if the current browser session has already upvoted this review
 */
export function hasUserVotedHelpful(reviewId: string): boolean {
  if (typeof window === 'undefined' || !reviewId) return false;
  try {
    const raw = localStorage.getItem(VOTED_REVIEWS_KEY);
    const voted = raw ? JSON.parse(raw) : [];
    return Array.isArray(voted) && voted.includes(reviewId);
  } catch {
    return false;
  }
}

/**
 * Records an upvote in local storage
 */
export function markUserVotedHelpful(reviewId: string): void {
  if (typeof window === 'undefined' || !reviewId) return;
  try {
    const raw = localStorage.getItem(VOTED_REVIEWS_KEY);
    const voted: string[] = raw ? JSON.parse(raw) : [];
    if (!voted.includes(reviewId)) {
      voted.push(reviewId);
      localStorage.setItem(VOTED_REVIEWS_KEY, JSON.stringify(voted));
    }
  } catch {}
}

/**
 * Fetches all reviews for a book from Firestore with server API fallback
 */
export async function getReviewsForBook(bookId: string): Promise<Review[]> {
  if (!bookId) return [];

  // Try direct client Firestore SDK first
  try {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, where('bookId', '==', bookId));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const reviews: Review[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          bookId: data.bookId || bookId,
          userId: data.userId || '',
          user: data.userName || data.user || 'Candidate Student',
          userName: data.userName || data.user || 'Candidate Student',
          avatar: data.userAvatar || data.avatar || '',
          userAvatar: data.userAvatar || data.avatar || '',
          rating: Number(data.rating || 5),
          date: data.date || 'Recent',
          comment: data.comment || '',
          title: data.title || '',
          verifiedPurchase: Boolean(data.verifiedPurchase),
          helpfulCount: Number(data.helpfulCount || 0),
          createdAt: data.createdAt || '',
        };
      });

      // Sort by createdAt descending
      reviews.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setCachedReviewsSync(bookId, reviews);
      return reviews;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `reviews(bookId=${bookId})`);
  }

  // Fallback to server REST API endpoint
  try {
    const res = await fetch(`/api/reviews?bookId=${encodeURIComponent(bookId)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        setCachedReviewsSync(bookId, data.reviews);
        return data.reviews;
      }
    }
  } catch {}

  return getCachedReviewsSync(bookId);
}

/**
 * Real-time Firestore subscription to live book reviews
 */
export function subscribeToBookReviews(
  bookId: string,
  callback: (reviews: Review[]) => void
): Unsubscribe {
  if (!bookId) {
    return () => {};
  }

  try {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, where('bookId', '==', bookId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const liveReviews: Review[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          liveReviews.push({
            id: docSnap.id,
            bookId: data.bookId || bookId,
            userId: data.userId || '',
            user: data.userName || data.user || 'Candidate Student',
            userName: data.userName || data.user || 'Candidate Student',
            avatar: data.userAvatar || data.avatar || '',
            userAvatar: data.userAvatar || data.avatar || '',
            rating: Number(data.rating || 5),
            date: data.date || 'Recent',
            comment: data.comment || '',
            title: data.title || '',
            verifiedPurchase: Boolean(data.verifiedPurchase),
            helpfulCount: Number(data.helpfulCount || 0),
            createdAt: data.createdAt || '',
          });
        });

        // Sort descending by creation timestamp
        liveReviews.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setCachedReviewsSync(bookId, liveReviews);
        callback(liveReviews);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `reviews(bookId=${bookId})`);
        // Fallback to polling / cached data
        getReviewsForBook(bookId).then((cached) => {
          if (cached.length > 0) callback(cached);
        });
      }
    );

    return unsubscribe;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `reviews(bookId=${bookId})`);
    return () => {};
  }
}

/**
 * Creates and publishes a new review for a book item
 */
export async function addReviewToBook(input: AddReviewInput): Promise<Review> {
  const {
    bookId,
    rating,
    comment,
    title,
    userName,
    userAvatar,
    userId,
    verifiedPurchase,
  } = input;

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const finalUserName = (userName && userName.trim()) || 'Candidate Student';

  const newReview: Review = {
    id: reviewId,
    bookId,
    userId: userId || auth.currentUser?.uid || undefined,
    user: finalUserName,
    userName: finalUserName,
    avatar: userAvatar || auth.currentUser?.photoURL || undefined,
    userAvatar: userAvatar || auth.currentUser?.photoURL || undefined,
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    comment: comment.trim(),
    title: title ? title.trim() : undefined,
    date: formattedDate,
    createdAt: nowIso,
    verifiedPurchase: Boolean(verifiedPurchase),
    helpfulCount: 0,
  };

  // 1. Optimistic local cache update
  const currentCached = getCachedReviewsSync(bookId);
  const updatedCache = [newReview, ...currentCached];
  setCachedReviewsSync(bookId, updatedCache);

  // 2. Dispatch to server-side Firestore sync endpoint
  try {
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReview),
    }).catch((err) => console.warn('Server review sync note:', err));
  } catch (e) {
    // Non-blocking server dispatch
  }

  // 3. Client-side Firestore SDK write directly to 'bookscircle' database
  try {
    const reviewRef = doc(db, 'reviews', reviewId);
    await setDoc(reviewRef, {
      ...newReview,
      rating: newReview.rating,
      createdAt: nowIso,
    });

    // Also write to subcollection /books/{bookId}/reviews/{reviewId}
    try {
      const subRef = doc(db, 'books', bookId, 'reviews', reviewId);
      await setDoc(subRef, {
        ...newReview,
        rating: newReview.rating,
        createdAt: nowIso,
      });
    } catch {}
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `reviews/${reviewId}`);
  }

  return newReview;
}

/**
 * Upvotes a review's helpfulness
 */
export async function voteReviewHelpful(bookId: string, review: Review): Promise<number> {
  if (hasUserVotedHelpful(review.id)) {
    return review.helpfulCount || 0;
  }

  const newCount = (review.helpfulCount || 0) + 1;
  markUserVotedHelpful(review.id);

  // Optimistically update local cache
  const cached = getCachedReviewsSync(bookId);
  const updated = cached.map((r) => (r.id === review.id ? { ...r, helpfulCount: newCount } : r));
  setCachedReviewsSync(bookId, updated);

  // Dispatch to server API
  try {
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'vote_helpful',
        reviewId: review.id,
        helpfulCount: newCount,
      }),
    }).catch(() => {});
  } catch {}

  // Direct client SDK update
  try {
    const reviewRef = doc(db, 'reviews', review.id);
    await updateDoc(reviewRef, {
      helpfulCount: increment(1),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reviews/${review.id}`);
  }

  return newCount;
}

/**
 * Calculates aggregate rating stats and star distribution percentages
 */
export function computeRatingStats(
  reviews: Review[],
  baseRating: number = 4.8,
  baseCount: number = 120
): RatingStats {
  if (!reviews || reviews.length === 0) {
    const safeBaseRating = Number(baseRating) > 0 ? Number(baseRating) : 4.8;
    const safeBaseCount = Number(baseCount) > 0 ? Number(baseCount) : 120;

    let dist = [
      { stars: 5, percentage: 76, count: Math.round(safeBaseCount * 0.76) },
      { stars: 4, percentage: 18, count: Math.round(safeBaseCount * 0.18) },
      { stars: 3, percentage: 4, count: Math.round(safeBaseCount * 0.04) },
      { stars: 2, percentage: 1, count: Math.round(safeBaseCount * 0.01) },
      { stars: 1, percentage: 1, count: Math.round(safeBaseCount * 0.01) },
    ];

    if (safeBaseRating < 4.5) {
      dist = [
        { stars: 5, percentage: 60, count: Math.round(safeBaseCount * 0.6) },
        { stars: 4, percentage: 26, count: Math.round(safeBaseCount * 0.26) },
        { stars: 3, percentage: 9, count: Math.round(safeBaseCount * 0.09) },
        { stars: 2, percentage: 3, count: Math.round(safeBaseCount * 0.03) },
        { stars: 1, percentage: 2, count: Math.round(safeBaseCount * 0.02) },
      ];
    }

    return {
      averageRating: Number(safeBaseRating.toFixed(1)),
      totalCount: safeBaseCount,
      formattedCount: safeBaseCount >= 1000 ? `${(safeBaseCount / 1000).toFixed(1)}k` : `${safeBaseCount}`,
      distribution: dist,
    };
  }

  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  reviews.forEach((r) => {
    const s = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
    counts[s] = (counts[s] || 0) + 1;
    sum += s;
  });

  const totalReviews = reviews.length;
  const avg = Number((sum / totalReviews).toFixed(1));

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const starCount = counts[stars] || 0;
    const percentage = totalReviews > 0 ? Math.round((starCount / totalReviews) * 100) : 0;
    return {
      stars,
      count: starCount,
      percentage,
    };
  });

  return {
    averageRating: avg,
    totalCount: totalReviews,
    formattedCount: totalReviews >= 1000 ? `${(totalReviews / 1000).toFixed(1)}k` : `${totalReviews}`,
    distribution,
  };
}
