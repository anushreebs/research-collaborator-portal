export type Study = {
  id: string;
  title: string;
  description: string;
  domain: string;
  records: number;
  updated: string;
  fields: string[];
  color: string;
  trend: number[];
};

export type UserRole = "researcher" | "admin";

export type DashboardState = {
  mode: string;
  url: string | null;
};

export type AccessRequest = {
  studyId: string;
  purpose: string;
  status: "pending" | "approved" | "denied";
  date: string;
};
