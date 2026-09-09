<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# Release reliability implementation and handoff

Updated: 2026-09-09. Owner: `harness-lens/cli`.

## Current phase

Phase 2: require the complete asset inventory and qualify installed native,
npm, and Homebrew candidates through ordinary PR CI. Phase 1 is merged in
[PR 39](https://github.com/harness-lens/cli/pull/39). No production release is authorized by
this implementation checkpoint. Existing immutable versions remain unchanged.

Base: `55d1689504be4d630be1fe6b1da5c3a75fa0e49a`.
Branch: `fix/release-candidate-qualification`.
Working checkout: `/tmp/harness-lens-cli-recovery.yanc9H`.
The hub checkout and all pre-existing dirty work remain untouched.

## Completion ledger

A checked item means its stated deliverable has recorded evidence. Local tests,
GitHub CI, merged deployment, and production acceptance are distinct states.
Do not infer deployment from a passing unit test or PR.

- [x] 1. Inspect live source, CI, release state, and configuration metadata.
  Base CI: https://github.com/harness-lens/cli/actions/runs/34384877273.
  Sandbox secrets count and tag bypass actors are both zero. Production
  `v0.0.5` is immutable; tap PR 3 is open with both architecture checks failing.
- [x] 2. Create an isolated CLI branch and preserve existing dirty work.
- [x] 3. Repair whole-job retry after successful publication (PR 39 merged;
  live sandbox acceptance remains pending).
- [x] 4. Add interruption tests for creation, each upload, publication, and verification
  (12 simulated interruption cases and nine conflicting-state cases pass).
- [ ] 5. Enforce required asset inventory, digests, source identity, and provenance.
  Independent inventory and CLI rejection coverage implemented in Phase 2;
  cryptographic attestation verification remains separate work.
- [ ] 6. Test installation and functionality of native, npm, and Homebrew packages.
  Linux native and npm checks pass locally; four native CI targets and both
  Homebrew architectures are wired into PR checks and release preparation.
- [ ] 7. Build and smoke-test both container architectures before publication.
- [ ] 8. Unify pinned tools across CI and release qualification.
  Rust checks/builds now share 1.85.1; native qualification and release npm
  construction share Node 24.18.0. Remaining tool pins are not yet unified.
- [ ] 9. Normalize archives and compare independent clean-build payload digests.
- [ ] 10. Share candidate construction between PR checks and release preparation.
  Native and npm construction use shared composite actions. Complete assembly
  and containers remain separate work.
- [ ] 11. Reconcile existing destination artifacts before writing.
- [ ] 12. Represent Homebrew review as pending while preserving the merge gate.
- [ ] 13. Implement protected recovery from verified immutable assets.
- [ ] 14. Add configuration checks and sandbox rehearsal cases.
- [ ] 15. Run owner checks and native platform CI on the final commit.
- [ ] 16. Prepare focused commits/PRs, monitor checks, and fix failures.
- [ ] 17. Update runbook, incident evidence, and prior-art notes.
- [ ] 18. After owner PRs merge, update hub pins and composition documentation.

## Empirical acceptance

- Record command, source revision, tool versions, scenario count, and results.
- Recovery tests count draft creations, each asset upload, publication requests,
  and writes after successful publication. Expected: one creation, one accepted
  upload per asset, one accepted publication, zero writes on completed retries.
- Reject missing assets, changed digests, wrong provenance/tag, mutable public
  releases, and missing evidence before any further writes.
- Exercise both failure before acceptance and response loss after acceptance.
  Mocked APIs establish state-machine behavior only; sandbox establishes actual
  GitHub permissions and immutable-release behavior.
- Package qualification uses installed candidate bytes and functional fixtures.
- Reproducibility compares payload digests from two clean builds per target;
  run-specific attestations/manifests are intentionally separate. No percentage
  reliability claim is justified by a small number of rehearsals.
- Record source SHA and exact GitHub check URLs; do not count stale checks.

## Baseline evidence

Local tools: Node `v24.18.0`, npm `11.16.0`, Cargo `1.97.1` (not the release
toolchain `1.85.1`; release-toolchain verification remains pending).

`node test/release-transaction.test.mjs`: 15 tests passed, zero failures.
Existing ambiguous-publication test retries `publishDraft` alone. The workflow
restarts with `prepare`, which rejects a matching immutable release with
`Existing release is not a mutable draft`. This is a workflow-sequence coverage
gap. The CLI command also unconditionally requires an unused npm version during
prepare, which must not prevent read-only reconciliation of a completed release.

## Next action

Prepare the Phase 2 PR, monitor exact-head native and Homebrew CI, and repair
any failures. Record its final source SHA and check URLs. Then continue with
container qualification, reproducibility, provenance verification, destination
reconciliation, protected recovery, and the sandbox prerequisites in the ledger.
Update this checkpoint before any handoff or context exhaustion.

## Phase 1 measurements

- Regression before repair: 16 transaction tests, 15 passed, one failed with
  `Existing release is not a mutable draft`.
- After repair: `node test/release-transaction.test.mjs`, 40 passed, zero failed.
  Each of 12 interruption cases finishes with one accepted draft creation,
  one accepted upload per fixture asset, one accepted publication, and zero
  additional writes on a completed retry. Nine inconsistent-state cases reject
  with zero writes. The fixture has three assets; this does not claim native
  package installation or real GitHub transport coverage.
- `node test/publish-npm.test.mjs`: four passed, zero failed.
- `npm ci`: succeeded with committed lockfile.
- `npm test`: 97 passed, zero failed/skipped.
- `npm run check`, `npm pack --dry-run`, `git diff --check`: passed.
- Rust `1.85.1`: `cargo fmt --check`, `cargo clippy --all-targets --locked --
  -D warnings`, `cargo test --locked`, and `cargo run --locked -- --version`
  passed. The CLI Rust test target contains zero unit tests; the version smoke
  returned `harness-lens 0.0.5`. This is not native package qualification.
  The toolchain installer exited nonzero during its final rustup self-location
  check after successfully installing the toolchain; subsequent checks used
  that installation with isolated `RUSTUP_HOME`/`CARGO_HOME` and
  `RUSTUP_TOOLCHAIN=1.85.1`.

## Phase 1 deployment evidence

- Reviewed head: `d8ee9aa509fbda4aab3e389a5b26fd2fb0829009`.
- CI: https://github.com/harness-lens/cli/actions/runs/34404203145.
- CodeQL: https://github.com/harness-lens/cli/actions/runs/34404203154.
- Merge: `55d1689504be4d630be1fe6b1da5c3a75fa0e49a` (PR 39).
- The merged tree matches the reviewed tree. No release was dispatched.

## Phase 2 local measurements

Measured on the worktree based on `55d1689504be4d630be1fe6b1da5c3a75fa0e49a`;
final PR-head CI evidence remains pending.

- Node `v24.18.0`, npm `11.16.0`, Rust/Cargo `1.85.1`.
- `npm ci --cache /tmp/harness-lens-npm-cache`: passed.
- `npm test`: 139 tests passed, zero failed/skipped.
- The inventory suite includes all 15 missing-file and 15 empty-file cases;
  eight CLI fixture scenarios exercise 24 command invocations, including source,
  workflow, run, and attempt mismatches, with unexpected network access trapped.
- `npm run check`, actionlint `1.7.12`, and `git diff --check`: passed.
- `npm pack --pack-destination /tmp` followed by
  `npm run package:smoke -- /tmp/harness-lens-cli-0.0.5.tgz 0.0.5`: passed;
  installed into an empty temporary consumer, checked help/invalid command, and
  compared two functional scans excluding only `generatedAt`.
- Rust `cargo fmt --check`, `cargo clippy --all-targets --locked --offline --
  -D warnings`, `cargo test --locked --offline`, `cargo run --locked --offline
  -- --version`, and the release build for `x86_64-unknown-linux-gnu`: passed.
  The Rust unit-test target still contains zero tests.
- Executed the shared native action's build, archive, and extraction shell steps
  locally. `cmp` confirms the extracted executable equals the build output.
  `smoke-native-package.mjs` passes help, invalid option, missing config argument,
  and two functional scans excluding only `plugin_executions[].duration_micros`.
  Native binary SHA-256:
  `504712d668706df155c528396e5034905045d970f6007a66e92058e676bff1f1`.
  Archive SHA-256:
  `2e3f17a0bb3271e369184fb277414e369a46716c011ee2827b2ae05f3d2cecef`.
- No macOS, Windows, Homebrew installation, or live sandbox result is inferred
  from the Linux checks. Archive timestamps are not yet normalized.

## External prerequisites

Sandbox App installation, private-key provisioning, tag authorization, and
protected approvals are not complete. Never print or store credential values
in this record. No sandbox or production release has been dispatched by this
implementation work. The existing 30-day same-run recovery policy remains in
force until a separately reviewed recovery implementation replaces it.
