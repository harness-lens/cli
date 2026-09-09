<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Reconciling interrupted immutable publication

Adopt GitHub's draft/upload/publish lifecycle and its documented whole-job retry
semantics. A retry starts the publisher job again at the original source SHA;
it does not resume at the failed JavaScript function. Treat a matching immutable
release as a verifiable completed operation, including when the publication
response was lost. Read state before deciding whether mutation is needed.

Retain the existing source, workflow/run, manifest digest, asset inventory, and
tag checks. Reject changed or unbound releases, mutable public releases, and
missing evidence. Do not retry writes blindly, delete releases, replace assets,
or move tags. A successful retry of an already-completed publisher performs
zero writes and does not depend on npm version absence.

Assumptions: candidate artifacts and their original run identity remain
available; GitHub reports immutable-release state and uploaded asset digests;
the protected workflow still governs authorization. Unit fault injection
establishes logic under simulated responses, not live service availability or
App permissions. Cross-run and expired-artifact recovery remain separate work.

Sources:

- https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs
- https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases

Local evidence: the existing 15 transaction tests passed before the regression
was added. The new whole-job regression failed with `Existing release is not a
mutable draft`. After repair, the transaction suite passed 40 tests, including
12 interruption scenarios and nine conflicting-state scenarios. See
[the implementation ledger](../release-reliability.md) for subsequent evidence.
