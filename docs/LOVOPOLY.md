# Lovopoly — implementation and locked scope

## Current implementation — 22 October 2026

- Surrender: either joined player can concede at any time before match end, including off-turn and during debt. A UI confirmation names the winner. The result records `finishReason`, `surrenderedBy`, `finishedAt`, an activity event and an archived final snapshot; pending offers close, and finances remain as they were. Finished results cannot be cancelled or edited. Completed matches now offer Request rematch with partner acceptance, decline or withdrawal. Acceptance preserves the final snapshot in Previous matches and carries the Romantic Inbox forward, while resetting finances, ownership, detention and decks. The same game mode, round limit and tokens are reused; both players roll to decide who starts.

- Right-hand Games / Queue / Search rail collapses while Lovopoly is open; expanded deed viewer and wider board.
- Regenerated lossless tile images and small board thumbnails from `Documents/lovopoly/assets`. Corrected positions: **18 Midnight Spicy, 19 Plane Ticket**.
- Mortgages pay 50% of purchase price, suppress rent, and cost principal plus 10% to repay (rounded up to whole dollars).
- Trade offers exchange properties, cash, and detention cards; one-sided gifts are allowed. Offers survive reloads, require recipient acceptance, and validate ownership, balances, cards and buildings again on acceptance.
- Buildings must be built/sold evenly; four Love Nests upgrade to a Love Castle. Sales refund half cost. No mortgage or property trade while the color group has buildings.
- Debt pauses movement and turn completion; players can mortgage, sell buildings, trade, receive gifts, pay, or explicitly declare bankruptcy. Bankruptcy transfers remaining assets to the creditor, or returns them to the bank, and ends the two-player match.
- Classic ends at bankruptcy; Quick selects 10/20/30/50 complete rounds, counts bonus rolls within the same turn, and scores cash + property purchase value (half for mortgaged deeds) + building purchase costs. Pending offers close on match end.
- Doubles grant extra rolls; the third consecutive double sends the player to detention.
- Classic deed schedules are assigned by color group. This custom board has 23 properties; Chile's extra deed shares its lower schedule and the two-property Games group uses the low/high red schedules. These mappings are explicit in `lovopolyBoard.js`.

Implemented rules 37–42: two persisted shuffled 30-card decks, drawn without replacement until cycling. Love or Disaster contains 15 financial, 10 movement/mischief (including one keepable escape card), and 5 romantic cards. From Me to You contains 15 financial (including one keepable escape card), 10 bank-funded gifts to the partner, and 5 romantic cards. Keepable cards leave circulation, retain deck identity through trades, and return to the bottom on use. Original English card texts are defined in `lovopolyCards.js`; the saved rule excerpts did not provide 60 individual texts. Shuffles are deterministic permutations seeded by match UUID/deck/cycle, persisted for Firebase retry safety; they are not server-authoritative or secret from clients.

Landing UI opens automatically for the moving player, displays drawn cards and their effects, owner/current rent, purchase/pass controls, View Deed and close X. Closing is presentation-only; it does not undo or repeat effects. Last landing can be reopened. Movement cards resolve the destination, GO salary, rent/taxes, purchases and chained draws. Old matches lazily initialize decks without replacing their finances or ownership; old anonymous detention-card balances remain usable.

Romantic invitations persist in Pending until completed or declined. Acceptance alone is not completion. The drawing player can send messages and submit a response; only the partner can confirm completion. Both can continue messaging in History and after match end, without changing game results. Existing accepted invitations remain pending until confirmed. Romantic card popups have a brief reveal animation that respects reduced-motion preferences. The Romantic Inbox carries forward into accepted rematches; emoji reactions remain pending.

Bankruptcy now requires cash plus all available mortgage proceeds plus half-price building refunds to be strictly below the debt. Existing mortgages are not counted twice. Players who can raise enough money must liquidate and pay, or explicitly surrender; hypothetical future trade proceeds are not assumed.

