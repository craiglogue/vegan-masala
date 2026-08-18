export type GscDevice = "DESKTOP" | "MOBILE" | "TABLET";

export type GscDateRange = {
  startDate: string;
  endDate: string;
};

export type GscComparisonWindow = {
  current: GscDateRange;
  previous: GscDateRange;
};

export type GscSummaryMetrics = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscMetricDelta = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  clicksPct: number | null;
  impressionsPct: number | null;
  ctrPct: number | null;
  positionPct: number | null;
};

export type GscTopPageDto = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscTopQueryDto = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscPropertySummaryDto = {
  propertyUri: string;
  generatedAt: string;
  comparisonWindow: GscComparisonWindow;
  current: GscSummaryMetrics;
  previous: GscSummaryMetrics;
  delta: GscMetricDelta;
};

export type GscPerformanceSnapshotDto = {
  summary: GscPropertySummaryDto;
  topPages: GscTopPageDto[];
  topQueries: GscTopQueryDto[];
};

export type GscServiceInput = {
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
  rowLimit?: number;
  country?: string;
  device?: GscDevice;
};

export type GscServiceErrorCode =
  | "config"
  | "auth"
  | "quota"
  | "rate_limited"
  | "api"
  | "unknown";

export type GscServiceError = {
  code: GscServiceErrorCode;
  message: string;
  retryable: boolean;
};

export type GscServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: GscServiceError };

export type GscConfig = {
  propertyUri: string;
  projectId: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey: string;
};

export type GscMetricRow = {
  key?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
