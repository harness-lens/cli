# SPDX-License-Identifier: MPL-2.0
# Copyright © 2026 Cristian Camargo Filho

cmake_minimum_required(VERSION 3.20)

project(harness-lens VERSION 0.0.0 LANGUAGES C CXX)

include(GNUInstallDirs)
include(CMakePackageConfigHelpers)
include(CTest)

add_library(harness_lens src/harness_lens.c)
add_library(harness-lens::harness-lens ALIAS harness_lens)

set_target_properties(
  harness_lens
  PROPERTIES
    C_VISIBILITY_PRESET hidden
    CXX_VISIBILITY_PRESET hidden
    EXPORT_NAME harness-lens
    OUTPUT_NAME harness-lens
    VERSION "${PROJECT_VERSION}"
    SOVERSION "${PROJECT_VERSION_MAJOR}"
)

target_compile_features(harness_lens PUBLIC c_std_11)
target_compile_definitions(harness_lens PRIVATE HARNESS_LENS_BUILDING_LIBRARY)
if(BUILD_SHARED_LIBS)
  target_compile_definitions(harness_lens PUBLIC HARNESS_LENS_SHARED)
endif()
target_include_directories(
  harness_lens
  PUBLIC
    "$<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>"
    "$<INSTALL_INTERFACE:${CMAKE_INSTALL_INCLUDEDIR}>"
)

if(BUILD_TESTING)
  add_executable(harness_lens_c_test tests/c_smoke.c)
  target_link_libraries(harness_lens_c_test PRIVATE harness-lens::harness-lens)
  add_test(NAME harness_lens_c_test COMMAND harness_lens_c_test)

  add_executable(harness_lens_cpp_test tests/cpp_smoke.cpp)
  target_compile_features(harness_lens_cpp_test PRIVATE cxx_std_17)
  target_link_libraries(harness_lens_cpp_test PRIVATE harness-lens::harness-lens)
  add_test(NAME harness_lens_cpp_test COMMAND harness_lens_cpp_test)
endif()

configure_package_config_file(
  cmake/harness-lens-config.cmake.in
  "${CMAKE_CURRENT_BINARY_DIR}/harness-lens-config.cmake"
  INSTALL_DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/harness-lens"
)

write_basic_package_version_file(
  "${CMAKE_CURRENT_BINARY_DIR}/harness-lens-config-version.cmake"
  VERSION "${PROJECT_VERSION}"
  COMPATIBILITY SameMajorVersion
)

install(
  TARGETS harness_lens
  EXPORT harness-lens-targets
  ARCHIVE DESTINATION "${CMAKE_INSTALL_LIBDIR}"
  LIBRARY DESTINATION "${CMAKE_INSTALL_LIBDIR}"
  RUNTIME DESTINATION "${CMAKE_INSTALL_BINDIR}"
  INCLUDES DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}"
)
install(DIRECTORY include/ DESTINATION "${CMAKE_INSTALL_INCLUDEDIR}")
install(
  EXPORT harness-lens-targets
  FILE harness-lens-targets.cmake
  NAMESPACE harness-lens::
  DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/harness-lens"
)
install(
  FILES
    "${CMAKE_CURRENT_BINARY_DIR}/harness-lens-config.cmake"
    "${CMAKE_CURRENT_BINARY_DIR}/harness-lens-config-version.cmake"
  DESTINATION "${CMAKE_INSTALL_LIBDIR}/cmake/harness-lens"
)
