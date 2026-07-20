import React from 'react';
import StarRating from '../../src/reviews/StarRating';

export function Small() {
  return <StarRating value={4.3} count={27} size="sm" />;
}

export function Medium() {
  return <StarRating value={5} count={102} size="md" />;
}

export function NoRatingsYet() {
  return <StarRating value={null} count={null} size="sm" />;
}
