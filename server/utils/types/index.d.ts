export type activityStatus = "online" | "offline";
export type healthStatus = "good" | "bad";
export interface pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface generalResponse {
  status: healthStatus;
  connectionActivity: activityStatus;
  statusCode: number;
  message?: string;
}
