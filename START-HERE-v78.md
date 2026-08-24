# Start Here — Miles & Meals v78

1. Extract the ZIP into a new folder.
2. Copy `.env.example` to `.env` and fill in the real Neon/Auth values.
3. Back up/branch Neon before any upgrade.
4. From v77: no new database migration is required. From v70 or earlier: run `npm run db:push` once after backup.
5. Run:

```powershell
npm install
npm run release:check
npm run build
npm run dev
```

6. Read `E2E-TESTING-GUIDE.md` to run the real phone/tablet/desktop browser checks.

Do not run a reset command during an upgrade.
