#!/bin/sh
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"

if [ "$(git branch --show-current)" != country-search ]; then
  printf '%s\n' 'Run npm run deploy from the country-search branch.' >&2
  exit 1
fi

directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT

git init --quiet --initial-branch=gh-pages "$directory"
git -C "$directory" config user.name "$(git config user.name)"
git -C "$directory" config user.email "$(git config user.email)"

if git show-ref --verify --quiet refs/heads/gh-pages; then
  git -C "$directory" fetch --quiet "$root" gh-pages
  git -C "$directory" checkout --quiet -B gh-pages FETCH_HEAD
  git -C "$directory" rm --quiet -r --ignore-unmatch .
fi

cp -R dist/. "$directory/"
touch "$directory/.nojekyll"
git -C "$directory" add --all

if ! git -C "$directory" diff --cached --quiet; then
  git -C "$directory" commit --quiet -m 'chore: update GitHub Pages build'
fi

git fetch --quiet "$directory" gh-pages:gh-pages
printf '%s\n' 'Local gh-pages branch is ready. Publish with: git push origin country-search gh-pages'
