# User Management Scripts

This directory contains utility scripts for managing user roles and viewing user information.

## Scripts

### 0. Cleanup Store Plans By Active VTU
**Command:** `npm run cleanup-store-plans -- [--apply]`

Removes store plans that do not match the current active VTU provider plan type:
- `xpresdata` keeps `XpresDataOffer`
- `myzta` keeps `MyztaDataPlan`

This script runs as a dry run by default and prints impacted stores.

**Usage:**
```bash
# Preview only (no writes)
npm run cleanup-store-plans

# Persist cleanup to database
npm run cleanup-store-plans -- --apply
```

---

### 1. Make User Admin
**Command:** `npm run make-admin <email>`

Makes a user an admin without needing MongoDB GUI or manual database updates.

**Usage:**
```bash
npm run make-admin user@example.com
```

**Output:**
```
✓ Successfully made John Doe (user@example.com) an admin
```

---

### 2. Change User Role
**Command:** `npm run change-role <email> <role>`

Changes a user's role to either `user` or `admin`.

**Usage:**
```bash
# Make user an admin
npm run change-role user@example.com admin

# Revoke admin access
npm run change-role admin@example.com user
```

**Valid Roles:**
- `user` - Regular user
- `admin` - Admin with full access to admin panel

---

### 3. List All Users
**Command:** `npm run list-users`

Displays all users in the database with their details including role, status, and creation date.

**Usage:**
```bash
npm run list-users
```

**Output:**
```
=== Users List ===

1. John Doe
   Email: john@example.com
   Role: 👑 ADMIN
   Status: ✓ Active
   Created: 12/15/2024

2. Jane Smith
   Email: jane@example.com
   Role: user
   Status: ✓ Active
   Created: 12/14/2024

Total Users: 2
```

---

## Quick Start

1. **Create your first admin:**
   ```bash
   npm run make-admin your-email@example.com
   ```

2. **Verify the change:**
   ```bash
   npm run list-users
   ```

3. **Log in** to the application with your email and password

4. **Access admin panel** at `/admin`

---

## Notes

- All scripts require `.env` file to be configured with `MONGODB_URI`
- Scripts must be run from the backend directory
- Use `npm run` commands instead of `node scripts/` for consistency
