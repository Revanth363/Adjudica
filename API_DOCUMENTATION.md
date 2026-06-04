# API Documentation

All routes are prefixed with the base path `/api`.

---

## Claims Endpoints

### POST `/api/claims`
**Purpose**: Submit a new insurance claim.

**Request Body** (JSON):
```json
{
  "member_id": "EMP001",
  "member_name": "Rajesh Kumar",
  "member_join_date": "2024-01-01",
  "claim_amount": 1500
}
```

**Response** (JSON):
```json
{
  "claim_id": "CLM123",
  "decision": "APPROVED",
  "approved_amount": 1350
}
```
---
### GET `/api/claims`
**Purpose**: Retrieve a list of all claims. Optional query parameters allow filtering by status or member ID.

**Query Parameters** (optional):
- `status` – e.g., `APPROVED`, `REJECTED`.
- `member_id` – filter claims for a specific member.

**Response** (JSON array):
```json
[
  {
    "claim_id": "CLM123",
    "member_name": "Rajesh Kumar",
    "status": "APPROVED",
    "createdAt": "2026-06-04T10:12:00Z"
  },
  ...
]
```
---
### GET `/api/claims/:id`
**Purpose**: Get details of a single claim.

**Path Parameter**:
- `id` – the claim identifier (`claim_id`).

**Response** (JSON):
```json
{
  "claim_id": "CLM123",
  "member_name": "Rajesh Kumar",
  "member_id": "EMP001",
  "claim_amount": 1500,
  "decision": "APPROVED",
  "approved_amount": 1350,
  "createdAt": "2026-06-04T10:12:00Z"
}
```
---

## Review Endpoints

### GET `/api/reviews`
**Purpose**: List claims that are pending manual review.

**Response** (JSON array):
```json
[
  {
    "claim_id": "CLM789",
    "member_name": "Anita Joshi",
    "reason": "Potential fraud flag",
    "createdAt": "2026-06-04T09:45:00Z"
  },
  ...
]
```
---
### PATCH `/api/reviews/:id/approve`
**Purpose**: Approve a claim that was flagged for manual review.

**Path Parameter**:
- `id` – the claim identifier.

**Request Body** (optional): May include reviewer notes.
```json
{ "notes": "Reviewed and approved after verification." }
```

**Response** (JSON):
```json
{ "status": "APPROVED", "reviewedBy": "reviewer@example.com" }
```
---
### PATCH `/api/reviews/:id/reject`
**Purpose**: Reject a claim that was flagged for manual review.

**Path Parameter**:
- `id` – the claim identifier.

**Request Body** (optional): May include reason for rejection.
```json
{ "reason": "Documentation missing" }
```

**Response** (JSON):
```json
{ "status": "REJECTED", "reviewedBy": "reviewer@example.com" }
```
---
### PATCH `/api/reviews/:id/notes`
**Purpose**: Add or update reviewer notes without changing the decision.

**Path Parameter**:
- `id` – the claim identifier.

**Request Body** (JSON):
```json
{ "notes": "Need clarification on diagnosis code." }
```

**Response** (JSON):
```json
{ "status": "PENDING", "notes": "Need clarification on diagnosis code." }
```
---

*All endpoints return standard HTTP status codes (200 for success, 400 for bad request, 404 for not found, 500 for server error).*
