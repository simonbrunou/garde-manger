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
3. After your own merge, skip this step when the after-merge check in `AGENTS.md` "Merge authority" let you skip the wait for `main`'s CI run. Otherwise read the CI state of the new `main` head with `curl ... "$API/commits/<sha>/status" | jq -r .state`, where `$API` and the token come from [`issue-tracker.md`](issue-tracker.md). It prints `success` once all checks pass. Right after a merge it prints nothing until the first check registers, then `pending`. In both cases read it again every 30 seconds. To see whether each check has started, print its `description` too, with `jq -r '.state, (.statuses[]? | .description)'` on the same call. `Waiting to run` means no runner has taken the job yet. The runner is shared with other repos' jobs: after PR #123's merge on 2026-11-11, `verify` waited 11 min 44 s for it and `e2e` 14 min 4 s. Give the checks 15 minutes from the first read that lists checks and shows none `Waiting to run`. A state other than `success` at the end of those 15 minutes counts as failed, except for a run that a newer push cancelled (below). A check still `Waiting to run` 60 minutes after the merge counts as failed too.
   - A push to `main` while the run is in progress cancels it. Each check that had not finished then reads `failure` with the description `Has been cancelled`, so the state reads `failure` before the 15 minutes end. Whenever the state reads `failure`, print each check that has not passed, with `jq -r '.statuses[]? | select(.status != "success") | "\(.status) \(.description)"'` on the same call. While one of them reads `pending`, read again every 30 seconds. Once none does and every line reads `failure Has been cancelled`, run `git fetch origin`, then `git rev-parse origin/main` and `git merge-base --is-ancestor <sha> origin/main`.
   - When `origin/main` is a different commit and the ancestor check exits 0, a newer push replaced the run. The run on that new head tests a tree that contains `<sha>`. From then on, read the new head as if it were your merge's head, with the same reads. The 15-minute and 60-minute limits restart on the new head. The 15 minutes run from the first read of it that lists checks and shows none `Waiting to run`. The 60 minutes run from its committer date, which `git log -1 --format=%cI <new head>` prints. When that run is cancelled the same way, repeat these steps with the new head as `<sha>`, which moves you on to the newest head. Name the head whose run you read in your verdict and in any issue you file.
   - The run counts as failed in any of these cases: `origin/main` still points at `<sha>`, the ancestor check exits other than 0, or any check failed with a description other than `Has been cancelled`, even beside cancelled ones.

When a check fails, file an issue labelled `needs-triage` with the `forgejo-issues` skill, and name it in your report to the user.

## Measure a deploy's downtime

Each deploy takes the site down while Coolify swaps containers (`DEPLOY.md` §4). A PR that states a downtime figure cannot measure its own deploy before it merges. Measure the figure on the deploy of that merge instead. Start this poll in the background right before you merge, with `<n>` set to the PR number. When the poll disagrees with the figure, correct it in a follow-up PR.

```sh
(ulimit -f 100000; for i in $(seq 1 2400); do printf '%s %s\n' "$(date -u +%H:%M:%S.%1N)" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 https://garde-manger.sbrn.eu/healthz)"; sleep 0.5; done > /tmp/gm-healthz-poll-<n>.log)
```

It stops after 2400 polls, about 24 minutes, and logs times in UTC. Once the deploy check reads `OK`, find the run of lines without `200`. The downtime is at least the time from its first line to its last, and at most the time from the `200` before it to the `200` after it. A `000` line means curl got no answer within 2 s or could not connect. On 2026-11-17, #143 copied its figure from a measurement on an older Coolify, and the poll during its own deploy disagreed, so the figure took a second PR (#144).
