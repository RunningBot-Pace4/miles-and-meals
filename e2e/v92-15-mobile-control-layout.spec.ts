import { expect, test } from "@playwright/test";

const widths = [320, 360, 390, 430, 600, 719, 768, 1024];

function markup() {
  return `
    <main class="page-container">
      <section class="panel">
        <form class="offline-quick-expense">
          <fieldset class="offline-share-picker">
            <legend>Share cost with</legend>
            <div class="offline-share-shortcuts"><button class="selected">Everyone</button><button>Only me</button></div>
            <div class="offline-share-members">
              <label class="selected"><input class="offline-share-native-control" type="checkbox" checked><span class="offline-share-check">✓</span><span class="offline-share-name">JY</span></label>
              <label class="selected"><input class="offline-share-native-control" type="checkbox" checked><span class="offline-share-check">✓</span><span class="offline-share-name">Juehua · You</span></label>
              <label class="selected"><input class="offline-share-native-control" type="checkbox" checked><span class="offline-share-check">✓</span><span class="offline-share-name">Parent</span></label>
            </div>
          </fieldset>
        </form>
      </section>
      <section class="permissions-list">
        <article class="panel permission-member-card"><div class="permission-member-heading"><strong>JY</strong><small>Trip Owner</small></div><div class="permission-owner-summary"><span>✓</span><div><strong>Full Trip access</strong><small>Owner permissions are always enabled.</small></div></div></article>
        <article class="panel permission-member-card"><div class="permission-member-heading"><strong>Juehua</strong><small>Traveler</small></div><div class="permission-toggle-grid"><label class="permission-option selected"><input class="permission-native-control" type="checkbox" checked><span class="permission-check">✓</span><span class="permission-label">Edit Plan</span></label><label class="permission-option selected"><input class="permission-native-control" type="checkbox" checked><span class="permission-check">✓</span><span class="permission-label">Add expenses</span></label></div></article>
      </section>
      <div class="permission-access-note" role="status"><span class="permission-access-icon">i</span><span class="permission-access-copy"><strong>View only</strong><small>Only the Trip Owner can change traveler permissions.</small></span></div>
      <section class="panel category-budget-manager">
        <div class="category-budget-access can-edit"><span>✓</span><div><strong>Editing enabled</strong><small>Enter a limit and tap Save limit for that category.</small></div></div>
        <div class="category-budget-grid"><article class="category-budget-row"><div><strong>Food</strong><small>MYR 74.00 spent</small></div><div class="category-budget-progress"><span style="width:35%"></span></div><label class="category-budget-limit">Limit<span class="category-budget-money-input"><b>MYR</b><input value="200"></span></label><button class="button secondary category-budget-save">Save limit</button></article></div>
      </section>
    </main>
    <nav class="mobile-nav" data-app-mobile-nav="true"><a class="nav-item active">Home</a><a class="nav-item">Plan</a><a class="nav-item nav-action">Add</a><a class="nav-item">Map</a><a class="nav-item">More</a></nav>
  `;
}

for (const width of widths) {
  test(`V92.15 reported mobile controls at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width <= 430 ? 850 : 1050 });
    await page.setContent(markup());
    await page.addStyleTag({ path: "src/app/globals.css" });
    await page.addStyleTag({ path: "src/app/v92-living-journey.css" });

    const result = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const shareCheck = box(".offline-share-check");
      const shareName = box(".offline-share-name");
      const permissionCheck = box(".permission-check");
      const permissionLabel = box(".permission-label");
      const permissionNotice = box(".permission-access-note");
      const permissionCopy = document.querySelector(".permission-access-copy") as HTMLElement;
      const permissionCopyBox = permissionCopy.getBoundingClientRect();
      const prefix = document.querySelector(".category-budget-money-input b") as HTMLElement;
      const save = box(".category-budget-save");
      const row = box(".category-budget-row");
      return {
        viewport: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        shareCheckWidth: shareCheck.width,
        shareCheckHeight: shareCheck.height,
        shareSeparated: shareName.left >= shareCheck.right + 6,
        permissionCheckWidth: permissionCheck.width,
        permissionSeparated: permissionLabel.left >= permissionCheck.right + 5,
        permissionCopyHasRoom: permissionCopyBox.width >= Math.min(220, permissionNotice.width * 0.62),
        permissionCopyWordBreak: getComputedStyle(permissionCopy).wordBreak,
        prefixFits: prefix.scrollWidth <= prefix.clientWidth + 1,
        saveInside: save.left >= row.left - 1 && save.right <= row.right + 1,
        pageBottomPadding: Number.parseFloat(getComputedStyle(document.querySelector(".page-container")!).paddingBottom),
      };
    });

    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport + 1);
    expect(result.shareCheckWidth).toBeLessThanOrEqual(25);
    expect(result.shareCheckHeight).toBeLessThanOrEqual(25);
    expect(result.shareSeparated).toBe(true);
    expect(result.permissionCheckWidth).toBeLessThanOrEqual(25);
    expect(result.permissionSeparated).toBe(true);
    expect(result.permissionCopyHasRoom).toBe(true);
    expect(result.permissionCopyWordBreak).toBe("normal");
    expect(result.prefixFits).toBe(true);
    expect(result.saveInside).toBe(true);
    if (width <= 719) expect(result.pageBottomPadding).toBeGreaterThanOrEqual(120);
  });
}
