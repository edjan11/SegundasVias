import { mapTipoCasamento, mapRegimeBens, normalizeRegimeText } from '../src/ui/payload/apply-payload';
import { describe, it, expect, beforeAll } from 'vitest';

// Mock window object for Node.js environment
beforeAll(() => {
  if (typeof window === 'undefined') {
    (global as any).window = {
      hideApplyLoading: () => {},
      showApplyLoading: () => {},
      updateApplyLoading: () => {},
    };
  }
});

describe('Casamento Mapping Functions', () => {
  describe('mapTipoCasamento', () => {
    it('should map "Civil" text to "2"', () => {
      const result = mapTipoCasamento('Civil');
      expect(result).toBe('2');
    });

    it('should map "Religioso" text to "3"', () => {
      const result = mapTipoCasamento('Religioso');
      expect(result).toBe('3');
    });

    it('should passthrough numeric "2"', () => {
      const result = mapTipoCasamento('2');
      expect(result).toBe('2');
    });

    it('should passthrough numeric "3"', () => {
      const result = mapTipoCasamento('3');
      expect(result).toBe('3');
    });

    it('should handle case-insensitive "civil"', () => {
      const result = mapTipoCasamento('civil');
      expect(result).toBe('2');
    });

    it('should handle case-insensitive "religioso"', () => {
      const result = mapTipoCasamento('religioso');
      expect(result).toBe('3');
    });
  });

  describe('normalizeRegimeText', () => {
    it('should remove accents from "Comunhão parcial de bens"', () => {
      const result = normalizeRegimeText('Comunhão parcial de bens');
      expect(result).toContain('COMUNHAO');
    });

    it('should handle uppercase conversion', () => {
      const result = normalizeRegimeText('comunhão parcial');
      expect(result).toContain('COMUNHAO');
    });

    it('should normalize whitespace', () => {
      const result = normalizeRegimeText('Comunhão   parcial   de   bens');
      expect(result).not.toContain('   ');
    });
  });

  describe('mapRegimeBens', () => {
    it('should map "Comunhão parcial de bens" to "P"', () => {
      const result = mapRegimeBens('Comunhão parcial de bens');
      expect(result).toBe('P');
    });

    it('should map "Comunhão universal" to "U"', () => {
      const result = mapRegimeBens('Comunhão universal');
      expect(result).toBe('U');
    });

    it('should map "Participação nos aquestos" to "A"', () => {
      const result = mapRegimeBens('Participação nos aquestos');
      expect(result).toBe('A');
    });

    it('should map "Separação convencional de bens" to "C"', () => {
      const result = mapRegimeBens('Separação convencional de bens');
      expect(result).toBe('C');
    });

    it('should map "Separação legal de bens" to "L"', () => {
      const result = mapRegimeBens('Separação legal de bens');
      expect(result).toBe('L');
    });

    it('should map "Separação obrigatória de bens" to "B"', () => {
      const result = mapRegimeBens('Separação obrigatória de bens');
      expect(result).toBe('B');
    });

    it('should map "Regime ignorado" to "I"', () => {
      const result = mapRegimeBens('Regime ignorado');
      expect(result).toBe('I');
    });

    it('should handle case-insensitive matching', () => {
      const result = mapRegimeBens('comunhão parcial de bens');
      expect(result).toBe('P');
    });
  });
});
