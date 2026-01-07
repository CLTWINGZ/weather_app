import { calculateComfort } from './utils';

test('comfort score is between 0 and 100', () => {
  const score = calculateComfort(22, 50, 2);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);
});

test('comfort score decreases for extreme temperatures', () => {
  expect(calculateComfort(0, 50, 2)).toBeLessThan(calculateComfort(22, 50, 2));
});
