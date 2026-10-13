Payment is manual. Players send money themselves by bKash, bank, or cash. The app does not collect it. It stores the instructions on the game, and a paid flag on each joined player.

The instructions are `paymentInfo` on the game document. Staff write them when creating or editing a game. The field is optional. A blank value means the game has no payment section, no paid count, and no confirm button. Games created before this field existed stay that way until staff add instructions.

What to write is free text: the amount, a bKash number, bank details, and what to put as the reference. Line breaks are kept.

## Who has paid

Each joined player is a document under `games/{id}/participants/{id}`. Confirming sets:

- `paid: true`
- `paidAt` — server time
- `paidBy` — the uid of the person who confirmed (the player, or a staff member)

Clearing removes those three fields.

A signed-in player who joined the game can mark or undo their own payment. Guests have no account, so they cannot confirm.

After the match time has ended, the teams panel gains a **Payment** tab next to **Teams**. Teams stays selected. The Payment tab shows the instructions, a count such as **8 of 12 paid**, then the joined players two to a row. Each row has a **Pay** button. A signed-in player clicks their own. Staff can click any row, including guests. The button says **Pay** in the outline style until that player is confirmed, then **Paid** in the default style. Clicking it again clears the confirmation. The team list and the joined-players list do not show payment.

Those stay hidden until the match time has ended: scheduled start plus the duration, or the kick-off clock if the match was started. A completed game shows the tab as well. A cancelled game does not. Staff can still write the instructions when they create or edit the game, before that time.

Leaving, or being removed, deletes the participant document, so the flag goes with it. Joining again starts unpaid. Swapping teams or editing a guest does not clear it.

There is no push notification for payment.
