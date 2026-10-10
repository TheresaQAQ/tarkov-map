# Third-party notices

Raid Signal's original code is Apache-2.0. That license does not apply to the
separately licensed material described here. See `ASSET_LICENSES.md` for the
file-level provenance ledger, snapshot details, modifications, and downstream
redistribution cautions.

This application uses Tauri, React, Leaflet, and other open-source dependencies under their respective licenses.

Coordinate transforms and map metadata are based on the MIT-licensed [tarkov.dev](https://github.com/the-hideout/tarkov-dev) project. The bundled point-of-interest snapshot is generated from the public [Tarkov.dev API](https://tarkov.dev/api/).

The bundled bilingual game-text dictionary retains Tarkov.dev's English
and Chinese locale keys and original values, matched to existing snapshot text
and identifiers. Legacy labels and unchanged English strings also use the
public carlsmei/tarkovdata game-locale mirror at pinned revision
`08649f48a43fe8f4bea311b23a224a278a26492b` (game `1.0.2.0.43037`). Credit
Tarkov.dev contributors and the game's localization authors. This data retains
its source terms; see the 2026-10-10 entry in `ASSET_LICENSES.md` for provenance
and SHA-256 identity. Original interface translations are separately maintained
as application source.

Escape from Tarkov SVG maps are provided by [the-hideout/tarkov-dev-svg-maps](https://github.com/the-hideout/tarkov-dev-svg-maps) under CC BY-NC-SA 4.0. The map assets are separate works from the Apache-2.0 application code. Attribution is also shown inside the application. The upstream repository publishes additional usage guidance; redistributors must review and preserve applicable current restrictions.

Icebreaker and Labyrinth map images are provided by [RE3MR](https://reemr.se/) under CC BY-NC-SA 4.0. Raid Signal self-hosts pinned copies downloaded on 2026-08-12 from the creator's published full-resolution map URLs. Derived deck/crop images are fitted to Tarkov.dev coordinate bounds for interactive display. RE3MR asks website and application users to contact the creator. No authorship or endorsement is implied.

The former Icebreaker and Labyrinth tiles sourced from assets.tarkov.dev have been removed and are not distributed.

Quest location previews reuse the attributed bundled maps; they are not in-game
quest screenshots. Optional Tarkov Wiki links come from narrowly matched
Tarkov.dev URL metadata. Generic quest artwork is supplied through
[the Tarkov.dev API](https://tarkov.dev/api/) and hosted upstream on
assets.tarkov.dev. Escape from Tarkov game artwork © Battlestate Games. The
236 bundled images are unchanged and individually sourced and hashed in
`public/maps/quests/images.json`. Inclusion follows the user's confirmation of
permission with attribution; no broader image license is asserted. These images
are separate from both the Apache-2.0 code and CC BY-NC-SA map artwork. Wiki text
and HTML are not redistributed.
See the 2026-09-24 entry in `ASSET_LICENSES.md` for source and checksum details.

IBM Plex Sans Condensed and IBM Plex Mono are distributed under the SIL Open Font License 1.1. The font package licenses are included with their respective `@fontsource` dependencies.
