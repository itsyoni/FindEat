export type KnownIssueStatus =
  | "INVESTIGATING"
  | "IN_PROGRESS"
  | "FIXED_NEXT_RELEASE"
  | "RESOLVED";

export type KnownIssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type KnownIssue = {
  id: string;
  title: string;
  description?: string | null;
  workaround?: string | null;
  status: KnownIssueStatus;
  severity?: KnownIssueSeverity | null;
  platforms: string[];
  affectedAreas: string[];
  reportedAt: string;
  fixedAt?: string | null;
  fixedInVersion?: string | null;
  affectedCount: number;
  updatedAt: string;
};

export type AdminKnownIssue = KnownIssue & {
  isPublic: boolean;
  internalNotes?: string | null;
  createdAt: string;
};

export type KnownIssueInput = {
  title: string;
  description?: string | null;
  workaround?: string | null;
  status: KnownIssueStatus;
  severity?: KnownIssueSeverity | null;
  platforms: string[];
  affectedAreas: string[];
  reportedAt?: string;
  fixedInVersion?: string | null;
  isPublic: boolean;
  internalNotes?: string | null;
};
