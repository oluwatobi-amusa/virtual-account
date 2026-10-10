# Virtual Account Admin

Open `/dashboard` for Overview, `/dashboard/merchants` for Merchants, and
`/dashboard/disputes` for transaction lookup. The root URL redirects to Overview.

The dashboard reuses the starter's layout and UI components. No virtual-account
backend endpoints exist in this starter. Replace the methods in
`app/(dashboard)/dashboard/queries/virtual-accounts.ts` with API requests to connect
a backend. React Query manages loading, errors, retry and refreshed data.

Mock records include 12 merchants, 27 tills, multiple businesses, missing profile
fields and documents, and all requested statuses. Combined balances and counts
are computed from till records. Payment Value sums successful credits. Dates use
Africa/Lagos. Only the last four BVN digits are included in the mock data.

Account disabling is saved in localStorage under
`virtual-account-disabled-tills-v1`. Delete that key to reset mock account status.
The sample PDF and image uploads are demonstration documents.

## Verification

Run `npm run check-types` and `node --test tests/virtual-accounts.test.cjs`.

For manual lookup checks, use:

- `VA-001-0001`: successful transaction.
- `VA-001-0006`: failed transaction.
- `VA-001-0007`: pending transaction.
- `NOT-FOUND`: no match.
- `DEMO-ERROR`: service failure with retry.

Adebayo Retail has two businesses and seven tills. Switch businesses in Profile
and Documents to see coordinated updates; filter businesses in Till accounts.
Lagos Books has no tills, and Adebayo Retail Branch 5 has no transactions.

Check merchant and transaction filters together, move to page two, then change a
filter to confirm pagination resets. Check that disabling requires confirmation,
Cancel preserves status, and confirming persists Disabled after reload. On small
screens, navigation opens from the header and tables scroll horizontally.
