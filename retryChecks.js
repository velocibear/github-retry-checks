// Checks are named "<workflow> / <group> / <job> (<event>)". A failed job is
// superseded when a job in the same group with "retry" in its name passed.
function splitCheckName(name) {
  const i = name.lastIndexOf(' / ');
  return i === -1 ? null : { group: name.slice(0, i), job: name.slice(i + 3) };
}

// Returns the targetUrls of failed checks a green retry has superseded.
// statusChecks is the array from GitHub's /pull/<n>/page_data/status_checks.
function supersededFailureUrls(statusChecks) {
  const retriedGroups = new Set();
  for (const check of statusChecks) {
    const parts = splitCheckName(check.displayName);
    if (parts && check.state === 'SUCCESS' && /retry/i.test(parts.job)) {
      retriedGroups.add(parts.group);
    }
  }
  return statusChecks
    .filter((check) => {
      const parts = splitCheckName(check.displayName);
      return (
        parts &&
        check.state === 'FAILURE' &&
        !/retry/i.test(parts.job) &&
        retriedGroups.has(parts.group)
      );
    })
    .map((check) => check.targetUrl);
}

// "2 failing, 101 skipped, 158 successful checks" with 1 hidden ->
// "1 failing, 101 skipped, 159 successful checks". Hidden checks count as
// successful so the totals still add up.
function adjustSummary(text, hiddenCount) {
  if (!/\d+ successful/.test(text)) return text;
  return text
    .replace(/(\d+) failing(, )?/, (_, count, sep = '') =>
      count - hiddenCount > 0 ? `${count - hiddenCount} failing${sep}` : ''
    )
    .replace(
      /(\d+) successful/,
      (_, count) => `${+count + hiddenCount} successful`
    );
}

if (typeof module !== 'undefined') {
  module.exports = { supersededFailureUrls, adjustSummary };
}
