# syntax=docker/dockerfile:1
# SPDX-License-Identifier: MPL-2.0
# Copyright © 2026 Cristian Camargo Filho

FROM rust:1.85.1-bookworm@sha256:e51d0265072d2d9d5d320f6a44dde6b9ef13653b035098febd68cce8fa7c0bc4 AS builder
WORKDIR /source
COPY rust/ ./rust/
RUN cargo build --locked --release --manifest-path rust/Cargo.toml

FROM debian:bookworm-slim@sha256:88200866dfff7ea7f5cbcb6ec7c8a701889efe6fe859fe64d6990e4b07ea4171 AS runtime
LABEL org.opencontainers.image.title="Harness Lens CLI" \
      org.opencontainers.image.description="Local-first coding-agent harness scanner" \
      org.opencontainers.image.licenses="MPL-2.0" \
      org.opencontainers.image.source="https://github.com/harness-lens/cli"

RUN groupadd --system --gid 65532 harness-lens \
    && useradd --system --uid 65532 --gid 65532 --home-dir /nonexistent --shell /usr/sbin/nologin harness-lens
COPY --from=builder /source/rust/target/release/harness-lens /usr/local/bin/harness-lens
COPY LICENSE /licenses/MPL-2.0.txt

USER 65532:65532
WORKDIR /workspace
ENTRYPOINT ["harness-lens"]
CMD ["--help"]
