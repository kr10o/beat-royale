// server/src/rating.ts
// Standard Elo rating update (K-factor 32). Returns the two new ratings.
export function elo(ratingA: number, ratingB: number, aWon: boolean): [number, number] {
  const K = 32;
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));
  const scoreA = aWon ? 1 : 0;
  const scoreB = aWon ? 0 : 1;
  return [
    Math.round(ratingA + K * (scoreA - expectedA)),
    Math.round(ratingB + K * (scoreB - expectedB)),
  ];
}
