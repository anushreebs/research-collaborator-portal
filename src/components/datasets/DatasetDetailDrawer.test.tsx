import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DatasetDetailDrawer } from "./DatasetDetailDrawer";
import type { Study } from "../../types/research";

const study: Study = { id: "BHP-001", title: "Cognitive Performance", description: "Synthetic description", domain: "Cognition", records: 10, updated: "Sep 12, 2026", fields: ["score"], color: "violet", trend: [20, 30] };
const baseProps = { study, role: "researcher" as const, dashboard: { mode: "Synthetic fallback", url: null }, dashboardBusy: false, requestBusy: false, downloading: false, onClose: vi.fn(), onRequest: vi.fn().mockResolvedValue(true), onLoadDashboard: vi.fn(), onDownload: vi.fn() };

describe("dataset detail access request", () => {
  it("validates a real form and submits a reason by keyboard", async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn().mockResolvedValue(true);
    render(<DatasetDetailDrawer {...baseProps} onRequest={onRequest} />);
    await user.click(screen.getByRole("button", { name: "Request dataset access" }));
    const textarea = screen.getByLabelText("How would you use this dataset?");
    await user.type(textarea, "   ");
    expect(screen.getByRole("button", { name: "Submit request" })).toBeDisabled();
    await user.clear(textarea);
    await user.type(textarea, "Compare synthetic cognitive scores.");
    await user.tab();
    await user.keyboard(" ");
    await waitFor(() => expect(onRequest).toHaveBeenCalledWith("Compare synthetic cognitive scores."));
  });

  it("explains a failed submission and returns focus to the invalid field", async () => {
    const user = userEvent.setup();
    render(<DatasetDetailDrawer {...baseProps} onRequest={vi.fn().mockResolvedValue(false)} />);
    await user.click(screen.getByRole("button", { name: "Request dataset access" }));
    const purpose = screen.getByLabelText("How would you use this dataset?");
    await user.type(purpose, "Compare synthetic measures across study periods.");
    await user.click(screen.getByRole("button", { name: "Submit request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't submit this request");
    expect(purpose).toHaveFocus();
    expect(purpose).toHaveAttribute("aria-describedby", "purpose-hint purpose-error");
  });

  it("traps keyboard focus, closes with Escape, and restores focus", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(<DatasetDetailDrawer {...baseProps} onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole("dialog").querySelector(".drawer-top button")).toHaveFocus());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    view.unmount();
    await waitFor(() => expect(trigger).toHaveFocus());
    trigger.remove();
  });
});
