const express = require("express");
const rateLimit = require("express-rate-limit");
const Business = require("../models/Business");

const router = express.Router();
const { CATEGORIES } = Business;

// Stop one visitor from flooding the directory with submissions.
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many submissions from this connection. Try again later." },
});

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET /api/businesses?q=bakery&category=Food
router.get("/", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";

    const filter = {};
    if (category) {
      if (!CATEGORIES.includes(category)) return res.json([]);
      filter.category = category;
    }
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      filter.$or = [
        { name: pattern },
        { tagline: pattern },
        { city: pattern },
        { category: pattern },
      ];
    }

    const businesses = await Business.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .select("-__v")
      .lean();

    res.json(businesses);
  } catch (err) {
    next(err);
  }
});

// GET /api/businesses/stats  ->  { total, cities, categories }
// Must stay above any "/:id" route so "stats" is not read as an id.
router.get("/stats", async (req, res, next) => {
  try {
    const [total, cityGroups, categories] = await Promise.all([
      Business.countDocuments(),
      Business.aggregate([
        { $group: { _id: { $toLower: { $trim: { input: "$city" } } } } },
        { $count: "count" },
      ]),
      Business.distinct("category"),
    ]);

    res.json({
      total,
      cities: cityGroups.length ? cityGroups[0].count : 0,
      categories: categories.length,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/businesses  ->  201 saved business, or 400 { message, fields }
router.post("/", submitLimiter, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const { name, owner, category, city, tagline, website, email } = body;

    const business = await Business.create({
      name,
      owner,
      category,
      city,
      tagline,
      website,
      email,
    });

    const saved = business.toObject();
    delete saved.__v;
    res.status(201).json(saved);
  } catch (err) {
    if (err.name === "ValidationError") {
      const fields = {};
      for (const [key, problem] of Object.entries(err.errors)) {
        fields[key] = problem.name === "CastError" ? "Enter a valid value." : problem.message;
      }
      return res.status(400).json({ message: "Please fix the highlighted fields.", fields });
    }
    next(err);
  }
});

module.exports = router;
