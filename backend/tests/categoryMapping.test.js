const { categoryForAQI } = require('../services/dataNormalizer');

describe('categoryForAQI (Indian CPCB scale)', () => {
  test('maps Good band (0-50)', () => {
    expect(categoryForAQI(0)).toBe('Good');
    expect(categoryForAQI(50)).toBe('Good');
  });

  test('maps Satisfactory band (51-100)', () => {
    expect(categoryForAQI(51)).toBe('Satisfactory');
    expect(categoryForAQI(100)).toBe('Satisfactory');
  });

  test('maps Moderate band (101-200)', () => {
    expect(categoryForAQI(150)).toBe('Moderate');
  });

  test('maps Poor band (201-300)', () => {
    expect(categoryForAQI(250)).toBe('Poor');
  });

  test('maps Very Poor band (301-400)', () => {
    expect(categoryForAQI(350)).toBe('Very Poor');
  });

  test('maps Severe band (401+)', () => {
    expect(categoryForAQI(450)).toBe('Severe');
    expect(categoryForAQI(999)).toBe('Severe');
  });

  test('returns null for invalid input', () => {
    expect(categoryForAQI(null)).toBeNull();
    expect(categoryForAQI(undefined)).toBeNull();
    expect(categoryForAQI(NaN)).toBeNull();
  });
});
