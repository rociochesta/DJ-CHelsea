# Editing Lovopoly locations

Edit `lovopolyPlaces.json`. Its `places` array is the complete pool, including the original locations and the additional Chile and Oklahoma locations at the bottom.

- `name`: title shown in the tile details.
- `description`: text shown below the title.
- `category`: category pool, such as `chile` or `oklahoma`.
- `enabled`: set to `false` to exclude a location from new games.
- `sourceFolder`: folder relative to `assets/Tiles`, for example `chile/2x`.
- `id`: unique permanent identifier; keep it unchanged when editing text or renaming folders.
- `image` and `animations`: generated artwork paths.
- `originalSlot`: only for the original 40 spaces; omit on additional locations.

Each new game draws three distinct locations from Chile and three from Oklahoma, including the original locations in each pool. Selection is saved for both players and does not change on reload. Every other property category also draws randomly from its pool, using its existing number of board spaces (Games and Us have two; other property categories have three). Prices and rent remain attached to the board slots.

To add a location, copy an entry, give it a new `id`, edit its `name`, `description`, `category`, and `sourceFolder`, and remove `originalSlot`. Keep enough enabled locations to fill the category.

After changing artwork or folders, run `node scripts/sync-lovopoly-tiles.mjs`. It preserves your edited titles, descriptions, categories, and enabled settings. It uses `Asset 1.svg` as the background and prefers `compiled-overlay.svg` when present.

Start a new game to use edited titles, descriptions, and pools. Existing games retain their saved location text. Titles drawn inside the illustration itself must be edited in the source artwork.
