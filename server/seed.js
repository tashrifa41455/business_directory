// Loads 10 sample businesses so the directory isn't empty while you build.
//   npm run seed              adds them only if the collection is empty
//   npm run seed -- --force   wipes ALL businesses first, then adds them
require("dotenv").config();
// Optional: if Atlas fails with "querySrv ECONNREFUSED", set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env
if (process.env.DNS_SERVERS) {
  require("dns").setServers(process.env.DNS_SERVERS.split(",").map((s) => s.trim()).filter(Boolean));
}
const mongoose = require("mongoose");
const Business = require("./models/Business");

const force = process.argv.includes("--force");

const samples = [
  {
    name: "Golden Crust Bakery",
    owner: "Amelia Hart",
    category: "Food",
    city: "Riverton",
    tagline: "Sourdough, pastries and coffee, baked before sunrise.",
    website: "https://goldencrust.example.com",
    email: "hello@goldencrust.example.com",
  },
  {
    name: "Thread & Needle Tailors",
    owner: "Marcus Bell",
    category: "Fashion",
    city: "Maplewood",
    tagline: "Alterations and made-to-measure clothing since 1994.",
    website: "https://threadandneedle.example.com",
    email: "studio@threadandneedle.example.com",
  },
  {
    name: "ByteFix Repairs",
    owner: "Priya Nair",
    category: "Tech",
    city: "Riverton",
    tagline: "Same-day phone and laptop repairs while you wait.",
    website: "https://bytefix.example.com",
    email: "support@bytefix.example.com",
  },
  {
    name: "Willow Wellness Clinic",
    owner: "Dr. Elena Ruiz",
    category: "Health",
    city: "Oakdale",
    tagline: "Family physiotherapy and health checkups. Walk-ins welcome.",
    website: "https://willowwellness.example.com",
    email: "reception@willowwellness.example.com",
  },
  {
    name: "BrightPath Tutoring",
    owner: "Samuel Okafor",
    category: "Education",
    city: "Brookhaven",
    tagline: "Maths and science tutoring for grades 6 to 12.",
    website: "https://brightpath.example.com",
    email: "learn@brightpath.example.com",
  },
  {
    name: "QuickWash Laundry",
    owner: "Hannah Lee",
    category: "Services",
    city: "Maplewood",
    tagline: "Wash, fold and doorstep delivery within 24 hours.",
    website: "https://quickwash.example.com",
    email: "orders@quickwash.example.com",
  },
  {
    name: "Corner Page Books",
    owner: "Tomas Varga",
    category: "Retail",
    city: "Lakeside",
    tagline: "New and used books, plus a quiet reading nook.",
    website: "https://cornerpage.example.com",
    email: "shop@cornerpage.example.com",
  },
  {
    name: "Spice Route Kitchen",
    owner: "Ayesha Rahman",
    category: "Food",
    city: "Northfield",
    tagline: "Slow-cooked curries and fresh flatbreads, dine-in or takeaway.",
    website: "https://spiceroute.example.com",
    email: "table@spiceroute.example.com",
  },
  {
    name: "Sparrow Cycles",
    owner: "Jonas Weber",
    category: "Other",
    city: "Lakeside",
    tagline: "Bike tune-ups, rentals and Sunday morning group rides.",
    website: "https://sparrowcycles.example.com",
    email: "ride@sparrowcycles.example.com",
  },
  {
    name: "Green Thumb Nursery",
    owner: "Grace Mwangi",
    category: "Retail",
    city: "Brookhaven",
    tagline: "Indoor plants, pots and friendly gardening advice.",
    website: "https://greenthumb.example.com",
    email: "grow@greenthumb.example.com",
  },
];

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI. Copy .env.example to .env first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const existing = await Business.countDocuments();
  if (existing > 0 && !force) {
    console.log(`Skipped: the database already has ${existing} businesses.`);
    console.log("Run `npm run seed -- --force` if you really want to wipe and reseed.");
    return;
  }

  if (force) await Business.deleteMany({});

  // Space the timestamps out so "newest first" has a stable order.
  const now = Date.now();
  const docs = samples.map((sample, index) => ({
    ...sample,
    createdAt: new Date(now - index * 60 * 60 * 1000),
  }));

  await Business.insertMany(docs);
  console.log(`Seeded ${docs.length} businesses.`);
}

run()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
