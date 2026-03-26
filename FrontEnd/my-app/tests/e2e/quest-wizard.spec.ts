import { expect, test } from "@playwright/test";

test.describe("Quest Creation Wizard", () => {
  test("completes all 7 steps and reaches confirmation", async ({ page }) => {
    await page.goto("/quests/create");

    await expect(page.getByTestId("quest-wizard")).toBeVisible();

    // Step 1: Basics
    await page
      .getByPlaceholder("Ex: Build an Open Source Stellar Explorer")
      .fill("Build Explorer Enhancements");
    await page
      .getByPlaceholder("One-line summary for quest cards")
      .fill("Improve discoverability and filters.");
    await page
      .getByTestId("quest-description-editor")
      .fill("Scope Ship search upgrades and pagination improvements.");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2: Requirements
    await page.getByPlaceholder("Skill 1").fill("React");
    await page
      .getByPlaceholder("What should the contributor submit?")
      .first()
      .fill("Pull request URL");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3: Reward
    await page
      .getByRole("button", { name: "USDC USD Coin Centre / Circle" })
      .click();
    await page.getByLabel("Reward Amount").fill("250");
    await page.getByLabel("XP Reward").fill("120");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4: Timeline
    const tomorrow = new Date(Date.now() + 86400000);
    const dateLocal = tomorrow.toISOString().slice(0, 16);
    await page.getByLabel("Deadline").fill(dateLocal);
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5: Verification
    await page
      .getByRole("button", {
        name: "Manual Review Moderators approve submissions manually.",
      })
      .click();
    await page
      .getByPlaceholder(
        "Explain how submissions are reviewed and what evidence is required.",
      )
      .fill("Reviewer checks scope match and code quality.");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6: Preview and publish
    await expect(page.getByTestId("step-preview")).toBeVisible();
    await page.getByRole("button", { name: "Publish Quest" }).click();

    // Step 7: Confirmation
    await expect(page.getByTestId("step-confirmation")).toBeVisible();
    await expect(page.getByText("Quest created successfully")).toBeVisible();
  });

  test("blocks navigation when required fields are missing", async ({
    page,
  }) => {
    await page.goto("/quests/create");

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Quest title is required.")).toBeVisible();
    await expect(page.getByTestId("step-basics")).toBeVisible();
  });
});
