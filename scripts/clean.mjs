// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

import { rm } from "node:fs/promises";

await rm(new URL("../dist", import.meta.url), { recursive: true, force: true });
