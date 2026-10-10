import { ApiError } from './errors.js';
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export class Validator {
  fields: Record<string, string> = {};
  fail(key: string, message: string) { this.fields[key] = message; }
  object(value: unknown, path: string, allowed: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { this.fail(path, 'Očekivan je objekat.'); return {}; }
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).some(key => !allowed.includes(key))) this.fail(path, 'Zahtev sadrži nedozvoljena polja.');
    return obj;
  }
  string(value: unknown, key: string, min: number, max: number, trim = true): string {
    if (typeof value !== 'string') { this.fail(key, 'Unesite tekst.'); return ''; }
    const result = trim ? value.trim() : value;
    if (result.length < min || result.length > max) this.fail(key, `Unesite od ${min} do ${max} znakova.`);
    return result;
  }
  id(value: unknown, key: string): string { if (typeof value !== 'string' || !uuid.test(value)) this.fail(key, 'Identifikator mora biti UUID.'); return typeof value === 'string' ? value : ''; }
  email(value: unknown, key: string) { const email = this.string(value, key, 1, 254).toLowerCase(); if (!isEmail(email)) this.fail(key, 'Unesite ispravnu mejl adresu.'); return email; }
  done() { if (Object.keys(this.fields).length) throw new ApiError(422, 'VALIDATION_ERROR', 'Proverite označena polja.', this.fields); }
}
