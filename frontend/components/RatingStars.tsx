"use client";
import React from 'react';

interface RatingStarsProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export default function RatingStars({ value, onChange, disabled }: RatingStarsProps) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {stars.map((star) => {
        const filled = value >= star;
        return (
          <span
            key={star}
            style={{ cursor: disabled ? 'default' : 'pointer', fontSize: 20, color: filled ? '#f5b50a' : '#ccc' }}
            onClick={() => {
              if (!disabled) onChange(star);
            }}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}