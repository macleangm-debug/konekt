import React from "react";

export default function StarRatingInput({ value = 0, onChange }) {
  return (
    <div className="flex gap-2" data-testid="star-rating-input">
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-3xl leading-none transition ${n <= value ? "text-amber-500" : "text-slate-300 hover:text-amber-300"}`}
          aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
          data-testid={`star-${n}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
