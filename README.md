# Adjudica

## Overview
Adjudica is an AI‑powered system that helps process OPD insurance claims. It lets users upload medical documents, extracts data with Gemini Vision, runs a rule engine, and shows the decision (APPROVED, REJECTED, PARTIAL, or MANUAL_REVIEW).

## Technologies Used
- **Frontend**: Vite + React (client folder) – deployed on Vercel at https://adjudica-tan.vercel.app/
- **Backend**: Express.js (server folder) – deployed on Render (may take a while to become active)
- **File storage**: Multer middleware uploads files to Cloudinary
- **AI extraction**: Gemini Vision API (model: gemini-2.5-flash)
- **Database**: MongoDB (via Mongoose)

## Prerequisites
- Node.js (v18 or later) and npm
- An account on Cloudinary (for file uploads required api key and secret in `server/.env`)
- MongoDB connection string in `server/.env`
- Gemini Vision API key in `server/.env`

## Setup – Local Development
### 1. Clone the repo
```bash
git clone <repo-url>
cd plum
```
### 2. Install dependencies
```bash
# client
npm install   # runs inside d:/plum/client
# server
cd ../server && npm install   # runs inside d:/plum/server
```
### 3. Configure environment variables
Create two `.env` files:
- `client/.env` – VITE_API_URL should point to your local backend, e.g. `http://localhost:5000`
- `server/.env` – add:
  ```
  MONGODB_URI=your_mongodb_uri
  CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
  GEMINI_API_KEY=your_gemini_key
  PORT=5000
  ```
### 4. Run the applications
```bash
# In one terminal, start the server
cd d:/plum/server
node server.js

# In another terminal, start the client
cd d:/plum/client
npm run dev
```
Open `http://localhost:5173` in a browser to view the app.

## Deployment
- **Frontend**: Deploy the `client` folder to Vercel. The live URL is https://adjudica-tan.vercel.app/.
- **Backend**: Deploy the `server` folder to Render. After deployment, the service may take a few minutes to become active.

## File Uploads
The backend uses Multer to handle multipart/form‑data uploads. Uploaded files are sent to Cloudinary, and the returned URLs are stored in the claim record.

## Assumptions & Future Work
- The statistics shown on the home page are currently static placeholders. They may be made dynamic in a future iteration.
- Folder structure details can be found in `engine.md` and `info.txt`.

## Folder Structure (detailed)

```text
plum/
├── client/                         # Vite + React frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ClaimForm/
│   │   │   │   ├── ClaimForm.jsx
│   │   │   │   └── DocumentUpload.jsx
│   │   │   ├── DecisionCard/
│   │   │   │   ├── DecisionCard.jsx
│   │   │   │   └── EvidencePanel.jsx
│   │   │   ├── ManualReviewQueue/
│   │   │   │   └── ReviewQueue.jsx
│   │   │   └── shared/
│   │   │       ├── Badge.jsx
│   │   │       ├── ConfidenceBar.jsx
│   │   │       └── Loader.jsx
│   │   ├── pages/
│   │   │   ├── AllClaims.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── ClaimStatus.jsx
│   │   │   └── ManualReview.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── index.html
│   └── vite.config.js
├── server/                         # Express backend
│   ├── controllers/
│   │   ├── claimController.js
│   │   └── reviewController.js
│   ├── routes/
│   │   ├── claimRoutes.js
│   │   └── reviewRoutes.js
│   ├── models/
│   │   └── Claim.js
│   ├── services/
│   │   └── geminiService.js
│   ├── adjudication/
│   │   ├── index.js
│   │   ├── eligibilityCheck.js
│   │   ├── documentValidator.js
│   │   ├── coverageChecker.js
│   │   ├── limitValidator.js
│   │   ├── medicalReview.js
│   │   ├── fraudDetector.js
│   │   └── decisionBuilder.js
│   ├── middleware/
│   │   ├── upload.js
│   │   └── errorHandler.js
│   ├── config/
│   │   └── policy.js
│   ├── utils/
│   │   └── validators.js
│   ├── .env
│   └── server.js
```

---
*Happy coding!*
