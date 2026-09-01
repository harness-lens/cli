// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

#include "harness_lens.hpp"

#include <cassert>
#include <string_view>

int main() {
  assert(!harness_lens::available());
  assert(harness_lens::version() == std::string_view{"0.0.0-placeholder"});
  return 0;
}
