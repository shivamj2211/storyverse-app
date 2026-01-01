# Storyverse App

Storyverse is a premium, reader‑first interactive storytelling platform.  Every story is broken into ten chapters (steps).  At the end of each chapter the reader chooses how the story continues by selecting one of ten available genres.  Each genre choice directs the reader down a unique path in the story and that choice is **locked forever** for that journey.  Stories are always human written.

This repository contains both the **frontend** (Next.js 14 App Router) and **backend** (Node.js/Express) projects, a PostgreSQL schema and seed data, and a simple admin interface for managing stories.  It also implements saved stories, ratings, premium memberships and an extensible payment gateway placeholder.

## Features

* 🔐 **Auth with Email or Phone OTP** – Sign up and sign in with a password or via a one‑time code sent to your phone.  JWT tokens secure all API calls.
* 📖 **Interactive Stories** – Each story comprises 10 steps.  At the end of each step the reader chooses a genre (drama, comedy, tragedy, thriller, mystery, psychological, inspirational, slice of life, dark or philosophical).  Only the genres defined for a given node are shown.  Once a genre is chosen it cannot be changed for that run.
* 🗺️ **Journey Stepper** – A sticky stepper at the top of the reader shows the 10 steps.  Completed steps show a checkmark with a tiny genre icon.  The current step is highlighted; future steps are faded and not clickable.
* 💾 **Saved Stories** – Readers can bookmark stories to read later.  Free users may save up to **10** stories; premium users may save up to **50**.  Trying to exceed this limit returns a clear error.
* ⭐ **Ratings** – Readers may rate the genre after each chapter (1–5 stars).  The average rating for each available genre is displayed before making the next choice.  Readers may also rate an entire story.  Story ratings are used to build the “top stories” list and recommendations.
* 💳 **Premium Memberships** – Free users are limited to a single run per story; premium users may replay stories as many times as they like.  A placeholder payment route and Stripe integration are included – you can swap in your own payment provider.
* 🛠 **Admin Interface** – Upload and manage stories via a JSON package.  Stories are versioned so that editing a story never breaks existing user journeys.  Only published versions show up for readers.

## Repository Layout

```
storyverse-app/
  backend/         # Node.js/Express API
    src/
      db.ts        # database connection
      index.ts     # application bootstrap
      middlewares/ # auth, rate limiting
      routes/      # modular API routes
      utils/       # story import helper
    package.json
    tsconfig.json
  frontend/        # Next.js 14 App Router
    app/           # routes (pages)
    lib/           # API helpers, auth context
    package.json
    tsconfig.json
  schema.sql       # PostgreSQL schema and seed data
  README.md        # this file
```

## Getting Started

### Requirements

* Node.js (v18 or later)
* PostgreSQL 14+

### 1. Set up the database

1. Create a new PostgreSQL database (for example, `storyverse_dev`).
2. Run the schema script to create tables and insert seed data:

```sh
psql -U youruser -d storyverse_dev -f schema.sql
```

The script creates all necessary tables, inserts the ten genres and a demo story so you can test the app immediately.

### 2. Configure environment variables

Copy `.env.example` in both the `backend` and `frontend` directories to `.env` and fill in the missing keys.  Below are the most important variables:

#### Backend `.env`

```
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/storyverse_dev
JWT_SECRET=your_jwt_secret
ADMIN_EMAILS=admin@example.com,anotheradmin@example.com
# OTP settings
OTP_EXPIRY_MINUTES=5
OTP_REQUEST_LIMIT_PER_HOUR=5
# Stripe (optional for premium)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_12345
STRIPE_WEBHOOK_SECRET=whsec_...
```

* **PORT** – port for the Express server.
* **DATABASE_URL** – Postgres connection string.
* **JWT_SECRET** – secret used to sign JWT tokens.
* **ADMIN_EMAILS** – comma separated list of emails that are allowed to access the admin interface.  These emails will automatically be flagged as `is_admin=true` when they sign up.
* **Stripe variables** – set these if you intend to support premium subscriptions via Stripe.  If left blank, premium upgrade actions will simulate success without charging anything.

#### Frontend `.env`

