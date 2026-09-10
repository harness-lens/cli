<!-- SPDX-License-Identifier: MPL-2.0 -->
<!-- Copyright © 2026 Cristian Camargo Filho -->

# NuGet prefix preparation

Priority P3 after Snap #46; tracking [#47](https://github.com/harness-lens/cli/issues/47).
Prepare prefix reservation before choosing a functional package. The
project-controlled NuGet account/organization and existing reservations must
be confirmed through account access. No reservation is established by this file.

## Request draft

This draft is not sent. Replace the owner field with the verified NuGet display
name, confirm project identity evidence, and obtain authorization before sending.

```text
To: account@nuget.org
Subject: Package ID prefix reservation request for HarnessLens

Please reserve the HarnessLens package ID prefix for:

NuGet owner display name: [confirm the project-controlled NuGet owner]
Project: Harness Lens
Project organization: https://github.com/harness-lens
Architecture and ownership: https://github.com/harness-lens/harness-lens
CLI repository: https://github.com/harness-lens/cli

Harness Lens provides evidence-backed, local-first analysis of coding-agent
harnesses. We are preparing our NuGet identity so users can distinguish official
packages from unrelated packages using the same project name.

Requested coverage: HarnessLens and package IDs beneath HarnessLens.
Please confirm the exact reserved-prefix pattern and whether it covers both the
bare ID and dotted child package IDs. We request exclusive protection, not a
public prefix or delegation to unrelated owners.

We can provide further evidence of project/account control on request.
```

Record the NuGet team's decision and exact prefix coverage in #47. Package-ID
prefix reservation is reviewed by NuGet; project metadata and a 404 response
from the package API do not guarantee acceptance.

## Functional package decision

The existing Chocolatey `.nupkg` cannot serve as a NuGet library or .NET tool.
If a .NET global CLI tool is selected, the CLI repository owns its entry point,
runtime identifiers, native asset handling, and install/run/update/uninstall
tests. A managed SDK or binding belongs in its owning SDK repository and must
respect the inward dependency rule.

Before packaging, choose the supported .NET runtime/target frameworks and OS/
architecture matrix. Bind any native payload to its reviewed source and
provenance, and retain package bytes/digests. Publish only a useful, verified
package through the accepted account and release controls.

Source: [NuGet prefix reservation and criteria](https://learn.microsoft.com/en-us/nuget/nuget-org/id-prefix-reservation).
