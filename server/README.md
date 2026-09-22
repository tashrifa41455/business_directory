# Server: Local Business Directory API

Node + Express + MongoDB (Mongoose). Deployed to Render.

## Setup

```bash
npm install
cp .env.example .env     # Windows: copy .env.example .env
```

Edit `.env` and set `MONGODB_URI` to your MongoDB Atlas connection string.
Keep the database name (`/business-directory`) before the `?`.

```bash
npm run seed             # 10 sample businesses. Skips if the database already has data.
npm start                # http://localhost:5000
npm run dev              # same, restarts when you save a file
```

To wipe every business and reseed: `npm run seed -- --force`.

## Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas connection string |
| `PORT` | no | Defaults to 5000. Render sets it for you. |
| `CORS_ORIGIN` | no | Comma-separated websites allowed to call the API. Leave it out to allow any. |

## Routes

| Route | Description |
| --- | --- |
| `GET /` | Health check: `{ "status": "ok" }` |
| `GET /api/businesses` | All businesses, newest first (max 200). Optional `?q=` and `?category=`. |
| `GET /api/businesses/stats` | `{ total, cities, categories }` |
| `POST /api/businesses` | Create a business. `201` with the saved document, or `400` with `{ message, fields }`. |

## Files

- `server.js`: connects to MongoDB, then starts listening
- `app.js`: Express app (CORS, JSON body, routes, error handler)
- `routes/businesses.js`: the three routes, search escaping and rate limiting on POST
- `models/Business.js`: schema, category list and validation messages
- `seed.js`: sample data

## Deploy to Render

Root directory `server`, build command `npm install`, start command `npm start`, one environment variable `MONGODB_URI`.
