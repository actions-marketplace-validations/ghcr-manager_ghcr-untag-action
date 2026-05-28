# Implementation Notes

## Checklist

- [x] Standalone Node action for GHCR untag
- [x] Unit tests for the untag flow and GHCR/GitHub API helpers
- [x] Live GHCR test workflows for one combo and all owner/scenario combos
- [x] User-facing Marketplace README
- [x] Manual release workflow for detached `dist` tags, full-version GitHub Releases, and moving short Git tags
- [ ] Run the release workflow in GitHub and verify the first published release end to end

## Decisions

- Full releases use immutable GitHub Releases on full tags such as `v1.2.3`.
- Short version tags such as `v1` and `v1.2` remain plain Git tags and are moved by the release workflow.
- Release tags are created from a detached commit that contains `dist/`; `main` does not carry built artifacts.
- The release workflow runs lint, tests, build, and the live GHCR all-combinations matrix before publishing tags.
