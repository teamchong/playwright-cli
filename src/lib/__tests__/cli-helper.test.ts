import { describe, it, expect, beforeEach, vi } from '../../__tests__/vitest-compat';

import { parseGlobalOptions, parseShorthand, checkTypos } from '../cli-helper';

describe('cli-helper', () => {
  describe('parseGlobalOptions', () => {
    it('should parse port option', () => {
      const result = parseGlobalOptions(['--port', '3000']);
      expect(result.options.port).toBe(3000);
    });

    it('should parse browser option', () => {
      const result = parseGlobalOptions(['--browser', 'firefox']);
      expect(result.options.browser).toBe('firefox');
    });

    it('should parse boolean flags', () => {
      const result = parseGlobalOptions(['--headless', '--verbose']);
      expect(result.options.headless).toBe(true);
      expect(result.options.verbose).toBe(true);
    });

    it('should handle aliases', () => {
      const result = parseGlobalOptions(['-p', '8080', '-h']);
      expect(result.options.port).toBe(8080);
      expect(result.options.help).toBe(true);
    });
  });

  describe('parseShorthand', () => {
    it('should handle button shorthand', () => {
      const result = parseShorthand(['click', 'button:Login']);
      expect(result).toEqual(['click', 'button:has-text("Login")']);
    });

    it('should handle link shorthand', () => {
      const result = parseShorthand(['click', 'link:Home']);
      expect(result).toEqual(['click', 'a:has-text("Home")']);
    });

    it('should not modify non-shorthand arguments', () => {
      const result = parseShorthand(['click', '#button']);
      expect(result).toEqual(['click', '#button']);
    });
  });

  describe('checkTypos', () => {
    it('should suggest corrections for common typos', () => {
      expect(checkTypos('navigat')).toBe('navigate');
      expect(checkTypos('screenshoot')).toBe('screenshot');
    });

    it('should return null for valid commands', () => {
      expect(checkTypos('navigate')).toBe(null);
      expect(checkTypos('click')).toBe(null);
    });
  });
});
