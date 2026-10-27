# GitHub Retry Checks

Chrome extension that cleans up the pull request merge box when CI retried a failed job and the retry passed.

Some CI setups retry a job in a separate job when the first attempt fails, for example when a spot VM is preempted. GitHub keeps showing the first attempt as a failing check, and workflows can't change that check's conclusion. This extension hides it in your browser instead.

## Rule

Check names look like `<workflow> / <group> / <job> (<event>)`. A failed check is hidden when a check in the same group with `retry` in its job name passed:

| Check | State | Shown |
|---|---|---|
| `CI / Lint / lint (pull_request)` | failure | hidden |
| `CI / Lint / lint (retry) (pull_request)` | success | yes |

The extension also moves the hidden checks from the failing count to the successful count. If nothing else is failing, it changes the heading to "All checks have passed" and turns the status ring green.

It only changes what you see. Other people, commit status icons, and `gh pr checks` still show the failed check.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and select this folder.

After pulling changes, click the reload icon on the extension's card.

## How it works

`content.js` fetches `/<owner>/<repo>/pull/<n>/page_data/status_checks`, the internal JSON the merge box renders from. It then hides the rows for the failures that `retryChecks.js` marks as superseded. Both the endpoint and the merge box markup are GitHub internals, so a GitHub UI change can break the extension. When that happens, the merge box shows the failed check again.

## Test

```bash
node --test retryChecks.test.js
```
