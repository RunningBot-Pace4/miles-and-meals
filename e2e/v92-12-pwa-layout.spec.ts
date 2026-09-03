import {
  expect,
  test,
} from "@playwright/test";

const widths = [
  320,
  360,
  390,
  430,
  600,
  719,
  720,
  768,
  820,
  1023,
  1024,
  1280,
];

function dashboardMarkup() {
  return `
    <header class="topbar">
      <div class="brand-logo"><span class="brand-logo-mark"></span><strong class="brand-logo-name">Miles & Meals</strong></div>
      <button class="account-trigger"><span class="account-avatar">J</span></button>
    </header>
    <nav class="mobile-nav">
      ${["Home", "Plan", "Add", "Map", "More"].map((label) => `<a class="nav-item${label === "Add" ? " nav-action" : ""}"><span class="nav-icon">•</span><span>${label}</span></a>`).join("")}
    </nav>
    <main class="page-container">
      <div class="dashboard-page">
        <section class="dashboard-welcome">
          <div class="dashboard-welcome-copy">
            <p class="eyebrow">MILES & MEALS</p>
            <h1 class="dashboard-welcome-title"><span class="welcome-editorial">Welcome back, Parent.</span><span class="welcome-tagline">Make every mile, meal & memory count.</span></h1>
          </div>
          <a class="button primary dashboard-add">Add expense</a>
        </section>
        <section class="living-journey-shell mode-spend">
          <div class="living-journey-heading"><div><p class="eyebrow">TRIP COMMAND CENTRE</p><h2>All trips</h2><p>13 Aug 2026 – 16 Aug 2026 · 1 trip ready</p></div><span class="journey-stage"><i></i>Wrapping up</span></div>
          <div class="journey-context-strip">
            <label class="destination-switcher"><span>Trip</span><select><option>View all trips</option></select></label>
            <div class="journey-wallet-summary"><span><small>My share spent</small><strong>RM 177.36</strong></span><span><small>Personal budget</small><strong>RM 500.00</strong></span><div class="journey-wallet-progress"><span style="width:35%"></span></div><small>35% used</small></div>
          </div>
          <div class="living-journey-grid">
            <div class="journey-halo">
              <div class="journey-halo-core"><span>SPEND</span><strong>RM 177.36</strong><small>Tap for meaningful detail</small></div>
              <div class="journey-mode-switcher" role="tablist">${["Move", "Plan", "Spend", "People"].map((label) => `<button class="journey-mode" role="tab" aria-selected="${label === "Spend"}"><b>${label}</b></button>`).join("")}</div>
            </div>
            <div class="journey-panel-stack"><div class="journey-live-panel is-active"><p class="eyebrow">SPEND · TRIP WALLET</p><h3>RM 177.36</h3><p class="journey-live-summary">Group total RM 722.20 · today you shared RM 0.00.</p><p class="journey-live-insight"><span>✦</span> RM 322.64 remains in your personal budget.</p><dl class="journey-metrics"><div><dt>Daily allowance</dt><dd>RM 0.00</dd></div><div><dt>Projected</dt><dd>RM 177.36</dd></div><div><dt>To settle</dt><dd>RM 145.85</dd></div></dl><div class="journey-live-actions"><a class="button journey-primary">Add quick expense</a><a class="button journey-secondary">Review settlement</a></div></div></div>
          </div>
        </section>
        <section class="dashboard-budget-section">
          <div class="travel-section-heading compact"><div><p class="eyebrow">MY TRAVEL WALLET</p><h2>Personal budget</h2></div><a class="panel-link">Edit</a></div>
          <div class="stat-grid dashboard-stats travel-stat-grid"><article class="stat-card travel-stat budget"><span class="travel-stat-icon">◈</span><div><span>My budget</span><strong>RM 1,000.00</strong><small>Your own spending target</small></div></article><article class="stat-card travel-stat spent"><span class="travel-stat-icon">◈</span><div><span>My share spent</span><strong>RM 222.40</strong><small>Your personal share</small></div></article><article class="stat-card travel-stat success"><span class="travel-stat-icon">◈</span><div><span>My remaining</span><strong>RM 777.60</strong><small>Available in your wallet</small></div></article></div>
        </section>
        <section class="dashboard-recent-activity"><div class="travel-section-heading"><div><p class="eyebrow">RECENT ACTIVITY</p><h2>What changed</h2></div><a class="dashboard-section-link">View all</a></div><div class="dashboard-activity-list"><div class="dashboard-activity-row"><span class="dashboard-activity-dot"></span><span class="dashboard-activity-copy"><strong>Parent added expense: Taxi</strong><small>Parent · 2 Sep, 10:24 am</small></span></div></div></section>
        <section class="dashboard-travel-shortcuts"><div class="travel-section-heading"><div><p class="eyebrow">TRAVEL SHORTCUTS</p><h2>Where next?</h2></div><span>Eat · Play · Sleep · Share</span></div><div class="quick-grid travel-quick-grid"><a class="quick-action travel-quick"><span class="quick-action-icon">⌁</span><span><strong>Explore the plan</strong><small>Itinerary, food & places</small></span></a></div></section>
      </div>
    </main>
  `;
}

