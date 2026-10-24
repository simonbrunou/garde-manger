# Deploy

How a merge reaches production and how to check that it did. The setup itself (build, env vars, volume, scheduled tasks, the manual smoke checklist) lives in [`DEPLOY.md`](../../DEPLOY.md).

## What a merge to `main` sets off

- Every push to `main` on Forgejo starts a Coolify deploy through a webhook. The deploy does not wait for CI, so the CI run on the new `main` head is a separate check.
- A deploy takes about 3 minutes when no other deploy is queued ahead of it. Behind a queue of merges it took up to 13 minutes.

## Check a deploy

Take the new `main` head SHA with `git fetch origin && git rev-parse origin/main`, then run three checks.

1. Run `scripts/coolify-deploy-status.sh <app uuid> <sha>` from `~/Projects/homelab-stacks`. That repo's `docs/operations/05-coolify.md` lists the app uuid. This repo has a public mirror, so prod internals stay there.
   - The last line is the verdict. `OK` means the app's container runs that SHA and is healthy.
   - `PENDING` (exit 3) means the deployment still runs. Run the script again every 15 seconds. A deploy still `PENDING` 15 minutes after the merge counts as failed.
   - `FAIL: image tag <tag> is not <sha>` can mean a newer merge deployed first. Run `git fetch origin` to get that commit, then `git merge-base --is-ancestor <sha> <tag>`. Exit 0 means the newer image contains your SHA, and the deploy counts as live.
   - `/_app/version.json` reports a build timestamp, not the commit, so it cannot show which SHA is live. The script is the only SHA check.
2. Run `curl -s -w '\n%{http_code} %{content_type}\n' https://garde-manger.sbrn.eu/healthz`. It prints `{"status":"ok","db":true}` and `200 application/json`.
3. Read the CI state of the new `main` head with `curl ... "$API/commits/<sha>/status" | jq -r .state`, where `$API` and the token come from [`issue-tracker.md`](issue-tracker.md). It prints `success` once all checks pass. Right after a merge it prints nothing until the first check registers, then `pending`. In both cases read it again every 30 seconds. A state other than `success` 15 minutes after the merge counts as failed.

When a check fails, file an issue labelled `needs-triage` with the `forgejo-issues` skill, and name it in your report to the user.
