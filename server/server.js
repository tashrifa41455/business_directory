require("dotenv").config();
// Optional: if Atlas fails with "querySrv ECONNREFUSED", set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env
if (process.env.DNS_SERVERS) {
  require("dns").setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
}
const mongoose = require("mongoose");
const app = require("./app");

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error(
    "Missing MONGODB_URI. Copy .env.example to .env and paste your Atlas connection string."
  );
  process.exit(1);
}

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 10000 })
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    console.error("Check the connection string, the database user's password, and Atlas > Network Access.");
    process.exit(1);
  });