for (const width of widths) {
  test(`V92.12 dashboard geometry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width,
      height: width >= 600 ? 1180 : 900,
    });
    await page.setContent(dashboardMarkup());
    await page.addStyleTag({
      path: "src/app/globals.css",
    });
    await page.addStyleTag({
      path: "src/app/v92-living-journey.css",
    });

    const geometry = await page.evaluate(() => {
      const rect = (selector: string) =>
        document
          .querySelector(selector)!
          .getBoundingClientRect();
      const activityTitle = rect(
        ".dashboard-recent-activity .travel-section-heading > div",
      );
      const activityAction = rect(
        ".dashboard-section-link",
      );
      const shortcutTitle = rect(
        ".dashboard-travel-shortcuts .travel-section-heading > div",
      );
      const shortcutTagline = rect(
        ".dashboard-travel-shortcuts .travel-section-heading > span",
      );
      const halo = rect(".journey-halo");
      const panel = rect(".journey-panel-stack");
      const welcome = rect(
        ".dashboard-welcome-copy",
      );
      const add = rect(".dashboard-add");
      const budgetHeading = rect(
        ".dashboard-budget-section .travel-section-heading > div",
      );
      const budgetEdit = rect(
        ".dashboard-budget-section .panel-link",
      );
      const budgetGrid = rect(
        ".dashboard-budget-section .travel-stat-grid",
      );
      const budgetCards = [
        ...document.querySelectorAll(
          ".dashboard-budget-section .travel-stat",
        ),
      ].map((element) =>
        element.getBoundingClientRect(),
      );

      return {
        viewport:
          document.documentElement.clientWidth,
        scrollWidth:
          document.documentElement.scrollWidth,
        activitySameRow:
          Math.abs(
            activityTitle.bottom -
              activityAction.bottom,
          ) < 12,
        shortcutSameRow:
          Math.abs(
            shortcutTitle.bottom -
              shortcutTagline.bottom,
          ) < 12,
        panelIsRight: panel.left > halo.left + 40,
        panelIsBelow: panel.top > halo.top + 80,
        welcomeIsLeft: welcome.left < add.left,
        haloWidth: halo.width,
        budgetHeadingSameRow:
          Math.abs(
            budgetHeading.bottom -
              budgetEdit.bottom,
          ) < 12,
        firstBudgetCardIsFeatured:
          budgetCards[0].width >
          budgetGrid.width * 0.9,
        lowerBudgetCardsShareRow:
          Math.abs(
            budgetCards[1].top -
              budgetCards[2].top,
          ) < 2 &&
          budgetCards[2].left >
            budgetCards[1].left,
        allBudgetCardsShareRow:
          Math.abs(
            budgetCards[0].top -
              budgetCards[2].top,
          ) < 2,
      };
    });

    expect(geometry.scrollWidth).toBeLessThanOrEqual(
      geometry.viewport + 1,
    );

    if (width <= 719) {
      expect(geometry.activitySameRow).toBe(true);
      expect(geometry.shortcutSameRow).toBe(true);
      expect(geometry.panelIsBelow).toBe(true);
    }

    if (width <= 640) {
      expect(geometry.budgetHeadingSameRow).toBe(true);

      if (width <= 360) {
        expect(geometry.lowerBudgetCardsShareRow).toBe(false);
      } else {
        expect(geometry.firstBudgetCardIsFeatured).toBe(true);
        expect(geometry.lowerBudgetCardsShareRow).toBe(true);
      }
    }

    if (width >= 641) {
      expect(geometry.allBudgetCardsShareRow).toBe(true);
    }

    if (width >= 720) {
      expect(geometry.panelIsRight).toBe(true);
      expect(geometry.welcomeIsLeft).toBe(true);
    }

    if (width >= 720 && width <= 1023) {
      expect(geometry.haloWidth).toBeLessThanOrEqual(300.5);
    }
  });
}
