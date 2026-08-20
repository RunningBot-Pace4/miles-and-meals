# Miles & Meals v43 — Edit After Create + Quiet Settlement Refresh + Ledger Audit

## 1. Edit after create

Admin-created configuration can now be edited after creation.

### Trips

Admin → Configured trips → Edit trip

Editable:

- Trip name
- Budget
- Start date
- End date

Base currency stays locked after creation so historical expense accounting is
not silently rebased.

### Countries

Admin → Configured countries → Edit country FX

Editable:

- Default FX rate

Saving an existing country FX becomes a manual override for future expenses.
Existing expenses retain their own stored historical FX.

## 2. Mark Paid / Mark Received refresh is quiet

Settlement action buttons no longer open the full-screen SavingOverlay.

The button itself shows:

`Updating…`

After the server confirms the change, the page performs a direct hard refresh.

For installed PWA use, the custom Miles & Meals launch screen is now shown only
once per app session. Settlement refreshes in the same session skip that launch
screen, making the refresh feel immediate.

The existing automatic settlement polling for the other traveler remains
enabled.

## 3. Total received + paid/share balance audit

Settle Up now shows for the signed-in traveler:

- Expense paid
- Total received (confirmed)
- Settlement paid (confirmed)
- Personal share
- Still to receive
- Still to pay
- Confirmed balance check

The confirmed balance formula is:

```text
Expense paid
+ confirmed settlement paid
- confirmed total received
- personal share
= confirmed balance
```

A zero confirmed balance means the person’s confirmed cash history matches
their final personal share.

Every traveler card also shows:

- Expense paid
- Personal share
- Received
- Settlement paid
- Still receive
- Still pay
- Confirmed balance

## 4. Expense edited after settlement

Historical payments now remain attached to the original payer/receiver pair.

Example:

1. JY paid RM90.
2. Original split: Test RM45 + Huahua RM45.
3. Huahua paid JY RM45.
4. JY later edits the expense so Test owns the full RM90 and Huahua owns RM0.

The correct new settlement is:

```text
Test → JY      RM90
JY → Huahua    RM45
```

The old Huahua → JY RM45 remains in settlement history.

Final cash result after both new payments:

```text
JY:
- Expense paid       RM90
+ Received          RM135
- Refund paid        RM45
= Final cost           RM0

Huahua:
- Paid JY             RM45
+ Refunded            RM45
= Final cost           RM0

Test:
- Pays JY             RM90
= Final cost          RM90
```

This behavior is covered by `tests/settlement.test.ts`.

## Database

No schema migration is required for v43.

## Validation

```text
PWA: PASS
Navigation: PASS
Phase 8 / v43: PASS
Service worker syntax: PASS
Phase 8 validator syntax: PASS

125 TS/TSX files scanned
0 syntax/parse errors
0 nullability diagnostics
0 missing local imports
0 v43 non-module diagnostics

Dedicated JY/Test/Huahua settlement regression: PASS
```

## Build

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm install
npm run cleanup:legacy
npm run phase8:check
npm test
npm run build
```
