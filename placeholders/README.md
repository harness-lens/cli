> SPDX-License-Identifier: MPL-2.0
> Copyright © 2026 Cristian Camargo Filho

# Language package placeholders

These directories are buildable staging packages for future Harness Lens
implementations. They protect naming decisions in source control, but they do
not by themselves reserve names in public package indexes.

## Go

Go has no central package-name reservation. A module is identified by the
repository-backed path in `go.mod`. The organization already controls the
`github.com/harness-lens/` prefix; the staged module chooses:

```text
github.com/harness-lens/go
```

Before publishing, create the public `harness-lens/go` repository, move the
contents of [`go/`](go/) to its root, replace the placeholder API with a useful
implementation, and tag a semantic version. Fetching that version through the
public Go proxy makes it discoverable by pkg.go.dev.

The Go package identifier is `harnesslens` because Go identifiers cannot
contain hyphens.

## C and C++

C and C++ have no universal package registry. The staged native package uses a
consistent set of ecosystem-specific names:

- C symbols and C++ namespace: `harness_lens`
- CMake package and target: `harness-lens` and
  `harness-lens::harness-lens`
- Conan recipe name: `harness-lens`
- vcpkg manifest/port name: `harness-lens`

Before publishing, create a dedicated native repository (recommended:
`harness-lens/cpp`), move the contents of [`cpp/`](cpp/) to its root, and ship a
real release. ConanCenter and the curated vcpkg registry accept working package
recipes through reviewed pull requests; they are not name-reservation services
for empty projects. Until the project is mature enough for those registries,
the included Conan recipe can be built locally or uploaded to a project-owned
Conan remote.

## License transition

These reservation placeholders began under BSD-3-Clause. They now follow the
Harness Lens ecosystem's MPL-2.0 licensing policy so that any functional code
derived from them starts under the official license. See the licensing files
inside each placeholder package.
