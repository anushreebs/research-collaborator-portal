import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("researcher request is approved by admin and researcher downloads the authorized synthetic CSV", async ({
  page,
}) => {
  await page.goto("/datasets");
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Cognitive Performance & Daily Habits/ })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Cognitive Performance & Daily Habits" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Request dataset access" }).click();
  await page
    .getByLabel("How would you use this dataset?")
    .fill("Explore synthetic cognitive trends across assessment periods.");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    /Request pending/i,
  );
  await expect(page.getByRole("dialog").getByRole("status")).toBeFocused();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dataset details" })
    .click();

  await page.getByLabel("Demo role").selectOption("admin");
  await page.getByRole("button", { name: "Review requests" }).click();
  await expect(
    page.getByRole("heading", { name: "Review access requests" }),
  ).toBeVisible();
  const request = page
    .locator("article.request-card")
    .filter({ hasText: "Cognitive Performance & Daily Habits" });
  await expect(request).toContainText(/pending/i);
  await request.getByRole("button", { name: "Approve" }).click();
  await expect(request).toContainText(/approved/i);

  await page.getByLabel("Demo role").selectOption("researcher");
  await page
    .getByRole("button", { name: "Shared researcher requests" })
    .click();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();
  await page.route("**/download/BHP-001", (route) =>
    route.fulfill({ status: 503, body: "Storage unavailable" }),
  );
  await page.getByRole("button", { name: "Download synthetic CSV" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "We couldn't download this file",
  );
  await expect(
    page.getByRole("button", { name: "Download synthetic CSV" }),
  ).toBeEnabled();
  await page.unroute("**/download/BHP-001");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download synthetic CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("BHP-001-synthetic-demo.csv");
  const path = await download.path();
  if (!path) throw new Error("Playwright did not save the downloaded CSV");
  expect(await readFile(path, "utf8")).toContain("SYN-0001");
});

for (const width of [375, 768, 1440]) {
  test(`workspace has no horizontal page overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/datasets?q=sleep&domain=Wellbeing&sort=title");
    await expect(
      page.getByRole("heading", { name: "Dataset catalog" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(dimensions.page).toBeLessThanOrEqual(dimensions.viewport + 1);
    await page
      .getByRole("button", { name: /Sleep & Wellbeing Patterns/ })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    const drawerWidth = await page
      .getByRole("dialog")
      .evaluate((element) => element.getBoundingClientRect().width);
    expect(drawerWidth).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });
}

test("URL filters, dataset selection, Back/Forward, and invalid routes restore", async ({
  page,
}) => {
  await page.goto("/datasets?q=sleep&domain=Wellbeing&sort=title");
  await expect(page.getByLabel("Search datasets")).toHaveValue("sleep");
  await expect(page.getByLabel("Filter research area")).toHaveValue(
    "Wellbeing",
  );
  await page.reload();
  await expect(page.getByLabel("Search datasets")).toHaveValue("sleep");
  await expect(page.getByLabel("Filter research area")).toHaveValue(
    "Wellbeing",
  );
  const datasetCard = page.getByRole("button", {
    name: /Sleep & Wellbeing Patterns/,
  });
  await datasetCard.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  const closeButton = page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dataset details" });
  await expect(closeButton).toBeFocused();
  await page.getByRole("dialog").locator(".drawer-footer button").focus();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(datasetCard).toBeFocused();
  await datasetCard.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/dataset=BHP-002/);
  await page.goBack();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByLabel("Search datasets")).toHaveValue("sleep");
  await page.goForward();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goto("/route-that-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
});

test("failed workspace request has a retry path and does not retain dataset content", async ({
  page,
}) => {
  let failOnce = true;
  await page.route("**/graphql", async (route) => {
    const body = route.request().postDataJSON() as { query?: string };
    if (body.query?.includes("mutation Login")) return route.continue();
    if (failOnce) {
      failOnce = false;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/datasets");
  await expect(page.getByRole("alert")).toContainText(
    "We couldn’t load this workspace",
  );
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toBeVisible();
});

test("expired server session clears protected content and can be recovered", async ({
  page,
}) => {
  let expireWorkspace = false;
  await page.route("**/graphql", async (route) => {
    const body = route.request().postDataJSON() as { query?: string };
    if (expireWorkspace && body.query?.includes("studies {")) {
      expireWorkspace = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [
            {
              message: "Sign in to continue",
              extensions: { code: "UNAUTHENTICATED" },
            },
          ],
        }),
      });
      return;
    }
    await route.continue();
  });
  await page.goto("/datasets");
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toBeVisible();
  expireWorkspace = true;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Your session has expired",
  );
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Cognitive Performance & Daily Habits"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toBeVisible();
});

test("analytics labels its local fallback and exposes an equivalent data table", async ({
  page,
}) => {
  await page.goto("/analytics");
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Synthetic measure trends by study" }),
  ).toBeVisible();
  await expect(
    page.getByRole("table", { name: "Latest synthetic measure by study" }),
  ).toBeVisible();
  await expect(page.locator(".integration-note")).toContainText(
    /local synthetic fallback/i,
  );
  await page.getByRole("button", { name: "Load QuickSight dashboard" }).click();
  await expect(page.locator(".integration-status")).toContainText(
    /local synthetic fallback/i,
  );
});

test("default browser session makes no third-party requests", async ({
  page,
}) => {
  const externalOrigins = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin !== "http://127.0.0.1:5175") externalOrigins.add(url.origin);
  });
  await page.goto("/datasets");
  await expect(
    page.getByRole("heading", { name: "Dataset catalog" }),
  ).toBeVisible();
  expect([...externalOrigins]).toEqual([]);
});
