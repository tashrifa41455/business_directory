const express = require("express");
const cors = require("cors");
const businessRoutes = require("./routes/businesses");

const app = express();

// Render sits behind a proxy; this lets rate limiting see the real visitor IP.
app.set("trust proxy", 1);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
  : true; // no CORS_ORIGIN set: any website may call the API

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "20kb" }));

// Health check - open the API URL in a browser to confirm it is awake.
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "business-directory-api" });
});

app.use("/api/businesses", businessRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// Central error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "The request body is not valid JSON." });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

module.exports = app;
