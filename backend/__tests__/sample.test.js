describe('Codecov smoke test', () => {
  it('adds two numbers', () => {
    const add = (a, b) => a + b;
    expect(add(1, 2)).toBe(3);
  });

  it('returns true for a non-empty string', () => {
    const isNonEmpty = (str) => str.length > 0;
    expect(isNonEmpty('hello')).toBe(true);
    expect(isNonEmpty('')).toBe(false);
  });
});