Kiss Detention now counts three attempts. Doubles release and move without a bonus; pre-roll $50 payment or escape card permits normal doubles. Third failure stores the dice and requires payment/card before moving without a bonus. Insufficient cash creates a recoverable $50 bank debt; settlement resumes the saved movement, including destination rent and possible new debt. One optional escape invitation is available per detention. The player selects from three saved choices, submits a response and waits for partner confirmation, scheduling free release at the next own turn. Acceptance alone does not grant release. Late confirmation cannot release a different detention or alter a finished match. The separate 30-item escape collection is implemented in lovopolyChallenges.js: 20 Sweet, Flirty & Playful (B), 10 Romantic & Spicy (C), all optional. Each detention stores three unique choices, prioritized by uncompleted challenges for that player; if fewer than three remain, completed choices fill the remaining slots. Selection uses a stable seeded shuffle; reload and retries cannot reroll choices. Legacy detentions use Show my three challenges to initialize persisted choices. Only partner-confirmed completion advances progress. Progress survives accepted rematches; after 30 completions the next selection starts a fresh cycle without deleting Inbox history. Late prior-cycle confirmation does not mark an item completed in the new cycle. Prices and rule improvements apply to existing saved matches; saved positions and ownership remain keyed to board numbers. No saved match is erased.

Validation: reducer tests cover mortgages, buildings, trade acceptance, stale offers, debt recovery, bankruptcy, doubles and Quick scoring. Browser smoke test: `scripts/check-lovopoly-ui.mjs` (requires Playwright and Edge; set `LOVO_NODE_MODULES` to the package directory).

## Original first increment: board and shared setup

Implemented in Secret Room → Games → Lovopoly:
- Original 40-position board; click-to-inspect artwork, zoom, tile numbers, existing SVG overlays.
- One two-player setup per room; the creator selects Classic or Quick (10/20/30/50 rounds), and their partner joins the same setup.
- Six distinct selectable tokens; saved starting positions and $1,500 balances.
- Asynchronous opening dice rolls, highest starts, both reroll on ties.
- Firebase transaction revisions and command IDs protect against stale/duplicate requests.
- Cancellation before joining is immediate; once both join it requires mutual agreement. Cancelled setup history is preserved.

The original increment ended at `status: ready`; the current implementation above extends the same saved setup and transaction flow.

## Integration

- `HostView` lazy-loads `Lovopoly` only for the Secret Room game view. Both Secret Room participants already share HostView.
- `Lovopoly` adapts the pure `updateLovopoly` reducer to `karaoke-rooms/{roomCode}/lovopolyGame`, using the app's existing Firebase connection and room subscription.
- `LovopolyGame` is the UI, independent of Firebase. `lovopolyBoard.js` owns exact board order and groups.
- No new environment variables, services, dependencies, access rules, or hosting configuration are needed.
- Uses the existing room/profile identity and client-side Firebase transaction pattern. This does not introduce server-authoritative dice or a new authentication boundary.

## Artwork

Originals supplied as `assets.zip`. Board positions come from folder names, not standard Monopoly property positions.
- Shared images: 2/17/33 and 7/22/36.
- Group counts in board order: **3, 3, 3, 3, 2, 3, 3, 2**.
- 36 unique tile images encoded as lossless WebP at original dimensions. No crop, resize, or recolor.
- Small WebP board thumbnails load first; the original-resolution artwork loads only when inspecting a tile.
- Four corners stay square. Side tiles rotate toward the center; full artwork remains visible.
- Existing SVG assets are retained and loaded as images. Full-tile bird/airplane overlays can be played in the tile inspector.
- Group labels beyond Chile/Oklahoma are UI metadata; tile titles and colors are read from the supplied artwork.
- Prices and rents now use explicit group-based schedules for this nonstandard distribution.

## Validation

`node --test src/utils/lovopoly.test.js src/utils/secretRoom.test.js`

`npm run build`

## Scope boundary

User stopped new rule selection at **208**. Rule 209 is not approved. Build existing decisions incrementally; do not add rule-choice loops.

Source conversation: https://chatgpt.com/share/6ad92b42-1664-83e8-b3a0-e41b0d0ba236

Rules 1, 21 and 27 were selected in prose rather than the generated confirmation messages:
- Rule 1: classic alternating turns, no time limit.
- Rule 21: animated dice, tile-by-tile movement, landing action, special animations, explicit end turn or doubles extra roll; reuse existing assets.
- Rule 27: existing Secret Room flow, one player starts and the other joins. No extra invitation system.
- Rule 54: mixed romantic challenge tone (sweet, playful and flirty).