```
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

* **NEXT_PUBLIC_API_URL** – base URL pointing to the backend API.
* **NEXT_PUBLIC_STRIPE_PUBLIC_KEY** – your Stripe publishable key used to create checkout sessions.

### 3. Install dependencies and run

From the project root run:

```sh
cd backend && npm install
cd ../frontend && npm install
```

Then in separate terminals:

```sh
cd backend
npm run dev

cd ../frontend
npm run dev
```

The backend will start on `http://localhost:4000` and the frontend on `http://localhost:3000` by default.  You can override ports via `.env` files.

## Story Packages

Stories are imported via JSON packages using the admin interface (`/admin/stories/upload`).  Each package defines a story, one version and the list of nodes and choices.  See below for the expected format:

```json
{
  "story": {
    "title": "A Day in the Life",
    "summary": "Follow the routine of an ordinary person.",
    "coverImageUrl": ""
  },
  "version": {
    "versionName": "v1",
    "notes": "Initial release"
  },
  "nodes": [
    {
      "nodeCode": "S1",
      "stepNo": 1,
      "title": "Morning",
      "content": "You wake up and decide how to start your day.",
      "isStart": true
    },
    {
      "nodeCode": "S2D",
      "stepNo": 2,
      "title": "Drama morning",
      "content": "Your alarm doesn’t ring and you’re late!",
      "isStart": false
    }
  ],
  "choices": [
    {
      "fromNodeCode": "S1",
      "genreKey": "drama",
      "toNodeCode": "S2D"
    }
  ]
}
```

Validation rules enforced by the backend:

* Each package must define **exactly one** `isStart` node.
* `stepNo` must be between 1 and 10.
* `nodeCode` values must be unique within the version.
* All `fromNodeCode` and `toNodeCode` values must refer to nodes declared in the package.
* `genreKey` must be one of the ten valid genres.
* All nodes should be reachable from the start node; unreachable nodes are allowed but flagged as warnings.

## Payment Integration

The backend includes a placeholder for integrating a payment provider (Stripe by default) to upgrade users to premium.  You must supply your own Stripe keys in `.env` and set `STRIPE_PRICE_ID` to the ID of a recurring or one‑time price.  The `/api/premium/create-checkout-session` route creates a checkout session and returns a URL that the frontend redirects to.  A basic webhook endpoint is present for Stripe’s `checkout.session.completed` events which upgrades the user to premium.

If you prefer a different payment gateway, implement the `POST /api/premium/create-checkout-session` and the corresponding webhook in `src/routes/premium.ts` to fit your provider.

## Ratings

Readers may rate both individual genres and entire stories.  After reading each chapter the reader must provide a rating (1–5 stars) for that genre.  The API stores ratings tied to the run and node and exposes the aggregate average rating for each available genre before the next choice.  Stories can also be rated via the story detail page.  The `/api/stories` endpoint returns the average story rating, and `/api/stories/top` returns the highest‑rated stories for recommendations.

## How It Works

1. **Start**: A reader visits `/stories` and selects a story.  On the detail page they can save the story, see the rating and read a summary.  They click Start; the backend creates a `story_run` record referencing the latest published version of the story and its start node.
2. **Read & Rate**: The reader is shown the node content and a rating component.  After rating, they choose a genre from the available options.  The backend locks the choice and moves them to the next node, returning that node’s content and the average ratings for the next set of genres.
3. **Repeat**: Steps 1 and 2 continue until step 10 or when the story ends.  When no further choices exist the run is marked as completed.  Premium users may replay the story; free users cannot.
4. **Admin**: Admins log in with a pre‑approved email.  They can upload new stories or new versions of existing stories.  Only one version of a story can be published at a time; older published versions remain accessible for active runs but hidden from new readers.

## Contributions and Extensions

Storyverse is a template for building a sophisticated interactive fiction platform.  Some ideas for extensions:

* Expand the admin UI to edit existing nodes and choices directly in the browser.
* Add user profiles and social sharing of runs and reviews.
* Implement real‑time multiplayer reading where friends can vote on choices.
* Provide analytics dashboards for story authors.

Feel free to fork this project and adapt it for your own narrative experiments!