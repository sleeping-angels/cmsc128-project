# Contributing

See the [README](README.md) for setup.

## Workflow

1. Pick an issue from the GitHub Projects board and assign yourself.
2. Fork the repo and create your branch there, following [Conventional Branches](https://conventional-branch.github.io) (e.g. `feature/web-chat`, `bugfix/status-token`, `chore/ci-cache`).
3. Keep your fork synced with upstream `main`.
4. Commit your changes and push to your fork.
5. Open a pull request to `main` and link the issue (`Closes #123`).
6. Once approved and CI passes, the PR author merges, not the reviewer.
7. Delete the branch after it's merged.

## Commits

- Keep commits small, atomic, and scoped.
- Follow [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint (e.g. `feat(api): add report status endpoint`).

## Updating your branch

Rebase onto `main` instead of merging it:

```sh
git fetch upstream
git rebase upstream/main
git push --force-with-lease
```

Resolve conflicts during the rebase. New to rebasing? See [git-rebase.io](https://git-rebase.io).

## Before opening a PR

```sh
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

CI runs the same checks on every PR.

## Code review

Follow Google's [What to look for in a code review](https://google.github.io/eng-practices/review/reviewer/looking-for.html).
