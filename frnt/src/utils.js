export function calculateComfort(temp, humidity, wind) {
  // Example formula: 50% temp, 30% humidity, 20% wind
  const score = 100 - (Math.abs(temp - 22) * 2 + humidity * 0.3 + wind * 5);
  return Math.max(0, Math.min(100, Math.round(score)));
}
