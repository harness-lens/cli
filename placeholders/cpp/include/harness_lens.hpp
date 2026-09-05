// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

#ifndef HARNESS_LENS_HPP
#define HARNESS_LENS_HPP

#include <string_view>

#include "harness_lens.h"

namespace harness_lens {

[[nodiscard]] inline bool available() noexcept {
  return harness_lens_available() != 0;
}

[[nodiscard]] inline std::string_view version() noexcept {
  return harness_lens_version();
}

}  // namespace harness_lens

#endif
