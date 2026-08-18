import "server-only";

import { GscConfigError, getGscConfig } from "./auth";
import { queryDimensionMetrics, querySummaryMetrics } from "./client";
import type {
  GscDateRange,
  GscMetricDelta,
  GscPerformanceSnapshotDto,
  GscServiceError,
  GscServiceInput,
  GscServiceResult,
  GscSummaryMetrics,
  GscTopPageDto,
  GscTopQueryDto,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 28;
const DEFAULT_ROW_LIMIT = 10;
const MAX_ROW_LIMIT = 50;

function toIsoDate(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(input: string) {
  const value = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime())) {
    throw new GscConfigError(`Invalid date value: ${input}`);
  }
  return value;
}

function resolveCurrentRange(input: GscServiceInput): GscDateRange {
  if (input.startDate && input.endDate) {
    return {
      startDate: input.startDate,
      endDate: input.endDate,
    };
  }

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end.getTime() - (DEFAULT_DAYS - 1) * DAY_MS);

  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
}

function resolveComparisonRange(input: GscServiceInput, current: GscDateRange): GscDateRange {
  if (input.compareStartDate && input.compareEndDate) {
    return {
      startDate: input.compareStartDate,
      endDate: input.compareEndDate,
    };
  }

  const currentStart = parseIsoDate(current.startDate);
  const currentEnd = parseIsoDate(current.endDate);
  const spanDays = Math.max(1, Math.round((currentEnd.getTime() - currentStart.getTime()) / DAY_MS) + 1);

  const previousEnd = new Date(currentStart.getTime() - DAY_MS);
  const previousStart = new Date(previousEnd.getTime() - (spanDays - 1) * DAY_MS);

  return {
    startDate: toIsoDate(previousStart),
    endDate: toIsoDate(previousEnd),
  };
}

function clampRowLimit(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_ROW_LIMIT;
  return Math.min(MAX_ROW_LIMIT, Math.max(1, Math.round(value)));
}

function pctDelta(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function buildDelta(current: GscSummaryMetrics, previous: GscSummaryMetrics): GscMetricDelta {
  return {
    clicks: current.clicks - previous.clicks,
    impressions: current.impressions - previous.impressions,
    ctr: current.ctr - previous.ctr,
    position: current.position - previous.position,
    clicksPct: pctDelta(current.clicks, previous.clicks),
    impressionsPct: pctDelta(current.impressions, previous.impressions),
    ctrPct: pctDelta(current.ctr, previous.ctr),
    positionPct: pctDelta(current.position, previous.position),
  };
}

function toSafeError(err: unknown): GscServiceError {
  if (err instanceof GscConfigError) {
    return {
      code: "config",
      message: err.message,
      retryable: false,
    };
  }

  const text = String((err as any)?.message || err || "Unknown GSC error");
  const lower = text.toLowerCase();

  if (lower.includes("permission") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return {
      code: "auth",
      message: "Google Search Console authentication failed or property access is missing.",
      retryable: false,
    };
  }

  if (lower.includes("quota")) {
    return {
      code: "quota",
      message: "Google Search Console quota exceeded.",
      retryable: true,
    };
  }

  if (lower.includes("rate") || lower.includes("429")) {
    return {
      code: "rate_limited",
      message: "Google Search Console rate limit reached. Retry shortly.",
      retryable: true,
    };
  }

  if (lower.includes("google") || lower.includes("search console") || lower.includes("api")) {
    return {
      code: "api",
      message: "Google Search Console request failed.",
      retryable: true,
    };
  }

  return {
    code: "unknown",
    message: "Unknown SEO performance service error.",
    retryable: false,
  };
}

export async function getGscPerformanceSnapshot(
  input: GscServiceInput = {}
): Promise<GscServiceResult<GscPerformanceSnapshotDto>> {
  try {
    const config = getGscConfig();
    const current = resolveCurrentRange(input);
    const previous = resolveComparisonRange(input, current);
    const rowLimit = clampRowLimit(input.rowLimit);

    const [currentSummary, previousSummary, pageRows, queryRows] = await Promise.all([
      querySummaryMetrics({
        startDate: current.startDate,
        endDate: current.endDate,
        country: input.country,
        device: input.device,
      }),
      querySummaryMetrics({
        startDate: previous.startDate,
        endDate: previous.endDate,
        country: input.country,
        device: input.device,
      }),
      queryDimensionMetrics("page", {
        startDate: current.startDate,
        endDate: current.endDate,
        rowLimit,
        country: input.country,
        device: input.device,
      }),
      queryDimensionMetrics("query", {
        startDate: current.startDate,
        endDate: current.endDate,
        rowLimit,
        country: input.country,
        device: input.device,
      }),
    ]);

    const topPages: GscTopPageDto[] = pageRows
      .filter((row) => Boolean(row.key))
      .map((row) => ({
        page: row.key as string,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }));

    const topQueries: GscTopQueryDto[] = queryRows
      .filter((row) => Boolean(row.key))
      .map((row) => ({
        query: row.key as string,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      }));

    return {
      ok: true,
      data: {
        summary: {
          propertyUri: config.propertyUri,
          generatedAt: new Date().toISOString(),
          comparisonWindow: {
            current,
            previous,
          },
          current: currentSummary,
          previous: previousSummary,
          delta: buildDelta(currentSummary, previousSummary),
        },
        topPages,
        topQueries,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: toSafeError(err),
    };
  }
}
