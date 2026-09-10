#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { runCli } from "@harness-lens/cli";

process.exitCode = await runCli(process.argv.slice(2));
