> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# harness-lens-cli

Headless command-line adapter for Harness Lens. It loads `harness-lens.toml`,
runs the Rust SDK scanner, and renders human-readable or JSON reports.

```bash
harness-lens .
harness-lens . --config harness-lens.toml --json
```

The SDK dependency is pinned to an immutable revision of
[`harness-lens/sdk`](https://github.com/harness-lens/sdk). The binary contains no
model-provider or agent-framework dependency.

## License

Early namespace-reservation versions used BSD-3-Clause. The official functional
implementation is licensed under MPL-2.0. See [LICENSING](../LICENSING.md),
[COPYRIGHT](../COPYRIGHT), and [TRADEMARKS](../TRADEMARKS).
