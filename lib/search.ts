import type { Book } from './types';

/**
 * Tokenized, order-independent fuzzy search engine for books.
 *
 * Implements:
 * 1. Tokenization: Splits search queries and target texts into normalized keyword tokens.
 * 2. Order-Independent Matching: Returns books containing all tokens regardless of word sequence.
 * 3. Relevance Ranking Hierarchy:
 *    - Tier 1: Exact phrase matches (highest priority, score 10,000+)
 *    - Tier 2: All-token matches (score 3,000 - 8,999)
 *    - Tier 3: Partial token matches (score 100 - 2,999)
 * 4. Fuzzy & Case-Insensitive: Levenshtein distance for typo tolerance, accent/diacritic stripping.
 */

export interface TokenMatchResult {
  matched: boolean;
  quality: number; // 0.0 to 1.0
  type: 'exact' | 'prefix' | 'substring' | 'fuzzy' | 'none';
  matchedWord?: string;
  distance?: number;
}

export interface BookSearchScore {
  book: Book;
  score: number;
  matchTier: 'exact_phrase' | 'all_tokens' | 'partial' | 'none';
  matchedTokensCount: number;
  totalTokensCount: number;
  allTokensMatched: boolean;
  allTokensInTitle: boolean;
}

export interface SearchOptions {
  category?: string;
  sortBy?: 'relevance' | 'rating' | 'price_low' | 'price_high' | 'popular' | 'price-asc' | 'price-desc';
  includePartialMatches?: boolean;
  minScore?: number;
}

/**
 * Normalizes text: trims, lowercases, and strips diacritics / accent marks.
 */
export function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Tokenizes text into an array of clean word keywords.
 * Removes punctuation and delimiters while preserving alphanumeric sequences.
 */
