# Releasing

Official installers are built only by `.github/workflows/release.yml` from a
protected `vMAJOR.MINOR.PATCH` tag whose version matches both package manifests.

1. Merge all release changes through required checks and finalize `CHANGELOG.md`.
2. Confirm the GitHub `release` environment requires maintainer approval.
3. Create the protected tag on the intended `main` commit.
4. Approve the environment only after CI tests, Microsoft Defender, and ClamAV
   pass.
5. Verify the GitHub Release contains the installer, checksum, release manifest,
   SPDX SBOM, and provenance attestation.
6. Review the complete draft and its assets, then publish it. The workflow creates
   a draft so immutable releases cannot become public before every asset is ready.
7. Install and launch the downloaded artifact on a clean Windows environment.

The manifest uses the current GitHub repository as its download origin. The
localized fork keeps upstream attribution and labels its release as the Chinese
edition; it does not replace an upstream release asset.

Do not upload a locally built replacement to an existing release. If an artifact
is wrong, publish a new patch version.

The current installer is unsigned. Before integrating SignPath Foundation or
making code-signing claims, complete the eligibility gate in
[`SIGNPATH_PREFLIGHT.md`](SIGNPATH_PREFLIGHT.md). A signed installer must be
published as a new version; immutable release assets are never replaced.
