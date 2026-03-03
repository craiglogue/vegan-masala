// src/lib/admin/guard.ts
import { NextResponse } from "next/server";

/**
 * Blocks these admin endpoints on Vercel by default.
 * If you *want* to allow it on Vercel, set ADMIN_TOKEN in Vercel env
 * and pass it from the UI (we do that locally only).
 */
export function guardAdmin(req: Request) {
  const isVercel = !!process.env.VERCEL;

  // Local dev: allow
  if (!isVercel) return null;

  // On Vercel: require token
  const token = process.env.ADMIN_TOKEN;
  const header = req.headers.get("x-admin-token") || "";

  if (!token || header !== token) {
    return NextResponse.json(
      { ok: false, error: "Admin endpoints are disabled in production." },
      { status: 403 }
    );
  }

  return null;
}