export interface VerificatorAvailability {
  id: string;
  startAt: string; // ISO 8601 UTC DateTime string
  endAt: string;   // ISO 8601 UTC DateTime string
}

export interface SaveVerificatorAvailabilityRequest {
  startAt: string; // ISO 8601 DateTime string
  endAt: string;   // ISO 8601 DateTime string
}

export interface AvailabilityRangeQuery {
  from: string; // ISO 8601 DateTime string
  to: string;   // ISO 8601 DateTime string
}

