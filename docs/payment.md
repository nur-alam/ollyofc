Payment is manual. Players send money themselves by bKash, bank, or cash. The app does not collect it. It stores the instructions on the game, and a paid flag on each joined player.

The instructions are `paymentInfo` on the game document. Staff write them when creating or editing a game. The field is optional. A blank value means the game has no payment section, no paid count, and no confirm button. Games created before this field existed stay that way until staff add instructions.

What to write is free text: the amount, a bKash number, bank details, and what to put as the reference. Line breaks are kept.

## Who has paid

Each joined player is a document under `games/{id}/participants/{id}`. A player does not mark themselves paid.

Clicking **Pay** opens a box for the bKash transaction ID. Submitting sets:

- `paymentStatus: "pending"`
- `transactionId` — the ID they entered, at least 5 characters
- `paymentSubmittedAt` — when they submitted

The row then says **Pending**. A moderator or admin checks that ID in the bKash app. **Paid** means the money arrived. **Cancelled** means it did not. That writes `paymentStatus` to `paid` or `cancelled`, plus `paidBy` (the staff uid) and `paidAt`. The list updates as soon as the document changes.

If staff mark it **Cancelled**, that player’s button goes back to **Pay**. They can submit a new transaction ID, and the row becomes **Pending** again. Other people still see **Cancelled** until that happens. A player cannot set their own status to paid. Guests have no account, so staff can enter an ID for them and then verify it.

Older rows that only have `paid: true` still show as **Paid**.

After the match time has ended, the teams panel gains a **Payment** tab next to **Teams**. Teams stays selected. The Payment tab shows the instructions, a count such as **8 of 12 paid**, then the joined players two to a row. Each row shows **Pay**, **Pending**, **Paid**, or **Cancelled**. The team list and the joined-players list do not show payment.

Those stay hidden until the match time has ended: scheduled start plus the duration, or the kick-off clock if the match was started. A completed game shows the tab as well. A cancelled game does not. Staff can still write the instructions when they create or edit the game, before that time.

Leaving, or being removed, deletes the participant document, so the flag goes with it. Joining again starts unpaid. Swapping teams or editing a guest does not clear it.

There is no push notification for payment.
