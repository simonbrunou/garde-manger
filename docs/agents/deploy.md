# Deploy

How a merge reaches production and how to check that it did. The setup itself (env vars, volume, scheduled tasks, the manual smoke checklist) lives in [`DEPLOY.md`](../../DEPLOY.md).

## What a merge to `main` sets off

- Every push to `main` on Forgejo starts a Coolify deploy through a webhook. The deploy does not wait for CI, so the CI run on the new `main` head is a separate check.
- Coolify builds with Railpack, starts the new container and swaps it in once its health check passes. A deploy takes 3 to 4 minutes from the merge.

## Check a deploy

Take the new `main` head SHA with `git fetch origin && git rev-parse origin/main`, then:

1. Run `scripts/coolify-deploy-status.sh <app uuid> <sha>` from `~/Projects/homelab-stacks`. The app uuid sits in that repo's `docs/operations/05-coolify.md`, since this repo has a public mirror and keeps prod internals out. The last line is the verdict. `PENDING` (exit 3) means the deployment still runs, so rerun it every 15 seconds for 10 minutes at most. `OK` means the app's container runs that SHA and is healthy.
2. `curl -s -w '\n%{http_code} %{content_type}\n' https://garde-manger.sbrn.eu/healthz` prints `{"status":"ok","db":true}` and `200 application/json`.
3. The CI run on the new `main` head is green: `curl ... "$API/commits/<sha>/status" | jq -r .state` prints `success`, with `$API` and the token as in [`issue-tracker.md`](issue-tracker.md).

On a `FAIL` verdict, a failed health check or a red CI run, file a Forgejo issue labelled `needs-triage`.

`/_app/version.json` reports a build timestamp, not the commit, so it cannot show which SHA is live. Coolify's application API reports `running:unhealthy` for about 30 seconds after a deploy finishes. The status script reads the container's own health instead.
