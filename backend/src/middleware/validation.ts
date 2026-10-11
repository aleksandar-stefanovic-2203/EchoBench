import { ApiError } from './errors.js';
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isEmail = (value: string) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export class Validator {
  fields: Record<string, string> = {};
  fail(key: string, message: string) { this.fields[key] = message; }
  object(value: unknown, path: string, allowed: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { this.fail(path, 'Expected an object.'); return {}; }
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).some(key => !allowed.includes(key))) this.fail(path, 'The request contains unsupported fields.');
    return obj;
  }
  string(value: unknown, key: string, min: number, max: number, trim = true): string {
    if (typeof value !== 'string') { this.fail(key, 'Enter text.'); return ''; }
    const result = trim ? value.trim() : value;
    if (result.length < min || result.length > max) this.fail(key, `Enter between ${min} and ${max} characters.`);
    return result;
  }
  id(value: unknown, key: string): string { if (typeof value !== 'string' || !uuid.test(value)) this.fail(key, 'The identifier must be a UUID.'); return typeof value === 'string' ? value : ''; }
  email(value: unknown, key: string) { const email = this.string(value, key, 1, 254).toLowerCase(); if (!isEmail(email)) this.fail(key, 'Enter a valid email address.'); return email; }
  done() { if (Object.keys(this.fields).length) throw new ApiError(422, 'VALIDATION_ERROR', 'Check the highlighted fields.', this.fields); }
}
