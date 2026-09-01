// SPDX-License-Identifier: MPL-2.0
// Copyright © 2026 Cristian Camargo Filho

package harnesslens

import "testing"

func TestPlaceholderIsUnavailable(t *testing.T) {
	if Available() {
		t.Fatal("placeholder must not claim that analysis is available")
	}
	if Version != "0.0.0-placeholder" {
		t.Fatalf("unexpected placeholder version %q", Version)
	}
}
