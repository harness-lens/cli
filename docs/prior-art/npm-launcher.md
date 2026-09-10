<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Functional unscoped npm launcher

## Adopted

Use npm's normal `bin` entry and an exact dependency on the existing scoped CLI.
The wrapper imports the existing exported `runCli` function and preserves its
arguments, working directory, streams, and exit status. This gives the unscoped
package a useful function without introducing a second analysis implementation.

Generate package metadata from the owning CLI version and retain the resulting
tarball for review. Exercise real npm local/global installation before publication,
using a temporary registry for the exact unpublished candidate dependency. This
is a deterministic packaging check with an external npm/Core availability
assumption, not a probabilistic quality score.

## Rejected

Do not publish an empty name-reservation package: npm's active-use policy forbids
it. Do not rename/remove the existing scoped package or copy the analysis source
into a new implementation. Do not download and execute a native binary in a
postinstall hook. Do not assume GitHub or scoped npm ownership reserves the bare
package name.

## Assumptions and limits

- The exact scoped CLI version will be available when the bare package is publicly
  installed. Its own dependencies remain governed by its existing manifest.
- npm can hoist the dependency's identically named executable into the local
  `.bin` directory. Tests allow only the two expected entry points and separately
  exercise the wrapper; global installation uses the bare package's shim.
- Local registry simulation verifies retained bytes and installation behavior.
  It does not establish public ownership, trusted publishing, moderation, or
  protected-environment approval.
- Package-specific first-publication controls and a reviewed future inventory
  change remain required before production publication.

## Sources

- [npm package bin behavior](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#bin)
- [npm scopes](https://docs.npmjs.com/about-scopes/)
- [npm name policy](https://docs.npmjs.com/policies/disputes/)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
