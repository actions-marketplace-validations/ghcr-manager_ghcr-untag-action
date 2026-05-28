#!/usr/bin/env bash
set -euo pipefail

full_tag="${1:?missing full tag}"
major_tag="${2:?missing major tag}"
minor_tag="${3:?missing minor tag}"

[[ -f dist/index.js ]] || {
  echo "missing dist/index.js; build the action before creating release tags" >&2
  exit 1
}

git switch --detach HEAD >/dev/null 2>&1
git add --force dist

if git diff --cached --quiet; then
  echo "dist is unchanged; refusing to create a detached release commit without built artifacts" >&2
  exit 1
fi

git commit -m "Release $full_tag" >/dev/null
release_commit="$(git rev-parse HEAD)"

git tag "$full_tag" "$release_commit"
git tag -f "$major_tag" "$release_commit" >/dev/null
git tag -f "$minor_tag" "$release_commit" >/dev/null

printf 'release_commit=%s\n' "$release_commit"
