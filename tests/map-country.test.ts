import { describe, expect, test } from 'vitest';
import { mapCountryResponse } from '../src/map-country.js';
import spain from './fixtures/spain.json';

describe('mapCountryResponse', () => {
  test('maps the API string names and array fields into card and detail data', () => {
    expect(mapCountryResponse(spain[0]!)).toEqual({
      name: 'Spain',
      flag: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      population: 47351567,
      languages: ['Spanish'],
      description: 'Spain is in Southern Europe.',
      area: 505992,
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      currencies: ['Euro (EUR)'],
    });
  });

  test('uses explicit fallback values for missing fields', () => {
    expect(mapCountryResponse({})).toEqual({
      name: 'Unknown country',
      flag: '',
      capital: 'Not available',
      region: 'Not available',
      population: null,
      languages: [],
      description: 'No regional description available.',
      area: null,
      borders: [],
      currencies: [],
    });
  });

  test('falls back to the PNG flag or the documented HTTPS flag field', () => {
    expect(
      mapCountryResponse({ flags: { png: 'https://example.com/flag.png' } })
        .flag,
    ).toBe('https://example.com/flag.png');
    expect(
      mapCountryResponse({ flag: 'https://countries.dev/flags/es.svg' }).flag,
    ).toBe('https://countries.dev/flags/es.svg');
  });

  test('does not use emoji or an unsafe URL as an image source', () => {
    expect(mapCountryResponse({ flag: '🇪🇸' }).flag).toBe('');
    expect(mapCountryResponse({ flag: 'javascript:alert(1)' }).flag).toBe('');
  });

  test('preserves zero values but rejects invalid numeric data', () => {
    expect(mapCountryResponse({ population: 0, area: 0 })).toMatchObject({
      population: 0,
      area: 0,
    });
    expect(mapCountryResponse({ population: NaN, area: -1 })).toMatchObject({
      population: null,
      area: null,
    });
  });

  test('skips unnamed languages and handles incomplete currencies', () => {
    expect(
      mapCountryResponse({
        languages: [{}, { name: 'English' }],
        currencies: [{ code: 'EUR' }, { symbol: '€' }],
      }),
    ).toMatchObject({ languages: ['English'], currencies: ['EUR', '€'] });
  });

  test('does not mutate the raw response or reuse its borders array', () => {
    const raw = structuredClone(spain[0]!);
    const before = structuredClone(raw);
    const result = mapCountryResponse(raw);
    result.borders.push('TEST');
    expect(raw).toEqual(before);
  });
});
