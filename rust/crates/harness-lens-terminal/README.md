<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# harness-lens-terminal

Deterministic human and JSON rendering for completed Harness Lens reports.

The crate performs no scanning, terminal detection, process exit, filesystem,
network, provider, or TUI behavior. CLI and future terminal hosts can share its
stable presentation without duplicating analysis rules. GUI clients should
consume report or LSP contracts directly.

## Development

```bash
cargo fmt --all --check
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
```

## License

MPL-2.0. See the owning repository license files.
