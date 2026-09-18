# Smart Settlement clarity

- Smart Settlement details now explain proven simple redirections by name and amount, including the Parent/Juehua/JY example. Complex groups use the original debt list and remaining group payment list rather than inventing a receipt-to-transfer mapping.
- Label whole-trip net positions, original bill balances, final transfer amounts and third-party bill shares distinctly.
- Explain that offsets are a suggested plan, not a payment confirmation or receipt allocation.
- Home in All trips mode shows All trips and the accessible trip count, without an active trip's name above it.
- No payment calculations, records, permissions or database schema were changed.

Deploy by copying this source into the existing Vercel-connected repository, retaining environment settings, then committing and pushing. No migration is required. This package is not automatically deployed.

Check after deployment: Parent owes JY 50.06 and Juehua owes Parent 25; details must explain Juehua's 25 redirected to JY and Parent's final 25.06. In All trips mode the hero must not say Kota Trip. Existing payment selection and partial receipt allocation remain available.
