import { getCorsOrigins, validationOptions } from './http.js';

describe('HTTP configuration', () => {
  it('parses and trims explicit CORS origins', () => {
    expect(getCorsOrigins('https://one.example, https://two.example')).toEqual([
      'https://one.example',
      'https://two.example',
    ]);
  });

  it('allows all origins only when explicitly configured', () => {
    expect(getCorsOrigins('*')).toBe(true);
    expect(validationOptions.whitelist).toBe(true);
    expect(validationOptions.forbidNonWhitelisted).toBe(true);
  });
});
