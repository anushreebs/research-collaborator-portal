import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequestsPage } from "./RequestsPage";
import type { AccessRequest, Study } from "../../types/research";

const study: Study = { id: "BHP-001", title: "Cognitive study", description: "Synthetic", domain: "Cognition", records: 1, updated: "Sep 12, 2026", fields: [], color: "violet", trend: [] };
const request: AccessRequest = { studyId: "BHP-001", purpose: "Study synthetic scores", status: "pending", date: "Sep 28, 2026" };
const shared = { requests: [request], studies: [study], loading: false, decisionBusy: null, downloadingId: null, onNavigate: vi.fn(), onDecide: vi.fn(), onDownload: vi.fn() };

describe("request actions by role", () => {
  it("gives admins approval controls for pending requests", () => {
    render(<RequestsPage {...shared} currentRole="admin" />);
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deny" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
  });

  it("gives researchers status, not decision controls, while pending", () => {
    render(<RequestsPage {...shared} currentRole="researcher" />);
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for administrator review");
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });
});
