<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Harness Lens

Run the Harness Lens JavaScript CLI to analyze coding-agent harnesses locally.
This package delegates to an exact version of
[`@harness-lens/cli`](https://www.npmjs.com/package/@harness-lens/cli).
It preserves the CLI's arguments, output, and exit status.

```bash
npm install harness-lens
npx harness-lens scan . --json
```

For a command available throughout your terminal:

```bash
npm install --global harness-lens
harness-lens --help
harness-lens scan . --profile coding-agent/v1
```

Node.js 20 or later is required. No native binary download or install script
runs during installation. This package exposes the existing JavaScript CLI;
the native Rust CLI and its distribution channels are documented in the
[owning repository](https://github.com/harness-lens/cli).

```bash
npm uninstall harness-lens
npm uninstall --global harness-lens
```

Harness Lens is licensed under MPL-2.0. See the included license and copyright.
