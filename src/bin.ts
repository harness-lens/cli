#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { runCli } from "./index.js";

process.exitCode = await runCli(process.argv.slice(2));
