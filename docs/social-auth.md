# Social Authentication (Meta)

This document covers Instagram and Facebook authentication for Vegan Masala social publishing.

## Current Model

The current system uses manually managed long-lived Meta tokens.
Automatic OAuth refresh is intentionally not implemented yet.

## Required Meta Environment Variables

Core variables:

- `META_ACCESS_TOKEN`
- `META_PAGE_ACCESS_TOKEN` (optional override for Facebook publishing)
- `META_IG_USER_ID`
- `META_PAGE_ID`

Optional future variables:

- `META_APP_ID`
- `META_APP_SECRET`

## Platform Requirements

Instagram publishing requires:

- `META_ACCESS_TOKEN`
- `META_IG_USER_ID`

Facebook publishing requires:

- `META_PAGE_ID`
- One of:
  - `META_PAGE_ACCESS_TOKEN`
  - `META_ACCESS_TOKEN`

Token precedence for Facebook publishing:

1. `META_PAGE_ACCESS_TOKEN`
2. fallback `META_ACCESS_TOKEN`

## Local Configuration

Use `.env.local` as the canonical local source.

Other env files can cause confusion if they contain partial or stale Meta values.
If multiple files exist, keep Meta values synchronized or remove legacy files after explicit review.

## Vercel Configuration

Set Meta environment variables in Vercel Project Settings:

- Production
- Preview (if used for social tests)

After changing token values in Vercel, redeploy or restart runtime so the new values are loaded.

## Diagnostics

Use:

- `GET /api/admin/social/meta-health`

This returns safe diagnostics only:

- whether Instagram config is complete
- whether Facebook config is complete
- missing variable names
- warnings
- token lengths only

The endpoint never returns token contents.

## Common Error Meanings

`META_CONFIG_ERROR: Missing ...`

- Required environment variable is not configured for that publish path.

`Session has expired`

- Token is no longer valid (often expired).

`user logged out`

- Token was invalidated by Meta due to user/account/app state changes.

`missing permissions`

- Token exists but does not have required scopes or page/IG asset access.

## Operational Notes

- Keep one authoritative token set per environment.
- Prefer long-lived page-level credentials for stability.
- Validate `meta-health` before running bulk queue publishing.
