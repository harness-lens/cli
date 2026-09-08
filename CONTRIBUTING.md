> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# How to contribute

Read the central [ecosystem contribution flow](https://github.com/harness-lens/harness-lens/blob/main/docs/architecture.md#how-to-contribute),
[architecture rules](https://github.com/harness-lens/harness-lens/blob/main/docs/architecture.md#architecture-rules),
and [CI/test map](https://github.com/harness-lens/harness-lens/blob/main/docs/architecture.md#ci-and-test-map).
CLI owns arguments, terminal output, exit behavior, native archives, and package
metadata generation. Domain rules belong in Core. Homebrew formula changes start
in the generator here; read the [distribution guide](docs/distribution.md).

Run:

```bash
npm ci
npm test
npm run check

cd rust
cargo fmt --check
cargo clippy --all-targets --locked -- -D warnings
cargo test --locked
cargo run --locked -- --version
```

When changing the language placeholders, also run:

```bash
cd placeholders/go
go test ./...
cd ../..
cmake -S placeholders/cpp -B /tmp/harness-lens-cpp-build -DBUILD_TESTING=ON
cmake --build /tmp/harness-lens-cpp-build
ctest --test-dir /tmp/harness-lens-cpp-build --output-on-failure
```

## Licensing contributions

Contributions intentionally submitted to this repository are provided under
MPL-2.0. You must have the necessary rights to submit the work. When Covered
Software is distributed, modifications to MPL-covered files remain subject to
the Source Code Form obligations in the license.
