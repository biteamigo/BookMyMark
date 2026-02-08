import {
  normalizeSearchQuery,
  escapeFtsQuery,
  likePattern,
} from '../searchUtils';

describe('searchUtils', () => {
  describe('normalizeSearchQuery', () => {
    it('returns empty string for null', () => {
      expect(normalizeSearchQuery(null)).toBe('');
    });
    it('returns empty string for undefined', () => {
      expect(normalizeSearchQuery(undefined)).toBe('');
    });
    it('returns empty string for non-string', () => {
      expect(normalizeSearchQuery(123)).toBe('');
    });
    it('returns empty string for empty string', () => {
      expect(normalizeSearchQuery('')).toBe('');
    });
    it('returns empty string for whitespace-only', () => {
      expect(normalizeSearchQuery('   ')).toBe('');
      expect(normalizeSearchQuery('\t\n')).toBe('');
    });
    it('trims leading and trailing whitespace', () => {
      expect(normalizeSearchQuery('  hello  ')).toBe('hello');
    });
    it('collapses internal multiple spaces to one', () => {
      expect(normalizeSearchQuery('a   b   c')).toBe('a b c');
    });
    it('preserves single space between words', () => {
      expect(normalizeSearchQuery('hello world')).toBe('hello world');
    });
  });

  describe('escapeFtsQuery', () => {
    it('returns empty string for empty/falsy input', () => {
      expect(escapeFtsQuery('')).toBe('');
      expect(escapeFtsQuery(null)).toBe('');
    });
    it('appends wildcard for prefix match', () => {
      expect(escapeFtsQuery('test')).toBe('test*');
    });
    it('replaces FTS special characters with space', () => {
      expect(escapeFtsQuery('test:query')).toBe('test query*');
      expect(escapeFtsQuery('test"quote')).toBe('test quote*');
      expect(escapeFtsQuery('test*star')).toBe('test star*');
    });
    it('trims before escaping', () => {
      expect(escapeFtsQuery('  ab  ')).toBe('ab*');
    });
  });

  describe('likePattern', () => {
    it('returns % for empty/falsy input', () => {
      expect(likePattern('')).toBe('%');
      expect(likePattern(null)).toBe('%');
    });
    it('wraps query in % for substring match', () => {
      expect(likePattern('test')).toBe('%test%');
    });
    it('trims input', () => {
      expect(likePattern('  x  ')).toBe('%x%');
    });
  });
});
