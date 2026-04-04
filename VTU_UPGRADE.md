# VTU Service Upgrade & Integration Guide

This document details the implementation of the multi-provider VTU system (specifically **DataBossHub** and **XpresData**) in the `VJI DATA HUB ` platform. It serves as a complete reference for replicating this functionality in other projects.

## 1. System Architecture Overview

The system uses a **Global System Setting** to dynamically switch between active VTU providers. This architecture decouples the frontend user experience from the backend service provider, allowing seamless transitions without code deployment.

### Core Components
1.  **Database Strategy**:
    *   **Settings**: `SystemSettings` collection stores the active `vtuProvider`.
    *   **Products**: Separate collections for each provider's data structure (`DataPlan` for DataBossHub, `XpresDataOffer` for XpresData).
    *   **Orders**: A unified `Order` model that records which provider fulfilled the request.

2.  **Backend Logic (Node.js/Express)**:
    *   **Controller**: `purchaseController.js` acts as the orchestrator.
    *   **Adapters**: `utils/dataBossHubApi.js` and `utils/xpresDataApi.js` encapsulate provider-specific API calls.

3.  **Frontend Logic (React)**:
    *   **Admin**: `AdminVtuSettings.jsx` allows toggling the active provider.
    *   **User**: `BuyData.jsx` dynamically renders the UI based on the active provider's data structure (e.g., categorical tabs for XpresData vs. simple lists for DataBossHub).

---

## 2. Database Schema (Mongoose)

### A. System Settings (`models/SystemSettings.js`)
Stores the active provider switch.
```javascript
const systemSettingsSchema = new mongoose.Schema({
  vtuProvider: {
    type: String,
    enum: ['databosshub', 'xpresdata'], // Expandable
    default: 'xpresdata',
  },
  // ...
}, { timestamps: true });
```

### B. Data Models
*   **DataBossHub (`models/DataPlan.js`)**:
    *   Fields: `network`, `planId`, `planName`, `costPrice`, `sellingPrice`, `dataSize`, `validity`.
*   **XpresData (`models/XpresDataOffer.js`)**:
    *   Fields: `offerSlug` (API ID), `network`, `volume` (Data Size), `costPrice`, `sellingPrice`, `agentPrice`, `vendorPrice`.
    *   *Note*: XpresData structure supports tiered pricing for agents/vendors.

### C. Unified Order Model (`models/Order.js`)
Crucial for tracking.
*   `provider`: String ('databosshub' | 'xpresdata').
*   `apiPlanId`: String (Stores the provider-specific ID used).
*   `dataBossHubOrderId`: String (Stores the external transaction ID).
*   `status`: Enum ('pending', 'processing', 'completed', 'failed').

---

## 3. Backend Implementation Details

### A. API Adapters (`backend/src/utils/`)

**1. DataBossHub Adapter (`dataBossHubApi.js`)**
*   **Base URL**: `https://www.databosshub.org/api/v1`
*   **Key Features**:
    *   `getWalletBalance()`: Fetches balance.
    *   `purchaseDataBundle(planId, phone, network)`: Sends order. Handles `500` failsafe (checks balance if API errors).
    *   `fetchAllDataPlans()`: Fetches available bundles.

**2. XpresData Adapter (`xpresDataApi.js`)**
*   **Base URL**: `https://www.xpresportal.app/api/v1`
*   **Key Features**:
    *   `getWalletBalance()`: Simulated check using `/offers` endpoint (API limitation).
    *   `purchaseDataBundle(slug, phone, network, volume)`: Sends order to `/order/{network}`.
    *   `fetchAllDataPlans()`: Fetches categorized offers.

### B. Purchase Controller Logic (`controllers/purchaseController.js`)

The `buyDataBundle` function handles the switching logic:

1.  **Determine Active Provider**:
    ```javascript
    const settings = await SystemSettings.getSettings();
    const provider = settings.vtuProvider; // 'databosshub' or 'xpresdata'
    const api = provider === 'xpresdata' ? xpresDataApi : dataBossHubApi;
    ```

2.  **Product Retrieval & Normalization**:
    *   **If DataBossHub**: Fetch from `DataPlan` by ID.
    *   **If XpresData**: Fetch from `XpresDataOffer` by ID.
    *   **Normalization**: Map the result to a common object structure (`plan`) with:
        *   `sellingPrice`
        *   `network`
        *   `apiPlanId` (For DataBossHub: `planId`, For XpresData: `${slug}|${volume}`)
        *   `provider`

3.  **Process Payment & Order**:
    *   Create `Order` record with `status: pending`.
    *   Deduct user wallet balance.
    *   **Execute API Call**: `api.purchaseDataBundle(...)`.
    *   **Handle Response**:
        *   Success: Update `Order` to `completed`/`processing`, save external IDs.
        *   Failure: Refund user, update `Order` to `failed`.

---

## 4. Frontend Integration (React)

### A. Admin Dashboard (`pages/AdminVtuSettings.jsx`)
*   **Provider Toggle**: Updates `SystemSettings`.
    ```javascript
    const handleProviderChange = async (newProvider) => {
      await adminAPI.updateSystemSettings({ vtuProvider: newProvider });
      // Triggers UI refresh
    };
    ```
*   **Dual-View UI**:
    *   Checks `activeProvider`.
    *   If `xpresdata`: Shows specific XpresData stats/warnings.
    *   If `databosshub`: Shows balance cards and sync stats.

### B. User Buy Data Page (`pages/BuyData.jsx`)
*   **Dynamic Data Fetching**:
    *   Calls `publicAPI.getActivePlans`.
    *   Response includes `{ provider: '...', grouped: { ... } }`.
*   **Adaptive UI**:
    *   **Generic**: Network tabs + Grid of plans.
    *   **XpresData Extension**: Adds "Offer Type" filter tabs (e.g., "SME", "Gifting", "Corporate") if the provider is XpresData.
    ```javascript
    {provider === 'xpresdata' && (
      <OfferTypeTabs types={offerTypes} selected={selectedOfferType} ... />
    )}
    ```

---

## 5. Step-by-Step Integration Guide for New Projects

To replicate this system in a new project:

### Step 1: Environment Setup
Add API keys to your `.env` file:
```env
DATABOSSHUB_API_KEY=your_key_here
XPRES_API_KEY=your_key_here
```

### Step 2: Backend Setup
1.  **Copy Utility Files**: Replicate `dataBossHubApi.js` and `xpresDataApi.js` in `utils/`.
2.  **Define Models**: Create the schemas for `SystemSettings`, `DataPlan`, and `XpresDataOffer`.
3.  **Implement Controller**: Copy the logic from `purchaseController.js`, ensuring you handle the `apiPlanId` generation correctly for XpresData (slug + volume).

### Step 3: Frontend Setup
1.  **API Service**: Ensure your frontend API client (`api.js`) has methods to fetch settings and plans.
2.  **Update Buy Page**: Modify your purchase page to read the `provider` field from the API response and condition the UI rendering.

### Step 4: Admin Tools
1.  **Settings Page**: Create a page to switch the `vtuProvider` setting.
2.  **Sync Tools**: Implement buttons to "Sync Plans" which calls backend functions to fetch from the provider API and upsert into your local database.

---

## 6. Critical Considerations
*   **Price Sync**: Different providers have different prices. Ensure you have a mechanism to update your selling prices when switching providers or running a sync.
*   **Order Verification**: XpresData's API might not support status checks cleanly. Implement robust error handling.
*   **Failsafes**: The DataBossHub adapter includes a "500 Error Failsafe" (checking balance after a 500 error). Keep this logic to prevent double-charging or lost orders.
