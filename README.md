# Student Shop App (Next.js + SQLite)

Simple App Router web app for a student project:

- No authentication
- User selects an existing customer to "act as"
- SQLite database file: `shop.db` at project root
- DB access with `better-sqlite3` and prepared statements

## Pages

- `Select Customer`
- `Customer Dashboard`
- `Place Order`
- `Order History`
- `Warehouse Priority Queue`
- `Run Scoring`

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

On first use, the app initializes `shop.db` and seeds sample customers/products automatically.

## Scripts

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
