export type PlannedFeatureStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMING_SOON"
  | "RELEASED";

export type PlannedFeature = {
  id: string;
  title: string;
  description?: string | null;
  status: PlannedFeatureStatus;
  targetLabel?: string | null;
  publishedAt?: string | null;
  releasedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};
