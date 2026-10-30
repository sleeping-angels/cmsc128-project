import { describe, expect, it, vi } from 'vitest';
import { barangayKey } from './barangay.service.js';

vi.mock('../config/env.js', () => ({ env: {} }));

describe('barangayKey', () => {
  it.each([
    ['Tacas (Pob.)', 'Tacas'],
    ['Brgy. Tacas', 'Tacas'],
    ['barangay tacas', 'Tacas'],
    ['Poblacion Tacas', 'Tacas'],
    ['oya oy', 'Oya-oy'],
    ['MAT-Y', 'Mat-y'],
    ['Narat-án', 'Narat-an'],
    ['  Kirayan   Norte ', 'Kirayan Norte'],
  ])('matches %j to %j', (input, name) => {
    expect(barangayKey(input)).toBe(barangayKey(name));
  });

  it('keeps distinct barangays apart', () => {
    expect(barangayKey('Kirayan Norte')).not.toBe(barangayKey('Kirayan Sur'));
  });
});