## Confirmed choices recovered from the shared conversation

- property buying rule B — Simple buying without auctions.
- rent rule A — Classic Monopoly with increasing rent, houses and hotels.
- building rule C — Classic building mechanics with Love Nests and Love Castles.
- starting money and GO rule A — $1,500 starting money and $200 for passing Hello, Beautiful.
- dice rule A — Classic doubles, extra roll and Kiss Detention after three consecutive doubles.
- Kiss Detention rule B — Kiss Your Way Out with money, doubles or an accepted romantic challenge.
- Love or Disaster card rule B — Money, Mischief & Romance.
- From Me to You rule B — Gifts & Sweet Surprises.
- station rule A — Classic Monopoly stations with increasing rent.
- utility rule A — Classic Monopoly utilities with dice-based rent.
- tax rule A — Classic taxes of $200 and $100 paid to the bank.
- Netflix & Chill rule B — Random romantic interaction with no money reward.
- mortgage rule A — Classic Monopoly mortgages with 10% interest.
- trading rule B — Trading and gifting properties or money.
- bankruptcy and winning rule C — Both Classic and Quick game modes, selected before starting.
- Quick Mode length rule B — Choose 10, 20, 30 or 50 rounds before starting.
- Quick Mode winner calculation A — Classic net worth including cash, properties, mortgages and buildings.
- asynchronous interaction rule B — Non-blocking interactions with an inbox for pending offers and challenges.
- inbox design B — Inbox with Pending and History tabs.
- player token rule B — Players choose from available tokens.
- player turn indicator C — Player dashboards with animated turn transitions.
- property dashboard rule C — Interactive Board Management plus Property Portfolio.
- property management timing B — Anytime management, including between turns.
- offline turn rule A — No time limits or penalties.
- first-player rule B — Both roll dice and highest goes first.
- saved-game rule A — One active saved game.
- finished-game rule B — Match history, victory animation and mutually accepted rematches.
- unfinished-game rule B — Surrender or mutually agreed cancellation.
- property pricing rule A — Classic Monopoly property prices, rents and building costs.
- property card display C — Compact landing popup and full deed card.
- color group rent rule A — Double base rent for complete color groups.
- building selling rule A — Classic Monopoly, half-price refunds and even selling.
- building supply rule B — Unlimited digital building supply with per-property limits.
- debt settlement rule A — Classic bankruptcy settlement without auctions.
- Love or Disaster deck rule B — 30-card shuffled deck without repeats until cycling.
- Love or Disaster card distribution C — Classic Monopoly Feel: 15 financial, 10 movement/mischief, 5 romantic.
- romantic challenge rule A — Optional romantic challenges with no financial effects.
- From Me to You deck size B — 30 shuffled cards without repeats until cycling.
- From Me to You card distribution B — Balanced Affection: 15 financial, 10 gifts, 5 romantic cards.
- From Me to You gift mechanics B — Bank-funded gifts for the other player.
- From Me to You romantic card style C — A Little of Both. All romantic interactions are optional and asynchronous.
- romantic card storage rule B — Saved to Romantic Inbox with Pending and History.
- keepable card rule A — One Get Out of Kiss Detention Free card per deck, keepable and tradable.
- Kiss Detention duration A — Classic maximum of 3 turns, then mandatory $50 payment and movement.
- escaping Kiss Detention with doubles rule A — Classic Monopoly: move using the doubles roll, no bonus roll.
- Kiss Detention payment and escape card timing A — Classic Monopoly: pay or use card before rolling, then move normally; forced release after third failed attempt.
- romantic Kiss Detention escape timing B — Accepted challenge grants free release at the start of the next turn.
- romantic Kiss Detention challenge limit A — One romantic escape challenge per detention.
- romantic Kiss Detention challenge selection B — Detained player chooses from three random challenges.
- Kiss Detention romantic challenge collection B — 30 unique challenges.
- romantic challenge repetition rule B — Prioritize challenges not yet completed, then cycle.
- romantic challenge completion rule B — Partner confirms completion.
- pending romantic challenge rule B — No expiration with gentle in-game reminders.
- post-game romantic challenge rule B — Keep romantic interactions active after the match ends, without game effects.
- romantic history across rematches rule B — One continuous shared Romantic Inbox across rematches.
- completed romantic interaction rule C — Allow replies and emoji reactions to completed interactions.
- Romantic Inbox notification rule B — Notifications for all romantic activity with unread badge.
- Romantic Inbox conversation design C — Illustrated cards opening chat-style conversations.
- Romantic Inbox message types B — Text, photos, and GIFs.
- Romantic Inbox message editing rule B — Players can edit or delete their own messages anytime, with edited labels and deletion placeholders.
- Romantic Inbox media storage rule A — Photos and GIFs remain across rematches until deleted by the sender.
- Romantic Inbox conversation deletion rule C — Individual hiding plus mutually agreed permanent deletion.
- Romantic Inbox read receipt rule A — Simple Seen labels without timestamps.
- online presence rule C — No online status or last active tracking.
- turn notification rule C — Animated turn banner plus partner's last-turn activity summary.
- game activity history rule B — Full scrollable game activity log.
- game activity log visibility A — Fully transparent completed game actions, romantic conversations stay in Inbox.
- game action undo rule B — Confirmation popup for important actions, no undo after confirmation.
- financial preview rule B — Detailed previews showing costs, remaining balance, and rent changes.
- property inspection UI rule B — Compact property preview with owner, price, rent, buildings, mortgage status, and View Full Deed.
- opponent property inspection rule A — Full transparency for both players, with management controls only for owned properties.
- Property Portfolio organization C — Color groups with All, Mine, Partner's, and Unowned filters.
- completed monopoly visual rule B — Subtle color glow, crown, and short celebration animation.
- building display rule B — Compact numbered Love Nest indicator and separate Love Castle icon.
- property ownership indicator rule B — Small owner token badge on each owned property.
- mortgaged property display rule B — Small mortgage badge without changing tile artwork.
- property management access rule C — Property management from both board deed cards and Property Portfolio.
- Love Nest building interface rule C — Both individual and bulk building with automatic rule enforcement and financial previews.
- Love Castle upgrade interface rule C — Individual and bulk Love Castle upgrades with even-development checks and financial previews.
- building selling interface rule C — Individual and bulk building sales with automatic rule enforcement and refund previews.
- mortgage restriction interface rule B — Guided mortgage with explanation and Sell Buildings shortcut.
- unmortgage interface rule C — Individual and bulk unmortgaging with repayment and rent restoration previews.
- trading and gifting interface rule C — Trades and gifts from both board and portfolio using a shared exchange builder.
- pending trade management rule C — Edit, cancel, and counteroffer with approval required for revised terms.
- mortgaged property trading rule C — Simplified mortgage transfer with no immediate fee and standard unmortgage cost.
- trade and gift messaging rule C — Optional personal messages, emoji reactions, and replies saved with the exchange history.
- trade and gift expiration rule A — Offers never expire unless accepted, declined, or withdrawn.
- pending trades after match rule B — Mark pending exchanges Match Ended, disable financial acceptance, and preserve conversations.
- trading developed properties rule B — Guided trading with explanation and Sell Buildings shortcut.
- invalid pending trade rule B — Mark offers invalid, disable acceptance, and allow revision or withdrawal.
- multiple pending trade rule B — Unlimited simultaneous offers, independently tracked and revalidated.
- romantic trade conditions rule B — Optional romantic requests tracked separately without blocking trades.
- surprise gifting interface rule C — Quick gifts with mystery gift-wrapped reveal animation and recipient acceptance.
- romantic coupon rule C — Preset and custom romantic coupons with a collection, optional expiration, and confirmed redemption.
- romantic coupon usage rule C — Coupon creators choose single-use, 2–10 uses, or unlimited uses with redemption tracking.
- coupon redemption workflow rule B — Redemption request with Romantic Inbox conversation and creator confirmation.
- Coupon Collection design rule B — Illustrated coupon gallery with Available, Pending, and History tabs.
- romantic coupon transfer rule A — Coupons are personal and cannot be transferred.
- coupon editing and cancellation rule B — Accepted coupons require mutual agreement for changes or cancellation; pending coupons can be edited or withdrawn.
- coupon persistence rule B — Coupons persist across rematches until redeemed, expired, or mutually cancelled.
- coupon redemption celebration rule B — Short floating-heart celebration, Promise Kept message, and Redeemed stamp.
- romantic scrapbook rule B — Shared illustrated memories gallery with saved moments and captions across rematches.
- shared memory approval rule B — Both players must approve memories before they appear in the shared gallery.
- shared memory editing and removal rule B — Mutual approval for caption edits and permanent deletion, with individual private hiding.
- manual memory creation rule B — Game memories plus manually created personal memories with photo, title, date, caption, and mutual approval.
- Memories Gallery organization rule B — Illustrated gallery with category filters and date sorting.
- favorite memories rule B — Personal favorites plus an Our Favorite badge when both players favorite the same memory.
- memory interaction rule B — Comments, replies, and emoji reactions attached to each memory across rematches.
- relationship milestones rule B — Personal milestones plus automatically recognized Lovopoly achievements.
- milestone celebration rule B — Animated milestone cards with floating hearts, personalized messages, comments, and reactions.
- milestone card personalization rule B — Each player can add a personal message and one photo to milestone cards.
- achievements collection rule B — Separate illustrated achievement collection with unlocked badges and locked silhouettes.
- achievement rewards rule B — Achievements unlock cosmetic rewards that persist across rematches without affecting gameplay balance.
- achievement ownership rule C — Both individual and shared couple achievements, with corresponding cosmetic rewards.
- cosmetic customization rule B — Personal customization locker with immediate cosmetic changes and unlock requirements.
- partner achievement visibility rule B — Allow viewing partner's achievement collection and equipped cosmetics without editing.
- featured achievement badge rule B — One selectable featured achievement badge with details and unlock date.
- achievement unlock animation rule B — Animated illustrated achievement card showing badge and cosmetic rewards.
- achievement progress tracking rule B — Progress bars and current counts for locked achievements.
- secret achievement rule C — Hidden achievements with cryptic hints until unlocked.
- repeatable achievement rule B — Achievements unlock once with lifetime accomplishment statistics.
- player statistics dashboard rule C — Detailed lifetime statistics plus head-to-head player comparisons and records.
- individual match statistics rule C — Detailed match reports plus illustrated timelines of major events.
- match keepsake rule B — Automatically generated illustrated match keepsakes that can be saved or added to Shared Memories with approval.
- completed match title rule C — Event-based titles with mutually approved custom replacements.
- match keepsake personalization rule B — Each player can add a personal message to the match keepsake.
- match keepsake interaction rule B — Comments, replies, and emoji reactions attached to keepsakes across rematches.
- Hall of Fame rule B — Hall of Fame with classic and funny records, record holders, values, and originating matches.
- Hall of Fame tracking rule C — Both Legendary Matches single-match records and Lifetime Legends cumulative records.
- romantic Hall of Fame rule B — Add Love Legends category for romantic records and shared accomplishments.
- Hall of Fame ties rule B — Equal records have shared holders, displaying both players.
- Hall of Fame record-breaking notification rule B — Small animated trophy celebration and in-game notifications for both players.
- Hall of Fame accessibility rule B — Accessible anytime from the dashboard or main menu, with live record updates.
- Hall of Fame record permanence rule A — All Hall of Fame records remain permanent across rematches.
- anniversary and milestone rule B — Automatically celebrate gameplay milestones, Lovopoly anniversaries, and romantic activity milestones.
- anniversary card saving rule B — Automatically celebrate and archive milestone cards, but require mutual approval for Shared Memories.
- asynchronous anniversary celebration rule B — In-game notifications for both players, individual next-visit celebrations, and archived cards.
- shared milestone calendar rule B — Shared calendar of upcoming anniversaries and dated milestones, with separate progress-based milestones.
- personal calendar dates rule B — Either player can directly add shared dates with titles, descriptions, and optional annual recurrence.
- romantic calendar planning rule B — Players can propose romantic plans with dates and optional times, and accept, reschedule, or decline.
- romantic plan reminder rule B — Automatic in-game reminders one day before and on the day of confirmed plans.
- completed romantic plan rule B — Confirm completion, reschedule, or mark missed; completed plans can be proposed for Shared Memories.
- romantic plan achievements rule B — Mutually confirmed completed romantic plans count toward Love Legends records and shared achievements.
- recurring romantic plans rule C — Recurring plans plus named romantic traditions with completion counts and celebrations.
- romantic tradition management rule B — Either player can pause or skip; schedule changes and permanent cancellation require mutual approval; history is preserved.
- Our Traditions collection rule B — Dedicated illustrated Our Traditions gallery with completion counts, schedules, history, milestones, and related memories.
- spontaneous traditions rule C — Scheduled and spontaneous traditions plus a Let's Do This invitation button.
- tradition card personalization rule B — Choose illustrated covers or upload photos, with mutually approved cover changes.
- tradition conversations rule B — Permanent tradition comments, replies, and emoji reactions.
- tradition milestone keepsake rule B — Automatically generated illustrated tradition milestone keepsakes, with optional mutually approved Shared Memories inclusion.
- romantic tradition goals rule B — Optional mutually approved tradition goals with targets, deadlines, progress bars, and celebrations.
- missed tradition goal rule B — Mark overdue goals Not Quite Yet and allow mutually approved extensions, restarts, or archiving.
- multiple tradition goals rule B — Multiple active goals per tradition with individual targets, deadlines, progress, and mutual approval.
- approved tradition goal editing rule B — Either player can propose goal changes requiring mutual approval, preserving progress.
- romantic tradition goal rewards rule B — Optional mutually approved romantic rewards unlocked on goal completion through the coupon system.
- collaborative tradition goals rule B — Mutually approved collaborative goals spanning multiple traditions, with progress tracking and rewards.
- collaborative goal progress rule B — Each tradition has an individual required target, with an overall progress bar; all targets must be met.
- collaborative goal organization rule B — Dedicated Our Goals tab within Traditions, separating individual and collaborative goals.
- collaborative goal celebration rule B — Illustrated collaborative goal keepsake with completed targets, date, and optional mutually approved Shared Memories inclusion.
- repeating collaborative goals rule B — Do It Again button creates a mutually approved new attempt, resetting progress but preserving history.
- collaborative goal templates rule C — Customizable romantic goal templates plus a Surprise Us random goal suggestion button.
- goal template organization rule B — Illustrated goal templates organized into five romantic themes, with category-specific Surprise Us suggestions.
- goal template collection size rule B — 50 templates, 10 per category.
- Surprise Us repetition rule B — Prioritize uncompleted templates, exclude active goals, and allow repeats when all eligible templates have been completed.
- favorite goal templates rule C — Personal favorites plus an Our Favorites badge and filter for templates both players favorite.
- custom goal templates rule C — Personal custom templates plus mutually approved shared templates eligible for favorites and Surprise Us.
- shared custom template editing rule B — Either player can propose edits or deletion requiring mutual approval; existing goals remain unchanged.
- custom goal template cover rule B — Choose predefined illustrations or upload photos, with mutual approval for shared cover changes.
- custom template category rule B — Custom templates use the existing five romantic categories, with Custom labels and My/Our Templates filters.
- Surprise Us custom template rule B — Surprise Us includes official and mutually approved shared custom templates, excluding private templates.
- Surprise Us reroll rule B — Three random eligible goal suggestions at once, with unlimited Show Me Three More rerolls.
- Surprise Us reveal animation rule B — Three illustrated cards flip over one by one, with a skippable animation.
- Surprise Us player interaction rule B — Private browsing plus asynchronous shared Surprise Us sessions where partners choose or reroll suggestions together.
- shared Surprise Us session expiration rule B — Shared sessions never expire and remain in the Inbox until completed or closed.
- multiple shared Surprise Us sessions rule B — Unlimited simultaneous shared Surprise Us sessions, each independently managed in the Inbox.
- Surprise Us suggestion interactions rule B — Each suggested goal supports emoji reactions and comments preserved in session history.
- Surprise Us session completion rule B — Convert the selected suggestion into a customizable goal, preserving the session conversation in its details.
- rejected Surprise Us suggestions rule B — Previously suggested goals can be reopened and proposed again, preserving comments and reactions.
- seasonal romantic goal rule B — Special illustrated seasonal romantic goal collections for holidays and occasions.
- seasonal template availability rule B — Seasonal templates remain available year-round, with holiday features and seasonal Surprise Us prioritization.
- seasonal goal template count rule B — 60 seasonal templates, ten per collection, for 110 total official templates.
- custom seasonal collection rule B — Players can propose mutually approved shared seasonal collections with names, covers, descriptions, and optional annual dates.
- custom collection Surprise Us rule C — Collection filters plus a dedicated Surprise Me button on each custom collection.
- custom collection milestone rule B — Automatic illustrated keepsakes at 5, 10, 25, 50, and 100 completed goals, with optional Shared Memories approval.
- custom collection gallery rule B — Automatic collection galleries showing approved photos and keepsakes from completed goals.
- custom collection archiving rule B — Mutually approved archive and restore, preserving all collection history and excluding archived collections from Surprise Us.
- custom collection editing rule B — All collection edits require mutual approval, preserving existing content and history.
- custom collection rematch persistence rule B — Custom collections belong to the couple and persist across all rematches with their full history.
- shared dashboard collections rule B — Dashboard automatically features up to three upcoming or recently active collections.
- dashboard upcoming events rule B — Dashboard shows a Coming Up for Us widget with the next three events, dates, and countdowns.
- dashboard personalization rule C — Mutually approved couple photo, customizable frame, background color, and romantic caption.
- couple nickname rule B — Mutually approved couple nickname displayed on the dashboard and romantic keepsakes.
- personal romantic nickname rule B — Each player can privately assign a nickname to their partner, visible only in their own game interface.
- personalized welcome greeting rule C — Personalized greetings plus custom surprise welcome messages written by each partner.
- surprise love notes rule C — Inbox notes, surprise envelopes, and hidden love notes triggered by specific game locations or actions.
- discovered hidden love notes rule C — Discovered notes are saved in an illustrated Treasure Box with favorites, filters, and optional mutually approved Shared Memories.
- scheduled love notes rule B — Players can schedule notes for future dates and optional times; hidden notes still require their trigger.
- love note attachment rule C — Full multimedia love notes with text, emojis, photos, GIFs, and short recorded or uploaded voice messages.
- voice message duration rule B — Maximum 2 minutes per voice message, recorded or uploaded.
- love note stationery rule B — Players choose from illustrated envelope and stationery designs, permanently preserved with each note.
- mystery love notes rule B — Optional mystery envelopes hide the sender until the note is opened.

