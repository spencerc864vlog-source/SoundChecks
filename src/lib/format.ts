import { format, formatDistanceToNow, parseISO } from "date-fns";

/** Rating is stored as an integer 1-10, representing half-star units (1 = 0.5 stars). */
export function ratingToStarValue(rating: number) {
  return rating / 2;
}

export function formatRating(rating: number) {
  const value = ratingToStarValue(rating);
  return Number.isInteger(value) ? `${value}.0` : `${value}`;
}

export function formatConcertDate(isoDate: string) {
  return format(parseISO(isoDate), "MMMM d, yyyy");
}

export function formatShortDate(isoDate: string) {
  return format(parseISO(isoDate), "MMM d, yyyy");
}

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
