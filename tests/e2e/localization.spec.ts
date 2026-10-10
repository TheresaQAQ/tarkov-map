import { expect, test } from "@playwright/test";

test("Chinese desktop supports localized quests, map popups, and a persistent English selection", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("application", { name: "海关地图" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await page.getByRole("button", { name: "打开地图图例" }).click();
  await page.getByPlaceholder("搜索撤离点或地点").fill("十字路口");
  await page
    .getByRole("region", { name: "搜索结果" })
    .getByRole("button", { name: /十字路口/ })
    .click();
  await expect(page.locator(".poi-popup-content")).toContainText("十字路口");
  await expect(page.locator(".poi-popup-content")).toContainText("高度");
  await page.getByRole("button", { name: "关闭地图图例" }).first().click();
  await page.getByRole("button", { name: "任务导航" }).click();
  const quests = page.getByRole("dialog", { name: "任务导航" });
  await quests.getByRole("checkbox", { name: "所有地图" }).check();
  await quests.getByPlaceholder("搜索任务、商人或目标").fill("新手上路");
  await expect(quests.locator(".quest-card")).toHaveCount(1);
  await expect(quests).toContainText("Therapist");
  await page.keyboard.press("Escape");

  await page.getByRole("combobox", { name: "语言" }).selectOption("en");
  await expect(page.getByRole("application", { name: "Customs map" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("button", { name: "QUEST NAVIGATOR" }).click();
  await expect(page.locator(".quest-card")).toHaveCount(1);
  await expect(page.locator(".quest-card")).toContainText("First in Line");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Language" })).toHaveValue("en");
});

test("overlay and phone invitation errors expose usable language controls", async ({ page }) => {
  await page.goto("/overlay.html");
  await expect(page.getByRole("combobox", { name: "语言" })).toBeVisible();
  await expect(page.getByRole("button", { name: "隐藏浮窗" })).toBeVisible();
  await page.getByRole("combobox", { name: "语言" }).selectOption("en");
  await expect(page.getByRole("button", { name: "Hide overlay" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/companion.html");
  await expect(page.getByRole("heading", { name: "Invitation cannot be opened" })).toBeVisible();
  await page.getByRole("combobox", { name: "Language" }).selectOption("zh-CN");
  await expect(page.getByRole("heading", { name: "无法打开邀请" })).toBeVisible();
  await expect(page.locator(".companion-gate")).toContainText("房间邀请无效");
});

test("storage events update another open surface", async ({ page, context }) => {
  await page.goto("/");
  const overlay = await context.newPage();
  await overlay.goto("/overlay.html");
  await page.getByRole("combobox", { name: "语言" }).selectOption("en");
  await expect(overlay.getByRole("button", { name: "Hide overlay" })).toBeVisible();
  await expect(overlay.getByRole("combobox", { name: "Language" })).toHaveValue("en");
});

test("connected phone switches language without publishing or changing saved waypoint identifiers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const room = Buffer.alloc(20, 7);
  room.writeUInt32BE(Math.floor(Date.now() / 1000));
  const key = Buffer.alloc(32, 7).toString("base64url");
  const html = await (await page.request.get("/companion.html")).text();
  await page.route("**/lan/*", (route) => route.fulfill({ body: html, contentType: "text/html" }));
  const published: string[] = [];
  await page.routeWebSocket("**/ws", (socket) => socket.onMessage((message) => published.push(String(message))));
  await page.goto(`/lan/${room.toString("base64url")}#${key}`);
  const map = page.getByRole("application", { name: "海关地图" });
  await expect(map).toBeVisible();
  await expect(page.getByRole("button", { name: "任务", exact: true })).toBeVisible();
  await map.focus();
  await page.keyboard.press("Enter");
  const before = await page.evaluate(() => localStorage.getItem("raid-signal-companion-pins"));
  expect(before).toContain("pin-customs-");
  await page.getByRole("combobox", { name: "语言" }).selectOption("en");
  await expect(page.getByRole("application", { name: "Customs map" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("raid-signal-companion-pins"))).toBe(before);
  expect(published).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
