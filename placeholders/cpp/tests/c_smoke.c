// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

#include "harness_lens.h"

#include <assert.h>
#include <string.h>

int main(void) {
  assert(harness_lens_available() == 0);
  assert(strcmp(harness_lens_version(), "0.0.0-placeholder") == 0);
  return 0;
}
