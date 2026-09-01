> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# Contributing

Run `npm install`, `npm test`, and `npm run check`. Keep domain rules in `@harness-lens/core`; this repository owns argument parsing, terminal rendering, exit codes, and future TUI behavior.

When changing the language placeholders, also run:

```bash
(cd placeholders/go && go test ./...)
cmake -S placeholders/cpp -B /tmp/harness-lens-cpp-build -DBUILD_TESTING=ON
cmake --build /tmp/harness-lens-cpp-build
ctest --test-dir /tmp/harness-lens-cpp-build --output-on-failure
```

## Licensing contributions

Contributions intentionally submitted to this repository are provided under
MPL-2.0. You must have the necessary rights to submit the work. When Covered
Software is distributed, modifications to MPL-covered files remain subject to
the Source Code Form obligations in the license.
