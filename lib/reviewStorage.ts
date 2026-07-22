export type ReviewItem = {
  name: string;
  role: string;
  quote: string;
};

const STORAGE_KEY = 'yonkes-visitor-reviews';

export function loadVisitorReviews(): ReviewItem[] {
  if (typeof window === 'undefined') return [];

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore malformed data
  }

  return [];
}

export function saveVisitorReviews(reviews: ReviewItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
}
