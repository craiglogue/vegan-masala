import { NextResponse } from "next/server";
import {
  getMetaAuthDiagnostics,
  getMetaConfig,
  validateMetaConfig,
} from "@/lib/social/publishers/metaCore";

export async function GET() {
  try {
    const config = getMetaConfig();
    const diagnostics = getMetaAuthDiagnostics(config);

    const instagram = validateMetaConfig("instagram", config);
    const facebook = validateMetaConfig("facebook", config);

    const missing = [...new Set([...instagram.missing, ...facebook.missing])];
    const warnings = [...new Set([...instagram.warnings, ...facebook.warnings, ...diagnostics.warnings])];

    return NextResponse.json({
      instagramConfigured: instagram.ok,
      facebookConfigured: facebook.ok,
      missing,
      warnings,
      diagnostics: {
        present: diagnostics.present,
        tokenInfo: diagnostics.tokenInfo,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        instagramConfigured: false,
        facebookConfigured: false,
        missing: [],
        warnings: [],
        error: err?.message || "Meta configuration check failed",
      },
      { status: 500 }
    );
  }
}
