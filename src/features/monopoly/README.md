# NA Monopoly — Jam Mode

The game is available to host and participants through `JamGames`. State is stored separately at `karaoke-rooms/{roomCode}/monopolyGame`. Lovopoly's existing match is not modified.

## Files

- `Monopoly.jsx`: lobby, board, player list, actions and Firebase transaction transport.
- `engine.js`: deterministic 2–8 player reducer; dice sampled before transactions, revision checks and duplicate-command protection.
- `catalog.js`: adapts Lovopoly's forty spaces, deed prices, rents and coordinates.
- `data/categories.json`: eight category labels and colors. Internal group keys retain Lovopoly's keys so its economy functions can be reused.
- `data/tiles.json`: the single editable catalog for all forty tiles: ID, name, type, art, thumbnail, optional animation and descriptive text.
- `data/tokens.json`: eight unique tokens.
- `data/chance.json`, `data/community.json`: independent decks, shuffled deterministically per match. Cards have unique `id`, `title`, `text` and `effect`; supported effects are `cash` (signed `amount`), `move` (`destination`, 0–39) and `detain`.
- `monopoly.css`: scoped presentation, horizontally scrollable board on small screens.
- `engine.test.js`: lobby, concurrency, eight-player rotation, elimination, economy, decks and round-limit tests.

NA means Narcotics Anonymous. Content is original, fictional game flavor. Titles and category colors can be edited independently of the game rules. Keep card IDs stable for saved matches. The monetary schedules and group sizes are inherited from Lovopoly.

## Rules and connection behavior

2–8 players join before the creator starts. Each receives a different token and $1,500. Starting order is shuffled once and synchronized to everyone. Purchases, rent, even building, mortgages, debt settlement, doubles, Pause and bankruptcy are supported. Quick mode compares net worth after 20 rounds among surviving players. Passing leaves a property with the bank; auctions and multiplayer trades are not included in this version.

A disconnected player retains their seat and turn; they can return using the same stored browser identity and room code. There is no automatic timeout or forced move. Jam rooms retain the application's existing lifecycle: disconnecting the room host removes the room. The host must keep the room open. Firebase security/deployment configuration is unchanged; client reducer checks are not server-side authorization.

## Verification

`node --test src/features/monopoly/engine.test.js src/utils/lovopoly*.test.js`

`npm run build`

`scripts/check-monopoly-ui.mjs` uses Playwright from `LOVO_NODE_MODULES` with the local Vite server. It renders an eight-player fixture, opens a deed and checks desktop/mobile layout. It does not create or modify remote rooms. Live multi-device Firebase verification remains a separate manual check: join eight browser identities, attempt a ninth join, start, take turns, reconnect a participant, and confirm every screen receives the same state.

## Tile artwork

Original illustrations: `public/monopoly/tiles/tile-00.png` through `tile-39.png`.
The four corners (00, 10, 20, 30) are square; other spaces use portrait 4:7 artwork.
`data/tiles.json` maps each position to its original and lightweight board thumbnail.
The board rotates side artwork by 90/180/270 degrees; originals and detail artwork stay upright.
Titles in `data/tiles.json` match the supplied illustrations.

After replacing an original PNG, run `python scripts/build-monopoly-artwork.py` with Pillow installed to refresh `public/monopoly/tiles/board/*.webp`. Originals remain untouched. The board uses those optimized files; selecting a space displays its full-size original.


## Landing popups and editing content

`TilePopup.jsx` opens in the board center after each synchronized landing. It shows each visited tile and drawn card in order, including movement cards and detention. Only the active player receives purchase, turn and debt actions. Closing or reopening a popup changes presentation only; card effects and payments are applied once by the reducer. Older games without a landing snapshot begin showing popups on their next roll.

Edit `data/tiles.json` for tile content. Each entry has:

