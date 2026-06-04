const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const claimRoutes = require("./routes/claimRoutes");
const reviewRoutes = require("./routes/reviewRoutes");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/claims", claimRoutes);
app.use("/api/reviews", reviewRoutes);

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