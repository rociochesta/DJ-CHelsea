# Lovopoly place catalog

Edit `lovopolyPlaces.json` to add cards. The current catalog uses the existing artwork only.

For a new Chile or Oklahoma card, add a unique `id`, `name`, `category` (`chile` or `oklahoma`), English `description`, `image`, `animations` array of `{ "src": "/lovopoly/catalog/.../overlay.svg" }`, and `enabled: true`. Put assets under `public/lovopoly/catalog/`. Omit `originalSlot` for new cards: it identifies the original cards for older saves. Overlay images must align with the base artwork and use the same aspect ratio.

New matches select three distinct cards in each of these categories. Whole categories with three properties exchange positions; two-property categories retain their positions. Price, rent, building costs and color belong to the board slot. Do not put economic values in this catalog.

The selected card data is saved in `boardLayout` when creating a match or rematch. Editing the catalog does not reshuffle a match in progress. Keep asset paths available for existing saves.
