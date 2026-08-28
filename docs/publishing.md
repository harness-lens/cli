# Publishing

Publish `@harness-lens/core@0.0.1` first. Then publish this package interactively once and configure npm trusted publishing for `.github/workflows/publish.yml`.

```bash
npm login
npm publish --access public --provenance
```

Later releases use GitHub Releases and OIDC. Never commit npm tokens.
