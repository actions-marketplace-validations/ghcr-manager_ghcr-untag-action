# GHCR Untag Action

Remove one or more tags from a GHCR container package by rewriting each target tag to a detached manifest and then
deleting the temporary package version GitHub creates for that rewritten tag.

## Inputs

- `token`: GitHub token with package read/write permissions.
- `owner`: GHCR package owner.
- `package`: GHCR package name.
- `tags`: newline-separated tags to remove.

## Example

```yaml
jobs:
  untag:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - name: Remove tags from GHCR package
        uses: ghcr-manager/ghcr-untag-action@v0.0.0
        with:
          token: ${{ github.token }}
          owner: my-org
          package: my-image
          tags: |
            old-tag
            old-tag-2
```