## Additional choices confirmed in this thread

- 205 B: mystery envelope hides sender until opened (also recorded above).
- 206 B: privately pin up to three discovered love notes; favorites were already approved.
- 207 B: sender can edit/cancel an unopened note, including attachments, design, schedule, and trigger. Preserve original once opened.
- 208 B: one illustrated bundle with waiting-note count and a Later option; each note remains sealed until opened individually.

### Romantic Inbox, rules 57–65
The Inbox preserves pending and completed conversations across rematches and cancelled-match replacements. Turn reminders are dismissible and never block play. Illustrated cards open conversations with timestamps, per-player unread cursors, reactions, sender-only edits and deletion placeholders. Confirmation remains separate from acceptance and messaging.
Photos and GIF uploads up to 500 KB are stored in the existing Firebase shared save (no new storage service configuration). Direct HTTPS GIF references are also supported; their availability depends on the external host. Uploaded media has no expiry. Deleting a message removes its media from both the live Inbox and saved match snapshots. No browser push notifications are used.
Validation: 58 reducer tests, production build, and mobile Inbox browser smoke covering upload/reload, editing, reactions, deletion and sender ownership.

### Rules 66–76 follow-up
Property purchases, building changes, mortgages and trade offers/acceptance now open a financial confirmation with projected balance and rent changes. Cancelling is read-only; stale confirmations require review again. Tile inspection opens a compact live property summary and full deed. Portfolio groups properties by color, stations and utilities, with ownership filters and group completion counts.
Romantic conversations support personal hiding/restoration and partner-approved permanent removal, including archived copies. Opening a thread reads new activity while it remains open, and senders see Seen for tracked messages. Turn UI includes a banner, last-turn recap, token highlight and Secret Room turn badge.
Validation: 60 unit tests, production build and mobile management smoke (cancel/confirm purchase, portfolio filters, deed, hide/restore and mutually accepted deletion).
