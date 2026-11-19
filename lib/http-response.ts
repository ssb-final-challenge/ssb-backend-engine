import type { Response } from "express";

export function success<T>(res: Response, data: T, status = 200, message = "Success") { return res.status(status).json({ success: true, message, data }); }
export function failure(res: Response, status: number, message: string, code = "REQUEST_FAILED") { return res.status(status).json({ success: false, error: { code, message } }); }
export function  errorMessage(error: unknown, fallback: string) { return error instanceof Error ? error.message : fallback; }

export class APIError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
