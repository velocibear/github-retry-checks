// Run with: node --test retryChecks.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { supersededFailureUrls, adjustSummary } = require('./retryChecks');

const check = (displayName, state, targetUrl = displayName) => ({
  displayName,
  state,
  targetUrl,
});

test('hides a failed job whose retry in the same group passed', () => {
  const checks = [
    check('CI / Lint / lint (pull_request)', 'FAILURE', '/lint'),
    check('CI / Lint / lint (retry) (pull_request)', 'SUCCESS'),
    check('CI / Lint / result (pull_request)', 'SUCCESS'),
    check('Required review', 'FAILURE'),
  ];
  assert.deepEqual(supersededFailureUrls(checks), ['/lint']);
});

test('keeps failures whose retry failed, was skipped, or is in another group', () => {
  const checks = [
    check('CI / Lint / lint (pull_request)', 'FAILURE'),
    check('CI / Lint / lint (retry) (pull_request)', 'FAILURE'),
    check('CI / Test (1) / test (pull_request)', 'FAILURE'),
    check('CI / Test (1) / test_retry (pull_request)', 'SKIPPED'),
    check('CI / Test (2) / test (pull_request)', 'FAILURE'),
    check('CI / Test (3) / test_retry (pull_request)', 'SUCCESS'),
  ];
  assert.deepEqual(supersededFailureUrls(checks), []);
});

test('adjustSummary moves hidden checks from failing to successful', () => {
  const text = '2 failing, 101 skipped, 158 successful checks';
  assert.equal(
    adjustSummary(text, 1),
    '1 failing, 101 skipped, 159 successful checks'
  );
  assert.equal(adjustSummary(text, 2), '101 skipped, 160 successful checks');
  assert.equal(adjustSummary(text, 0), text);
});
