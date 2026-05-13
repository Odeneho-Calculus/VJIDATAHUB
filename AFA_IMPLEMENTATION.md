# Topza AFA Registration - API Implementation Guide (v1)

This guide explains how to integrate Topza's AFA (Account For All) registration service into your third-party application using our v1 API.

## 1. Authentication

All requests to the Topza API must be authenticated using your API Key.

**Header:** `X-API-Key: topza_your_api_key_here`

---

## 2. Service Availability & Fee

Before submitting a registration, it is recommended to check if the service is enabled and what the current registration fee is.

### Check Lock Status
**Endpoint:** `GET /api/v1/afa/lock-status`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "message": "",
    "registrationFee": 15
  }
}
```
- **enabled**: If `false`, registration is currently disabled (usually for maintenance).
- **message**: Maintenance message if the service is disabled.
- **registrationFee**: The amount that will be deducted from your wallet upon successful submission.

---

## 3. Submit AFA Registration

This endpoint creates a new AFA registration for a customer.

**Endpoint:** `POST /api/v1/afa/register`
**Content-Type:** `application/json`

### Request Body Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | Yes | Full name of the applicant |
| `phoneNumber` | String | Yes | **MTN Only**. Valid 10-digit Ghanaian number |
| `idNumber` | String | Yes | Ghana Card ID number |
| `occupation` | String | Yes | Applicant's occupation |
| `location` | String | Yes | Residential location / City |
| `region` | String | Yes | Region in Ghana |
| `dateOfBirth` | String | Yes | Applicant's date of birth (YYYY-MM-DD) |

### Example Request
```bash
curl -X POST https://api.topzagh.com/api/v1/afa/register \
  -H "X-API-Key: topza_xxxxxxxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phoneNumber": "0240000000",
    "idNumber": "GHA-000000000-0",
    "occupation": "Engineer",
    "location": "Accra",
    "region": "Greater Accra",
    "dateOfBirth": "1990-01-01"
  }'
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "AFA Registration submitted successfully",
  "data": {
    "id": "607f1f77bcf86cd799439011",
    "registrationId": "GHA-716763357-7",
    "name": "John Doe",
    "phoneNumber": "0240000000",
    "status": "completed",
    "registrationPrice": 15,
    "submittedAt": "2026-03-07T18:30:00.000Z"
  }
}
```

---

## 4. View Your Registrations

Fetch a history of all AFA registrations submitted through your account.

**Endpoint:** `GET /api/v1/afa/my-registrations`

**Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "607f1f77bcf86cd799439011",
      "registrationId": "GHA-716763357-7",
      "name": "John Doe",
      "phoneNumber": "0240000000",
      "status": "completed",
      "submittedAt": "2026-03-07T18:30:00.000Z"
    }
  ]
}
```

---

## 5. Important Notes & Validations

1. **MTN Only**: The AFA bundle is currently only available for MTN Ghana phone numbers. Submitting any other network will result in a `400 Bad Request` error.
2. **Wallet Balance**: Ensure your wallet has sufficient balance before calling the register endpoint. The `registrationFee` is deducted immediately.
3. **Ghana Card**: A valid Ghana Card ID is required for all registrations.
4. **Idempotency**: Avoid double-clicking or rapid repeated requests for the same applicant to prevent multiple deductions.

## Error Codes

- `400 Bad Request`: Missing required fields, invalid phone number (non-MTN), or insufficient balance.
- `401 Unauthorized`: Missing or invalid API Key.
- `403 Forbidden`: Service is currently disabled for maintenance.
- `500 Internal Server Error`: An error occurred on the server or with the third-party provider.
