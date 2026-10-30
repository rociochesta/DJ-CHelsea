# Adding Lovopoly cards

Edit `lovopoly-chance.json`, `lovopoly-community.json`, or `lovopoly-challenges.json`. Each file has a `cards` array. Copy a card, give it a new unique `id`, and edit its English title and text. Keep commas between entries; JSON does not allow comments or trailing commas.

Keep existing IDs unchanged and do not delete existing entries: saved decks, held escape cards and challenge progress reference these IDs. Editing text does not change an effect. Update the numeric fields too when changing an amount or destination.

## Chance and Community

Both decks support these effects:

| effect | Additional fields | Behavior |
| --- | --- | --- |
| `cash` | `amount` | Positive: bank pays the player; negative: player pays bank. |
| `gift` | positive `amount` | Bank pays the other player; sender pays nothing. |
| `move` | `destination` (0–39) | Advance to that board position and resolve it. Positions remain fixed even when property names change. |
| `back` | none | Move back exactly three spaces. |
| `detain` | none | Go directly to Kiss Detention. |
| `keep` | none | Keep an escape card that can be used or traded. |
| `romance` | `alternativeText` | Submit an answer for 1 heart; recipient may award 1 bonus heart. The lighter alternative earns the same reward. |

`category` is the presentation category: `financial`, `gift`, `mischief`, or `romantic`. It does not determine the effect.

Example entry to add inside either deck's `cards` array:

```json
{
  "id": "chance-date-night-bonus",
  "category": "financial",
  "title": "Date-night bonus",
  "text": "Collect $80 from the bank.",
  "effect": "cash",
  "amount": 80
}
```

New games include added cards. A saved game's current draw pile stays in its saved order; new entries join when that deck refills. Editing an existing card takes effect when it is next resolved after the updated app loads. Previously saved inbox messages keep their copied text.

## Kiss Detention challenges

`tone` is `B` for Sweet, flirty & playful, or `C` for Romantic & spicy. Challenges have no money or movement fields. The existing partner-confirmation escape rules apply to every entry.

```json
{
  "id": "escape-our-perfect-afternoon",
  "tone": "B",
  "title": "Our perfect afternoon",
  "text": "Describe a simple afternoon you would love to spend together."
}
```

Three choices are selected per detention. Already offered choices stay saved; new challenges become eligible the next time choices are generated. Completion history uses the stable IDs.

These are source files. Save, rebuild, and deploy the app for changes to appear on the live website. Adding a new effect type requires game code; adding more cards with the effects above does not.

## Hearts and expanded decks

Each deck has 60 cards: 25 financial, 20 mischief (Chance) or gifts (Community), and 15 romantic. Hearts start at zero, reset per match, and do not contribute to net worth. Only invitations drawn with heart rewards in the current active match can award hearts. Submission and the recipient’s bonus each award once. Detention challenges retain their existing escape reward.

Rolling animates and moves automatically. Spend 2 hearts immediately afterward to replace that roll and undo its landing effects. Taking another action closes the reroll opportunity. Spend 3 hearts to leave detention (the mandatory third-attempt roll still applies). Spend 4 hearts once per rent charge during that turn for the bank to cover up to $100: reimburse paid rent or pay the creditor and reduce outstanding rent debt. Hearts are not transferable.
