import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from "@playwright/test";

const payerEmail =
  process.env.E2E_PAYER_EMAIL;
const payerPassword =
  process.env.E2E_PAYER_PASSWORD;
const receiverEmail =
  process.env.E2E_RECEIVER_EMAIL;
const receiverPassword =
  process.env.E2E_RECEIVER_PASSWORD;
const countryId =
  process.env.E2E_COUNTRY_ID;

async function signIn(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<Page> {
  const page =
    await context.newPage();

  await page.goto("/login");
  await page
    .getByLabel(/email/i)
    .fill(email);
  await page
    .getByLabel(/password/i)
    .fill(password);
  await page
    .getByRole("button", {
      name: /sign in/i,
    })
    .click();
  await page.waitForURL(
    /\/dashboard/,
  );

  return page;
}

test.describe(
  "two-user settlement live flow",
  () => {
    test.skip(
      !payerEmail ||
        !payerPassword ||
        !receiverEmail ||
        !receiverPassword ||
        !countryId,
      "Set E2E_PAYER_EMAIL, E2E_PAYER_PASSWORD, E2E_RECEIVER_EMAIL, E2E_RECEIVER_PASSWORD and E2E_COUNTRY_ID.",
    );

    test(
      "Mark Paid and Confirm Received update in place without page reload",
      async ({ browser }) => {
        const payerContext =
          await browser.newContext();
        const receiverContext =
          await browser.newContext();

        const payerPage =
          await signIn(
            payerContext,
            payerEmail ?? "",
            payerPassword ?? "",
          );
        const receiverPage =
          await signIn(
            receiverContext,
            receiverEmail ?? "",
            receiverPassword ?? "",
          );

        const settlementUrl =
          `/settlements?country=${encodeURIComponent(
            countryId ?? "",
          )}`;

        await Promise.all([
          payerPage.goto(
            settlementUrl,
          ),
          receiverPage.goto(
            settlementUrl,
          ),
        ]);

        const markPaid =
          payerPage.getByRole(
            "button",
            {
              name: "Mark paid",
            },
          );

        if (
          (await markPaid.count()) ===
          0
        ) {
          test.skip(
            true,
            "The selected fixture has no payer-side waiting transfer.",
          );
        }

        const payerUrlBefore =
          payerPage.url();
        let payerNavigations = 0;

        const payerNavigationListener =
          () => {
            payerNavigations += 1;
          };

        payerPage.on(
          "framenavigated",
          payerNavigationListener,
        );

        await markPaid
          .first()
          .click();

        await expect(
          payerPage.getByText(
            /Trip money updates automatically/i,
          ),
        ).toBeVisible();

        await payerPage.waitForTimeout(
          800,
        );

        expect(
          payerPage.url(),
        ).toBe(payerUrlBefore);
        expect(
          payerNavigations,
        ).toBe(0);

        const confirmReceived =
          receiverPage.getByRole(
            "button",
            {
              name:
                "Confirm received",
            },
          );

        await expect(
          confirmReceived.first(),
        ).toBeVisible({
          timeout: 12_000,
        });

        const receiverUrlBefore =
          receiverPage.url();
        let receiverNavigations = 0;

        receiverPage.on(
          "framenavigated",
          () => {
            receiverNavigations += 1;
          },
        );

        await confirmReceived
          .first()
          .click();

        await receiverPage.waitForTimeout(
          800,
        );

        expect(
          receiverPage.url(),
        ).toBe(receiverUrlBefore);
        expect(
          receiverNavigations,
        ).toBe(0);

        await payerContext.close();
        await receiverContext.close();
      },
    );
  },
);
