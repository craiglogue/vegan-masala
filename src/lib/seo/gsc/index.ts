import "server-only";

export { GscConfigError, getGscConfig, getSearchConsoleClient, resetGscAuthCache } from "./auth";
export { getGscPerformanceSnapshot } from "./service";
export type {
  GscComparisonWindow,
  GscConfig,
  GscDateRange,
  GscDevice,
  GscMetricDelta,
  GscPerformanceSnapshotDto,
  GscPropertySummaryDto,
  GscServiceError,
  GscServiceErrorCode,
  GscServiceInput,
  GscServiceResult,
  GscSummaryMetrics,
  GscTopPageDto,
  GscTopQueryDto,
} from "./types";
