const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const claimRoutes = require("./routes/claimRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const policyRoutes = require("./routes/policyRoutes"); // Import policy routes

const app = express();

connectDB();

const allowedOrigins = [
  "https://adjudica-tan.vercel.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/claims", claimRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/policy", policyRoutes); // Use policy routes

app.get("/", (req, res) => {
  res.send("Claim Adjudication API Running");
});

// ── Error handling (must be after all routes) ──────────────────────────────
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});