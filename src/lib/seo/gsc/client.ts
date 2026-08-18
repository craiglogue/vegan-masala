import "server-only";

import { getGscConfig, getSearchConsoleClient } from "./auth";
import type { GscDevice, GscMetricRow, GscSummaryMetrics } from "./types";

type QueryCommonInput = {
  startDate: string;
  endDate: string;
  rowLimit?: number;
  country?: string;
  device?: GscDevice;
};

type QueryDimension = "page" | "query";

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function buildFilterGroups(input: QueryCommonInput) {
  const filters: Array<{ dimension: string; operator: string; expression: string }> = [];

  if (input.country?.trim()) {
    filters.push({
      dimension: "country",
      operator: "equals",
      expression: input.country.trim().toLowerCase(),
    });
  }

  if (input.device?.trim()) {
    filters.push({
      dimension: "device",
      operator: "equals",
      expression: input.device.trim().toUpperCase(),
    });
  }

  if (!filters.length) return undefined;

  return [{ groupType: "and", filters }];
}

export async function querySummaryMetrics(
  input: QueryCommonInput
): Promise<GscSummaryMetrics> {
  const api = getSearchConsoleClient();
  const { propertyUri } = getGscConfig();

  const response = await api.searchanalytics.query({
    siteUrl: propertyUri,
    requestBody: {
      startDate: input.startDate,
      endDate: input.endDate,
      rowLimit: 1,
      dimensionFilterGroups: buildFilterGroups(input),
    },
  });

  const row = response.data.rows?.[0];

  return {
    clicks: toNumber(row?.clicks),
    impressions: toNumber(row?.impressions),
    ctr: toNumber(row?.ctr),
    position: toNumber(row?.position),
  };
}

export async function queryDimensionMetrics(
  dimension: QueryDimension,
  input: QueryCommonInput
): Promise<GscMetricRow[]> {
  const api = getSearchConsoleClient();
  const { propertyUri } = getGscConfig();

  const response = await api.searchanalytics.query({
    siteUrl: propertyUri,
    requestBody: {
      startDate: input.startDate,
      endDate: input.endDate,
      dimensions: [dimension],
      rowLimit: input.rowLimit,
      dimensionFilterGroups: buildFilterGroups(input),
    },
  });

  const rows = response.data.rows ?? [];

  return rows.map((row) => ({
    key: Array.isArray(row.keys) ? row.keys[0] : undefined,
    clicks: toNumber(row.clicks),
    impressions: toNumber(row.impressions),
    ctr: toNumber(row.ctr),
    position: toNumber(row.position),
  }));
}
