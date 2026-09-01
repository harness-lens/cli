> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# Harness Lens for C and C++ (placeholder)

This directory stages the future native package name with a buildable C library
and a header-only C++ facade. It deliberately reports that analysis is not yet
available.

```bash
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build
ctest --test-dir build --output-on-failure
```

With Conan 2 installed, the same source can be validated locally with:

```bash
conan create .
```

This recipe does not reserve the public ConanCenter name. ConanCenter and vcpkg
publication should happen only after this scaffold has moved to a dedicated
repository and contains a useful implementation. `vcpkg.json` stages the same
package spelling for a future vcpkg port; it is project metadata, not a public
registry claim.

## License

This reservation placeholder began under BSD-3-Clause. The official functional
implementation and this scaffold are now licensed under MPL-2.0. See
[LICENSING](LICENSING.md), [COPYRIGHT](COPYRIGHT), and
[TRADEMARKS](TRADEMARKS).
