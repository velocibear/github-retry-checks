/* global supersededFailureUrls, adjustSummary -- from retryChecks.js */

let cache = { key: null, hiddenUrls: new Set(), loading: false };

function prBasePath() {
  return location.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/)?.[0];
}

async function load(basePath, key) {
  cache.loading = true;
  let hiddenUrls = new Set();
  try {
    // The same internal endpoint the merge box renders from.
    const res = await fetch(`${basePath}/page_data/status_checks`, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'GitHub-Verified-Fetch': 'true',
      },
    });
    if (res.ok) {
      hiddenUrls = new Set(
        supersededFailureUrls((await res.json()).statusChecks)
      );
    }
  } catch (err) {
    console.warn('[github-retry-checks]', err);
  }
  cache = { key, hiddenUrls, loading: false };
  schedule();
}

// React owns the original element, so rewriting its text would desync it.
// Hide it and show our own copy next to it instead.
function overlayText(el, text) {
  if (!el) return;
  const twin = el.nextElementSibling?.hasAttribute('data-retry-checks')
    ? el.nextElementSibling
    : null;
  if (text === el.textContent) {
    if (el.style.display === 'none') el.style.display = '';
    twin?.remove();
    return;
  }
  if (twin) {
    if (twin.textContent !== text) twin.textContent = text;
  } else {
    const copy = el.cloneNode(false);
    copy.removeAttribute('id');
    copy.setAttribute('data-retry-checks', '');
    copy.textContent = text;
    el.after(copy);
  }
  if (el.style.display !== 'none') el.style.display = 'none';
}

function setHidden(el, hidden) {
  const display = hidden ? 'none' : '';
  if (el && el.style.display !== display) el.style.display = display;
}

function apply() {
  const basePath = prBasePath();
  const section =
    basePath && document.querySelector('section[aria-label="Checks"]');
  if (!section) return;
  const heading = section.querySelector('h3:not([data-retry-checks])');
  const summary = heading?.parentElement.querySelector(
    'p:not([data-retry-checks])'
  );
  if (!summary) return;

  // Refetch whenever GitHub's own summary changes, e.g. when the retry finishes.
  const key = `${basePath}|${summary.textContent}`;
  if (key !== cache.key) {
    if (!cache.loading) load(basePath, key);
    return;
  }

  let hiddenCount = 0;
  for (const link of section.querySelectorAll(
    'li a[data-action="view_check_details"]'
  )) {
    const hidden = cache.hiddenUrls.has(link.getAttribute('href'));
    if (hidden) hiddenCount++;
    setHidden(link.closest('li'), hidden);
  }

  overlayText(summary, adjustSummary(summary.textContent, hiddenCount));

  const failingLabel = [
    ...section.querySelectorAll(
      'button[data-action="collapse_checks_group"] [data-component="text"]'
    ),
  ].find(
    (el) =>
      !el.hasAttribute('data-retry-checks') &&
      /^\d+ failing checks?$/.test(el.textContent)
  );
  const failingCount = failingLabel
    ? parseInt(failingLabel.textContent, 10)
    : 0;
  const remaining = failingCount - hiddenCount;
  if (failingLabel) {
    overlayText(
      failingLabel,
      `${remaining} failing check${remaining === 1 ? '' : 's'}`
    );
    setHidden(
      failingLabel.closest('[class*="groupHeader"]')?.parentElement,
      hiddenCount > 0 && remaining === 0
    );
  }

  const allSuperseded = hiddenCount > 0 && remaining === 0;
  const stillRunning = /in progress|pending|queued|expected/.test(
    summary.textContent
  );
  let headingText = heading.textContent;
  if (allSuperseded) {
    headingText = stillRunning
      ? "Some checks haven't completed yet"
      : 'All checks have passed';
  }
  overlayText(heading, headingText);
  // The status donut draws failures in --fgColor-danger.
  for (const circle of section.querySelectorAll(
    '[class*="iconWrapper"] circle'
  )) {
    const isDanger =
      circle.style.stroke.includes('fgColor-danger') ||
      circle.dataset.retryChecksDanger;
    if (!isDanger) continue;
    circle.dataset.retryChecksDanger = '1';
    const stroke = allSuperseded
      ? 'var(--fgColor-success)'
      : 'var(--fgColor-danger)';
    if (circle.style.stroke !== stroke) circle.style.stroke = stroke;
  }
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    apply();
  });
}

new MutationObserver(schedule).observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});
schedule();
