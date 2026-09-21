"use client";

import { useState } from "react";

/** Read-only stars for displaying a rating (1-10 half-star units). */
export function StarDisplay({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) {
  const dims = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];
  return (
    <div className={`inline-flex ${dims} leading-none`} aria-label={`${rating / 2} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = (i + 1) * 2; // 2, 4, 6, 8, 10
        const fill =
          rating >= starValue ? "full" : rating >= starValue - 1 ? "half" : "empty";
        return <Star key={i} fill={fill} />;
      })}
    </div>
  );
}

function Star({ fill }: { fill: "full" | "half" | "empty" }) {
  if (fill === "empty") {
    return <span style={{ color: "var(--border)" }}>★</span>;
  }
  if (fill === "full") {
    return <span style={{ color: "var(--star)" }}>★</span>;
  }
  return (
    <span className="relative inline-block" style={{ color: "var(--border)" }}>
      ★
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: "50%", color: "var(--star)" }}
      >
        ★
      </span>
    </span>
  );
}

/** Interactive half-star picker for the review form. Value is 1-10 (0 = unset). */
export function StarPicker({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="inline-flex text-3xl leading-none" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: 5 }).map((_, i) => {
          const base = i * 2;
          const leftValue = base + 1; // half star
          const rightValue = base + 2; // full star
          const fill =
            shown >= rightValue ? "full" : shown >= leftValue ? "half" : "empty";
          return (
            <span key={i} className="relative inline-block cursor-pointer select-none">
              <span style={{ color: "var(--border)" }}>★</span>
              {fill !== "empty" && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: fill === "full" ? "100%" : "50%", color: "var(--star)" }}
                >
                  ★
                </span>
              )}
              <button
                type="button"
                aria-label={`${leftValue / 2} stars`}
                className="absolute inset-y-0 left-0 w-1/2"
                onMouseEnter={() => setHover(leftValue)}
                onFocus={() => setHover(leftValue)}
                onClick={() => onChange(leftValue)}
              />
              <button
                type="button"
                aria-label={`${rightValue / 2} stars`}
                className="absolute inset-y-0 right-0 w-1/2"
                onMouseEnter={() => setHover(rightValue)}
                onFocus={() => setHover(rightValue)}
                onClick={() => onChange(rightValue)}
              />
            </span>
          );
        })}
      </div>
      <span className="text-sm text-[var(--muted)] w-10">
        {value > 0 ? (value / 2).toFixed(1) : "–"}
      </span>
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