export function tokenizeSearchQuery(query: string | null | undefined): string[] {
  if (!query) return [];
  const normalized = normalizeSearchText(query);
  if (!normalized) return [];

  // Split on whitespace, punctuation, brackets, quotes, hyphens, etc.
  const rawTokens = normalized
    .split(/[\s,.;:!?_/\-\(\)\[\]{}'"|~`@$%^&*<>+=#\\]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const uniqueTokens: string[] = [];
  for (const token of rawTokens) {
    if (!seen.has(token)) {
      seen.add(token);
      uniqueTokens.push(token);
    }
  }

  return uniqueTokens;
}

/**
 * Fast Levenshtein distance with early-exit length difference checks.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const lenDiff = Math.abs(a.length - b.length);
  if (lenDiff > 3) return lenDiff;

  const bLen = b.length;
  let prevRow = Array.from({ length: bLen + 1 }, (_, i) => i);
  let currRow = new Array(bLen + 1);

  for (let i = 1; i <= a.length; i++) {
    currRow[0] = i;
    const aChar = a[i - 1];

    for (let j = 1; j <= bLen; j++) {
      const bChar = b[j - 1];
      const cost = aChar === bChar ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,       // deletion
        currRow[j - 1] + 1,   // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[bLen];
}

/**
 * Max allowed edit distance based on token length:
 * - 1-3 chars: 0 (exact, prefix, or substring only)
 * - 4-6 chars: 1 (forgive 1 typo, e.g., 'hary' -> 'harry', 'poter' -> 'potter')
 * - 7+ chars: 2 (forgive up to 2 typos, e.g., 'mathmatics' -> 'mathematics')
 */
export function getMaxAllowedDistance(tokenLength: number): number {
  if (tokenLength <= 3) return 0;
  if (tokenLength <= 6) return 1;
  return 2;
}

/**
 * Checks if a single query token matches a target word.
 */
export function matchTokenAgainstWord(token: string, word: string): TokenMatchResult {
  if (token === word) {
    return { matched: true, quality: 1.0, type: 'exact', matchedWord: word, distance: 0 };
  }

  // Prefix match (e.g., 'pot' matching 'potter', 'bank' matching 'banking')
  if (word.startsWith(token)) {
    const ratio = token.length / word.length;
    return { matched: true, quality: 0.85 + ratio * 0.1, type: 'prefix', matchedWord: word, distance: 0 };
  }

  // Substring match (e.g. 'exam' in 'pre-examination')
  if (word.includes(token)) {
    return { matched: true, quality: 0.72, type: 'substring', matchedWord: word, distance: 0 };
  }

  // Fuzzy match for minor typos
  const maxDistance = getMaxAllowedDistance(token.length);
  if (maxDistance > 0 && Math.abs(token.length - word.length) <= maxDistance) {
    const dist = levenshteinDistance(token, word);
    if (dist <= maxDistance) {
      const quality = Math.max(0.45, 0.68 - dist * 0.18);
      return { matched: true, quality, type: 'fuzzy', matchedWord: word, distance: dist };
    }
  }

  // Also check if word prefix has a fuzzy match (for longer compound words)
  if (maxDistance > 0 && word.length > token.length + 1) {
    const wordPrefix = word.slice(0, token.length);
    const prefixDist = levenshteinDistance(token, wordPrefix);
    if (prefixDist <= (maxDistance === 2 ? 1 : 1)) {
      return { matched: true, quality: 0.52, type: 'fuzzy', matchedWord: word, distance: prefixDist };
    }
  }

  return { matched: false, quality: 0, type: 'none' };
}

/**
 * Finds the best match for a query token across a list of target words.
 */
export function findBestTokenMatch(token: string, words: string[]): TokenMatchResult {
  let bestResult: TokenMatchResult = { matched: false, quality: 0, type: 'none' };

  for (const word of words) {
    const res = matchTokenAgainstWord(token, word);
    if (res.matched) {
      if (res.quality > bestResult.quality) {
        bestResult = res;
        // Perfect match can return immediately
        if (res.quality >= 1.0) break;
      }
    }
  }

  return bestResult;
}

/**
 * Computes search score and ranking tier for a single book.
 */
export function scoreBook(book: Book, query: string): BookSearchScore {
  const normalizedQuery = normalizeSearchText(query);
  const tokens = tokenizeSearchQuery(query);

  if (!normalizedQuery || tokens.length === 0) {
    return {
      book,
      score: 1,
      matchTier: 'none',
      matchedTokensCount: 0,
      totalTokensCount: 0,
      allTokensMatched: true,
      allTokensInTitle: true,
    };
  }

  const normalizedTitle = normalizeSearchText(book.title);
  const normalizedAuthor = normalizeSearchText(book.author);
  const normalizedCategory = normalizeSearchText(book.category);
  const normalizedPublisher = normalizeSearchText(book.publisher || book.publication);
  const normalizedTopics = (book.topics || []).map(normalizeSearchText).join(' ');
  const normalizedTags = (book.tags || []).map(normalizeSearchText).join(' ');
  const normalizedDesc = normalizeSearchText(`${book.seo_description || book.seoDescription || ''} ${book.full_description || book.fullDescription || ''}`);

  // 1. TIER 1: Exact Phrase Matching (Highest Priority: 10,000+)
  if (normalizedTitle === normalizedQuery) {
    return {
      book,
      score: 20000,
      matchTier: 'exact_phrase',
      matchedTokensCount: tokens.length,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: true,
    };
  }

  if (normalizedTitle.startsWith(normalizedQuery)) {
    const score = 16000 + Math.round((normalizedQuery.length / Math.max(1, normalizedTitle.length)) * 1000);
    return {
      book,
      score,
      matchTier: 'exact_phrase',
      matchedTokensCount: tokens.length,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: true,
    };
  }

  if (normalizedTitle.includes(normalizedQuery)) {
    const score = 12000 + Math.round((normalizedQuery.length / Math.max(1, normalizedTitle.length)) * 1000);
    return {
      book,
      score,
      matchTier: 'exact_phrase',
      matchedTokensCount: tokens.length,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: true,
    };
  }

  // Exact phrase match in author
  if (normalizedAuthor && normalizedAuthor.includes(normalizedQuery)) {
    return {
      book,
      score: 10800,
      matchTier: 'exact_phrase',
      matchedTokensCount: tokens.length,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: false,
    };
  }

  // Exact phrase match in category, topics or tags
  if (
    (normalizedCategory && normalizedCategory.includes(normalizedQuery)) ||
    (normalizedTopics && normalizedTopics.includes(normalizedQuery)) ||
    (normalizedTags && normalizedTags.includes(normalizedQuery))
  ) {
    return {
      book,
      score: 10400,
      matchTier: 'exact_phrase',
      matchedTokensCount: tokens.length,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: false,
    };
  }

  // 2. Tokenized & Order-Independent Matching Across Fields
  const titleWords = tokenizeSearchQuery(book.title);
  const authorWords = tokenizeSearchQuery(book.author);
  const categoryWords = tokenizeSearchQuery(book.category);
  const publisherWords = tokenizeSearchQuery(book.publisher || book.publication);
  const topicWords = tokenizeSearchQuery(normalizedTopics);
  const tagWords = tokenizeSearchQuery(normalizedTags);
  const descWords = tokenizeSearchQuery(normalizedDesc);

  let matchedTitleTokens = 0;
  let matchedTotalTokens = 0;
  let titleQualitySum = 0;
  let overallQualitySum = 0;
  const tokenMatchedIndicesInTitle: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    let matchedInBook = false;
    let bestTokenQuality = 0;

    // Check title first (highest weight)
    const titleMatch = findBestTokenMatch(token, titleWords);
    if (titleMatch.matched) {
      matchedTitleTokens++;
      matchedInBook = true;
      titleQualitySum += titleMatch.quality;
      bestTokenQuality = Math.max(bestTokenQuality, titleMatch.quality);

      // Track index in titleWords for order & adjacency bonuses
      if (titleMatch.matchedWord) {
        const idx = titleWords.indexOf(titleMatch.matchedWord);
        if (idx !== -1) tokenMatchedIndicesInTitle.push(idx);
      }
    }

    // Check author
    if (!matchedInBook || bestTokenQuality < 0.9) {
      const authorMatch = findBestTokenMatch(token, authorWords);
      if (authorMatch.matched) {
        matchedInBook = true;
        bestTokenQuality = Math.max(bestTokenQuality, authorMatch.quality * 0.9);
      }
    }

    // Check category / topics / tags
    if (!matchedInBook || bestTokenQuality < 0.85) {
      const catMatch = findBestTokenMatch(token, categoryWords);
      const tagMatch = findBestTokenMatch(token, tagWords);
      const topicMatch = findBestTokenMatch(token, topicWords);
      const bestMetaQuality = Math.max(catMatch.quality, tagMatch.quality, topicMatch.quality);
      if (bestMetaQuality > 0) {
        matchedInBook = true;
        bestTokenQuality = Math.max(bestTokenQuality, bestMetaQuality * 0.85);
      }
    }

    // Check publisher
    if (!matchedInBook || bestTokenQuality < 0.8) {
      const pubMatch = findBestTokenMatch(token, publisherWords);
      if (pubMatch.matched) {
        matchedInBook = true;
        bestTokenQuality = Math.max(bestTokenQuality, pubMatch.quality * 0.8);
      }
    }

    // Check description
    if (!matchedInBook || bestTokenQuality < 0.6) {
      const descMatch = findBestTokenMatch(token, descWords);
      if (descMatch.matched) {
        matchedInBook = true;
        bestTokenQuality = Math.max(bestTokenQuality, descMatch.quality * 0.6);
      }
    }

    if (matchedInBook) {
      matchedTotalTokens++;
      overallQualitySum += bestTokenQuality;
    }
  }

  const allTokensInTitle = matchedTitleTokens === tokens.length;
  const allTokensMatched = matchedTotalTokens === tokens.length;

  // 3. TIER 2: All-Token Matches (Order-Independent: 3,000 - 8,999)
  if (allTokensInTitle) {
    // Base for all tokens matched inside title
    let score = 6500;

    // Quality bonus (exact word matches vs fuzzy matches)
    const avgTitleQuality = titleQualitySum / tokens.length;
    score += Math.round(avgTitleQuality * 700);

    // Compactness bonus: higher score if title is concise and focused
    const compactness = tokens.length / Math.max(tokens.length, titleWords.length);
    score += Math.round(compactness * 800);

    // Relative order bonus: if tokens happen to appear in the same relative order in title
    let inOrder = true;
    for (let k = 1; k < tokenMatchedIndicesInTitle.length; k++) {
      if (tokenMatchedIndicesInTitle[k] < tokenMatchedIndicesInTitle[k - 1]) {
        inOrder = false;
        break;
      }
    }
    if (inOrder && tokenMatchedIndicesInTitle.length > 1) {
      score += 350;
    }

    return {
      book,
      score,
      matchTier: 'all_tokens',
      matchedTokensCount: matchedTitleTokens,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: true,
    };
  }

  if (allTokensMatched) {
    // All tokens matched across title and other metadata fields
    let score = 4200;

    // Weight of title matches
    const titleShare = matchedTitleTokens / tokens.length;
    score += Math.round(titleShare * 1400);

    // Average match quality
    const avgQuality = overallQualitySum / tokens.length;
    score += Math.round(avgQuality * 600);

    return {
      book,
      score,
      matchTier: 'all_tokens',
      matchedTokensCount: matchedTotalTokens,
      totalTokensCount: tokens.length,
      allTokensMatched: true,
      allTokensInTitle: false,
    };
  }

  // 4. TIER 3: Partial Matches (100 - 2,999)
  if (matchedTotalTokens > 0) {
    const matchRatio = matchedTotalTokens / tokens.length;
    let score = Math.round(matchRatio * 1400);

    // Additional credit for title matches
    if (matchedTitleTokens > 0) {
      score += Math.round((matchedTitleTokens / tokens.length) * 800);
      score += Math.round((titleQualitySum / matchedTitleTokens) * 200);
    }

    return {
      book,
      score,
      matchTier: 'partial',
      matchedTokensCount: matchedTotalTokens,
      totalTokensCount: tokens.length,
      allTokensMatched: false,
      allTokensInTitle: false,
    };
  }

  // 5. NO MATCH
  return {
    book,
    score: 0,
    matchTier: 'none',
    matchedTokensCount: 0,
    totalTokensCount: tokens.length,
    allTokensMatched: false,
    allTokensInTitle: false,
  };
}

/**
 * Primary search function for books.
 * Accepts full catalog, search query, and options.
 * Filters and sorts books strictly according to tokenized order-independent relevance.
 */
export function searchBooks(
  books: Book[],
  query: string,
  options: SearchOptions = {}
): Book[] {
  const {
    category = 'all',
    sortBy = 'relevance',
    includePartialMatches = true,
    minScore = 50,
  } = options;

  let list = books;

  // 1. Filter by category if specified
  if (category && category !== 'all') {
    const target = normalizeSearchText(category);
    list = list.filter((b) => {
      const cat = normalizeSearchText(b.category);
      const slug = normalizeSearchText(b.categorySlug);
      return (
        cat === target ||
        slug === target ||
        cat.includes(target) ||
        target.includes(cat) ||
        slug.includes(target) ||
        target.includes(slug)
      );
    });
  }

  const cleanQuery = normalizeSearchText(query);
  if (!cleanQuery) {
    // No query: sort according to requested sort order
    return sortBookList(list, sortBy);
  }

  // 2. Score every candidate book
  const scoredList: BookSearchScore[] = [];

  for (const book of list) {
    const scored = scoreBook(book, cleanQuery);
    if (scored.score >= minScore) {
      if (includePartialMatches || scored.allTokensMatched) {
        scoredList.push(scored);
      }
    }
  }

  // 3. Sort results
  if (sortBy === 'relevance') {
    // Sort primarily by relevance score descending
    scoredList.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tie-breaker 1: Rating
      if ((b.book.rating || 0) !== (a.book.rating || 0)) {
        return (b.book.rating || 0) - (a.book.rating || 0);
      }
      // Tie-breaker 2: Sold count
      return (b.book.sold_count || 0) - (a.book.sold_count || 0);
    });
    return scoredList.map((s) => s.book);
  }

  // If a secondary sort is selected (rating, price, etc.):
  // Keep the relevant books and sort by that attribute
  const resultBooks = scoredList.map((s) => s.book);
  return sortBookList(resultBooks, sortBy, scoredList);
}

/**
 * Helper to sort a list of books by requested criterion
 */
function sortBookList(
  books: Book[],
  sortBy: SearchOptions['sortBy'],
  scoredMap?: BookSearchScore[]
): Book[] {
  const list = [...books];

  switch (sortBy) {
    case 'rating':
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'price_low':
    case 'price-asc':
      list.sort((a, b) => (a.buy_price || 0) - (b.buy_price || 0));
      break;
    case 'price_high':
    case 'price-desc':
      list.sort((a, b) => (b.buy_price || 0) - (a.buy_price || 0));
      break;
    case 'popular':
      list.sort((a, b) => (b.sold_count || b.rating_count || 0) - (a.sold_count || a.rating_count || 0));
      break;
    case 'relevance':
    default:
      if (scoredMap) {
        const scoreLookup = new Map<string, number>();
        scoredMap.forEach((s) => scoreLookup.set(s.book.id, s.score));
        list.sort((a, b) => (scoreLookup.get(b.id) || 0) - (scoreLookup.get(a.id) || 0));
      }
      break;
  }

  return list;
}
