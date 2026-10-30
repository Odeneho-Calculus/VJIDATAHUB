# VJI DATA HUB  DATA HUB 📡

A modern data bundle reseller platform built with **React + Vite + Tailwind CSS** (frontend) and **Express.js + MongoDB** (backend).

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier available)
- npm or yarn

### Setup

1. **Clone or navigate to project**
```bash
cd datasite
```

2. **Update MongoDB Connection**
   - Get your connection string from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Update `backend/.env` (make sure database name is `datasite`):
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/datasite?retryWrites=true&w=majority
   ```
   - **Note:** If password contains special characters (like @), URL-encode them (@ = %40)

3. **Install Dependencies**
```bash
npm install  # Root
```

### Running Locally

**Option 1: Both frontend and backend together**
```bash
npm run dev
```

**Option 2: Separately**
```bash
# Terminal 1 - Backend
cd backend
npm run dev
# → http://localhost:5000

# Terminal 2 - Frontend  
cd frontend
npm run dev
# → http://localhost:5173
```

## Project Structure

```
datasite/
├── backend/                 # Express.js API
│   ├── src/
│   │   ├── models/         # MongoDB schemas
│   │   ├── routes/         # API endpoints
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth, validation
│   │   └── config/         # Database setup
│   ├── .env                # Secrets (don't commit)
│   └── package.json
│
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── components/     # Reusable UI
│   │   ├── pages/          # Route pages
│   │   ├── context/        # Global state
│   │   ├── services/       # API calls
│   │   └── App.jsx         # Router setup
│   ├── .env.local          # Dev config
│   └── package.json
│
├── DATASITE_UPGRADE.md     # Full migration guide
├── IMPLEMENTATION_SUMMARY.md # What was built
├── TESTING_GUIDE.md        # How to test
└── package.json            # Root scripts
```

## API Endpoints

**Auth**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get profile (protected)

**User**
- `GET /api/user/profile` - Get full profile (protected)
- `PUT /api/user/profile` - Update profile (protected)

**Wallet**
- `GET /api/wallet/balance` - Get balance (protected)
- `POST /api/wallet/topup` - Add funds (protected)
- `GET /api/wallet/transactions` - Transaction history (protected)

**Purchases**
- `POST /api/purchases/create` - Buy data (protected)
- `GET /api/purchases/list` - Purchase history (protected)

## Features

✅ User Authentication (JWT + bcrypt)
✅ Responsive Design (mobile-first)
✅ Dark/Light Theme Toggle
✅ Wallet Management
✅ Data Purchase System
✅ Transaction History
✅ Protected Routes
✅ Error Handling
✅ Loading States

## Technology Stack

**Frontend**
- React 18 + Vite
- React Router
- Axios
- Tailwind CSS
- Lucide Icons

**Backend**
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcryptjs (password hashing)
- CORS

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/datasite?retryWrites=true&w=majority
JWT_SECRET=your_secret_key_min_32_characters
JWT_EXPIRE=30d
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:5000/api
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxx
```

## Testing

See `TESTING_GUIDE.md` for detailed testing instructions including:
- Backend endpoint tests (curl commands)
- Frontend page tests
- Full user journey testing
- Troubleshooting

## Build & Deploy

### Build for Production
```bash
npm run build
```

### Deploy
See `DATASITE_UPGRADE.md` Phase 5 for:
- Backend deployment (Heroku/Railway/Render)
- Frontend deployment (Vercel/Netlify)
- Custom domain setup

## Documentation

- **DATASITE_UPGRADE.md** - Complete migration guide (all 5 phases)
- **IMPLEMENTATION_SUMMARY.md** - Technical details & file structure
- **TESTING_GUIDE.md** - Testing procedures & troubleshooting

## Next Steps

1. ✅ Setup MongoDB Atlas connection
2. ⬜ Test backend endpoints (see TESTING_GUIDE.md)
3. ⬜ Test frontend pages
4. ⬜ Add Paystack payment integration
5. ⬜ Deploy to production

## License

MIT

## Support

For detailed implementation information, refer to the documentation files included in the project.


### Store order refund accounting

Failed paid store orders refund the original `order.amount` (customer selling price)
to the store owner's main wallet. Separate payment/transaction fees are excluded.
The purchase-time `adminBasePrice` snapshot is preserved for commission calculation.
Refunded/failed orders cannot earn commission through reconciliation.

Earned commission is reversed from the commission ledger. A margin already reserved
for payout or withdrawn is recovered through a separate negative wallet transaction,
so it is not paid twice. For example, a GHS5 order with GHS1 still earned credits
GHS5 to the main wallet and removes GHS1 from earned commission. If that GHS1 is
already reserved/paid, the refund journal records +GHS5 and a separate -GHS1 recovery;
the net wallet credit is GHS4 while the existing payout remains intact. Partial
payout allocations are recorded and legacy allocations are reconstructed in order.
Refund records retain gross refund, recovery, and net credit in their descriptions.

**Deployment:** MongoDB must support transactions (replica set or sharded cluster,
including Atlas). Refunds and commission credits deliberately fail rather than
fall back to non-atomic writes on standalone MongoDB. The database user needs the
usual application write permissions. No migration or historical balance adjustment
is automatically applied. A five-minute job retries paid, failed store orders that
remain unrefunded, excluding orders locked by an administrator.

From `backend/`:

- `npm run test:store-refunds`: isolated MongoDB replica-set integration tests.
  The test dependency downloads a MongoDB binary on first use; an existing binary
  can be supplied using `MONGOMS_SYSTEM_BINARY`.
- `npm run report-store-refund-shortfalls`: read-only JSON report using configured
  `MONGODB_URI`. No wallet writes, index creation, or automatic top-ups. Review the
  original payments, refund records, and commission/payout history before approving
  historical adjustments; missing/multiple refund records are explicitly flagged.

### Account spending reports and agent withdrawals

Admin user lists/details and user login/profile responses use the same live
spending calculation. Store sales revenue is shown separately from personal
spending. Paid orders still processing count as spent; failed, unpaid, refunded,
and store-customer orders are excluded from personal spending. Purchase amounts
exclude separately charged payment fees. Legacy purchases and transaction-only
payments are included, with linked records counted once regardless of debit sign.
Monthly spending and purchase counts use Ghana/UTC calendar months; top-ups are
reported separately. Invalid month parameters return HTTP 400.

New agent withdrawal requests accept Mobile Money only. Historical bank payouts
remain readable. Run `npm run test:account-stats` in `backend/` for isolated
MongoDB integration tests for spending, monthly endpoints, and withdrawal methods.