- `id`: stable board position (0–39).
- `name`, `text`: heading and descriptive/flavor text.
- `type`: existing rule type; preserve this when changing artwork or copy. Changing rule types requires coordinated economy changes.
- `art`: full-size public URL such as `/monopoly/tiles/tile-01.png`.
- `thumbnail`: lightweight board image URL.
- `animation`: `null`, or `{ "src": "/monopoly/animations/tile-01.webp" }` for an optional animated SVG/GIF/WebP. Popups use it in place of static art; missing animations fall back to `art`. Reduced-motion users see static art.

Edit `data/chance.json` and `data/community.json` independently. Both contain `id`, `title`, `text`, optional `art`, optional `animation`, and the deterministic `effect`. `cash` uses a signed `amount`, `move` uses `destination`, and `detain` goes to Ego. Keep IDs stable for existing saved decks. Card images/animations use the same paths and animation shape as tiles. Chance contains 51 cards (the original six plus 45 supplied cards); Community contains six. New matches include the expanded deck; existing saved decks retain their current order and card IDs. Add more unique IDs before starting a new match.

The earlier `spaces.json` and `artwork.json` have been consolidated into `tiles.json`.

Additional Chance effects: `nearest` advances to the next matching `target` (`station` or `utility`), pays $200 when passing Start and resolves the destination using the roll already made. `back` moves backward by `spaces` without a Start bonus, then resolves the destination normally, including another card draw.

`other-utility` selects the second utility encountered in forward board order (skipping the nearest forward utility), collects $200 if Start is passed, and resolves the destination normally.

## NA Literature Challenge

Each landing on an ownable space (property, station or utility, including card movement) has a 30% chance of offering an optional challenge. The normal purchase price or actual computed rent is shown before acceptance; rent is not transferred until the question is answered or skipped. The chance sample is drawn once with rejection-sampled browser cryptography, before the Firebase transaction, and reused on transaction retries. Legacy commands without a sample retain their previous behavior.

- Unowned property: correct answer gives 20% off purchase; incorrect adds 10% to its price; skip retains normal price. The player can still pass on buying.
- Another player's property: correct answer gives 30% off rent; incorrect adds 10%; skip retains normal rent.
- Stations and utilities: purchase/rent discounts are 25%; incorrect adds 10%.
- Own space: correct receives $50 from the bank; incorrect pays $50 to the bank; skip has no payment or reward.
- Final payable amounts round up to whole dollars. Rent discounts use current buildings, full groups, stations, utility dice multiplier and mortgages, frozen at arrival. A $0 mortgaged rent remains $0.

`data/literature-questions.json` contains 73 multiple-choice questions: ten initial questions and 63 unique user-supplied questions with `id`, `question`, `options`, `answerIndex`, `explanation`, and an official NA `source` URL. Keep IDs stable when editing. The initial questions reference NA World Services' Twelve Traditions group reading and The Group Booklet; they paraphrase concepts rather than reproducing readings.

Each player has an independently shuffled, persisted `literatureDecks[playerId]`. Only submitted correct/incorrect answers remove questions from `remaining` and add to `used`. Skips rotate the question to the end of the remaining deck, including when skipped after accepting. The deck resets into a new shuffled cycle only after that player has answered every question. Merely closing the popup does not resolve the challenge; use View landing to reopen it. Accepted questions survive reconnection. Pending challenges block purchases, turn progression and property management until resolved; surrender remains available. A penalty the player cannot afford creates a normal debt, with mortgage/sale and settlement available afterward.

`literature.js` owns challenge selection, pricing, and resolution. `LiteratureChallenge.jsx` renders the offer, question and result within the landing popup. `literature.test.js` checks probability boundaries, all payment paths, individual deck exhaustion, skip recycling, retries, reconnects and chained landings. `scripts/check-monopoly-literature-ui.mjs` exercises actual purchase and rent outcomes in a local reducer-backed browser fixture without writing to Firebase.

Question import: the supplied collection contained 83 entries, including a repeated block of 20. Exact duplicate questions with matching choices and keys were imported only once. The unnumbered sponsorship question is included. User-supplied answer keys were preserved as marked, with `source: null` rather than an unverified official source link. Existing personal decks receive the expanded catalog when their next cycle begins; new matches start with all 73 questions.
