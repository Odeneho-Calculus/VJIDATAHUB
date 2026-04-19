# Repository Guidelines

## Project Structure & Module Organization
The repository is structured into two main applications: `backend/` and `frontend/`.

- **Backend**: An Express.js API using MongoDB/Mongoose. It follows a standard MVC pattern with `models/` for schemas, `routes/` for API endpoints, `controllers/` for business logic, and `middleware/` for authentication and validation.
- **Frontend**: A React application built with Vite and Tailwind CSS. It organizes code into `components/` for reusable UI, `pages/` for route-level components, `context/` for global state, and `services/` for API calls.

## Build, Test, and Development Commands
Commands should be executed within their respective directories.

### Backend (`/backend`)
- `npm run dev`: Start development server with nodemon.
- `npm start`: Start production server.
- `npm run lint`: Run ESLint code quality checks.
- `npm run make-admin <email>`: Grant admin privileges to a specific user.
- `npm run list-users`: List all registered users in the database.
- `npm run cleanup-store-plans`: Preview cleanup of store plans.
- `npm run cleanup-store-plans -- --apply`: Apply store plan cleanup to the database.

### Frontend (`/frontend`)
- `npm run dev`: Start Vite development server.
- `npm run build`: Build optimized production assets.
- `npm run lint`: Run ESLint checks.
- `npm run type-check`: Perform TypeScript type checking.
- `npm run preview`: Preview the production build locally.

## Coding Style & Naming Conventions
- **Linting**: Both sub-projects use **ESLint**. Backend code uses `commonjs` modules, while frontend uses ESM (`module`).
- **Styling**: **Tailwind CSS** is used for all frontend styling.
- **Typing**: The frontend is built with **TypeScript**. Always ensure `npm run type-check` passes to maintain type safety.

## Testing Guidelines
The project currently relies on manual testing. Key API endpoints (Auth, User, Wallet, Purchases) should be verified after changes. Refer to the root `README.md` for the complete list of endpoints and setup instructions.

## Commit & Pull Request Guidelines
Commit messages should be concise and descriptive of the specific change (e.g., `fix wallet top up issues`, `add percentile fees`). While not strictly enforcing Conventional Commits, maintaining clear, task-focused history is preferred.
