const mongoose = require("mongoose");

const CATEGORIES = [
  "Food",
  "Fashion",
  "Tech",
  "Health",
  "Education",
  "Services",
  "Retail",
  "Other",
];

// Accept only http(s) addresses that look like a real host name.
function isWebAddress(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Enter the business name."],
      trim: true,
      minlength: [2, "The business name needs at least 2 characters."],
      maxlength: [80, "Keep the business name under 80 characters."],
    },
    owner: {
      type: String,
      required: [true, "Enter the owner's name."],
      trim: true,
      minlength: [2, "The owner's name needs at least 2 characters."],
      maxlength: [60, "Keep the owner's name under 60 characters."],
    },
    category: {
      type: String,
      required: [true, "Choose a category."],
      enum: { values: CATEGORIES, message: "Choose a category from the list." },
    },
    city: {
      type: String,
      required: [true, "Enter the city."],
      trim: true,
      minlength: [2, "The city needs at least 2 characters."],
      maxlength: [60, "Keep the city under 60 characters."],
    },
    tagline: {
      type: String,
      required: [true, "Add a short tagline."],
      trim: true,
      minlength: [5, "The tagline needs at least 5 characters."],
      maxlength: [120, "Keep the tagline under 120 characters."],
    },
    website: {
      type: String,
      trim: true,
      default: "",
      // "example.com" becomes "https://example.com" before validation runs.
      set: (v) =>
        typeof v === "string" && v.trim() && !/^[a-z][a-z0-9+.-]*:/i.test(v.trim())
          ? "https://" + v.trim()
          : v,
      validate: {
        validator: (v) => !v || isWebAddress(v),
        message: "Enter a valid web address, like https://example.com.",
      },
    },
    email: {
      type: String,
      required: [true, "Enter an email address."],
      trim: true,
      lowercase: true,
      maxlength: [120, "Keep the email under 120 characters."],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
    },
  },
  // Only keep createdAt - it drives the "newest first" order.
  { timestamps: { createdAt: true, updatedAt: false } }
);

businessSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Business", businessSchema);
module.exports.CATEGORIES = CATEGORIES;
