import type { ErrorRequestHandler } from 'express';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) { super(message); }
}
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) { res.status(error.status).json({ error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } }); return; }
  if (error.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large (maximum 256 KiB).' } }); return; }
  if (error.type === 'entity.parse.failed') { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'The request is not valid JSON.' } }); return; }
  console.error('Unexpected server error:', error.message);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'A server error occurred. Try again.' } });
};
