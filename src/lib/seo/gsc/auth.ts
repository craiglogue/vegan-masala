import "server-only";

import { google, type searchconsole_v1 } from "googleapis";

import type { GscConfig } from "./types";

export class GscConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GscConfigError";
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new GscConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizePrivateKey(value: string) {
  // Supports multiline keys supplied with escaped newlines in env vars.
  return value.replace(/\\n/g, "\n").trim();
}

function isValidPropertyUri(uri: string) {
  if (uri.startsWith("sc-domain:")) return true;
  return uri.startsWith("http://") || uri.startsWith("https://");
}

let cachedConfig: GscConfig | null = null;
let cachedClient: searchconsole_v1.Searchconsole | null = null;

export function getGscConfig(): GscConfig {
  if (cachedConfig) return cachedConfig;

  const propertyUri = requireEnv("GSC_PROPERTY_URI");
  const projectId = requireEnv("GSC_GCP_PROJECT_ID");
  const serviceAccountEmail = requireEnv("GSC_SERVICE_ACCOUNT_EMAIL");
  const serviceAccountPrivateKey = normalizePrivateKey(
    requireEnv("GSC_SERVICE_ACCOUNT_PRIVATE_KEY")
  );

  if (!isValidPropertyUri(propertyUri)) {
    throw new GscConfigError(
      "GSC_PROPERTY_URI must start with sc-domain:, https://, or http://"
    );
  }

  cachedConfig = {
    propertyUri,
    projectId,
    serviceAccountEmail,
    serviceAccountPrivateKey,
  };

  return cachedConfig;
}

export function getSearchConsoleClient(): searchconsole_v1.Searchconsole {
  if (cachedClient) return cachedClient;

  const config = getGscConfig();

  const auth = new google.auth.GoogleAuth({
    credentials: {
      project_id: config.projectId,
      client_email: config.serviceAccountEmail,
      private_key: config.serviceAccountPrivateKey,
    },
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  cachedClient = google.searchconsole({
    version: "v1",
    auth,
  });

  return cachedClient;
}

export function resetGscAuthCache() {
  cachedConfig = null;
  cachedClient = null;
}
