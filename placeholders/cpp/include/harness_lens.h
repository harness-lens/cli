// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

#ifndef HARNESS_LENS_H
#define HARNESS_LENS_H

#if defined(_WIN32) && defined(HARNESS_LENS_SHARED)
#  if defined(HARNESS_LENS_BUILDING_LIBRARY)
#    define HARNESS_LENS_API __declspec(dllexport)
#  else
#    define HARNESS_LENS_API __declspec(dllimport)
#  endif
#elif defined(__GNUC__) && defined(HARNESS_LENS_SHARED)
#  define HARNESS_LENS_API __attribute__((visibility("default")))
#else
#  define HARNESS_LENS_API
#endif

#ifdef __cplusplus
extern "C" {
#endif

#define HARNESS_LENS_VERSION "0.0.0-placeholder"

/* Returns 0 until the native analysis implementation replaces this scaffold. */
HARNESS_LENS_API int harness_lens_available(void);

/* Returns a process-lifetime version string owned by the library. */
HARNESS_LENS_API const char *harness_lens_version(void);

#ifdef __cplusplus
}
#endif

#endif
