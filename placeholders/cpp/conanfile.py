# SPDX-License-Identifier: MPL-2.0
# Copyright © 2026 Cristian Camargo Filho

from conan import ConanFile
from conan.tools.cmake import CMake, CMakeToolchain, cmake_layout


class HarnessLensConan(ConanFile):
    name = "harness-lens"
    version = "0.0.0"
    package_type = "library"
    license = "MPL-2.0"
    url = "https://github.com/harness-lens/cpp"
    description = "Native C and C++ interface for Harness Lens"
    topics = ("agents", "harness", "analysis")

    settings = "os", "compiler", "build_type", "arch"
    options = {"shared": [True, False], "fPIC": [True, False]}
    default_options = {"shared": False, "fPIC": True}

    exports_sources = (
        "CMakeLists.txt",
        "cmake/*",
        "include/*",
        "src/*",
        "LICENSE",
    )

    def config_options(self):
        if self.settings.os == "Windows":
            self.options.rm_safe("fPIC")

    def configure(self):
        if self.options.shared:
            self.options.rm_safe("fPIC")

    def layout(self):
        cmake_layout(self)

    def generate(self):
        toolchain = CMakeToolchain(self)
        toolchain.variables["BUILD_TESTING"] = False
        toolchain.generate()

    def build(self):
        cmake = CMake(self)
        cmake.configure()
        cmake.build()

    def package(self):
        cmake = CMake(self)
        cmake.install()

    def package_info(self):
        self.cpp_info.libs = ["harness-lens"]
        self.cpp_info.set_property("cmake_file_name", "harness-lens")
        self.cpp_info.set_property(
            "cmake_target_name", "harness-lens::harness-lens"
        )
