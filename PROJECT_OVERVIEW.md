# Scrapbook — Project Handoff & Architecture Overview

> **Target Audience:** AI Coding Assistants / Developers picking up this codebase.
> **Last Updated:** Sat Nov 21 2026
> **Repository:** `https://github.com/kaKazi107/Scrapbook` (branch `main`)

---

## 1. Executive Summary & Core Identity

**Scrapbook** is an all-in-one personal media and memory-logging mobile app designed primarily for **Android** (with Expo/iOS compatibility). It operates as a visual calendar diary for logging five distinct activity categories:
- 🎬 **Movies** (poster, director, release year, runtime)
- 📺 **TV Shows** (poster, season/episode, network)
- 🎵 **Music** (album art, artist, album name, track)
- 🍽️ **Restaurants / Food** (cuisine, location/city, price level)
- 📍 **Places / Travel** (city, country, spot type)

### Core Architectural Philosophy
- **Local-First with Cloud Sync (Path A):** The app functions 100% offline without an account using an on-device SQLite database (`expo-sqlite`) and permanent local file storage (`expo-file-system`).
- **Optional Cloud Accounts (Stage B):** When Supabase credentials (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`) are present in `.env.local`, the app enables email/password authentication, two-way SQLite ↔ Postgres sync, and uploads local camera/gallery photos to Supabase Storage.
- **Graceful Fallback:** Without env variables, the app bypasses authentication entirely and operates in local-only mode without crashing.
- **Keyless Metadata Search (Phase 4):** External API search for metadata auto-fill uses free, public endpoints (iTunes API for movies/music, TVMaze for TV, OpenStreetMap/Nominatim for places/food) with keyless HTTPS poster URLs cached on-disk via `expo-image`.

---

## 2. Tech Stack & Environment

| Layer | Technology | Usage |
|---|---|---|
| **Framework** | React Native + Expo (SDK 58) | Android-first cross-platform framework |
| **Language** | TypeScript | Strict typing across components, services, and models |
| **Navigation** | `expo-router` v4 | File-based routing with native bottom tabs (`(tabs)` group) and auth modal stack (`(auth)` group) |
| **Local DB** | `expo-sqlite` (v15+) | On-device persistent cache, full CRUD, search queries, tombstones |
| **Local Storage** | `expo-file-system` | Permanent document storage for camera/gallery photos (`entry-images/`) |
| **Image Component**| `expo-image` | Disk-cached remote posters and local photo previews |
| **Media Picker** | `expo-image-picker` | Camera capture and gallery photo selection (multiple supported) |
| **Tactile** | `expo-haptics` | Feedback on save, delete, and calendar selection |
| **Cloud Auth & DB**| Supabase JS Client (`@supabase/supabase-js`) | Postgres DB, Row-Level Security (RLS), GoTrue Auth |
| **Cloud Storage** | Supabase Storage (`entry-images` bucket) | Public read, owner-scoped write photo storage |
| **State Storage** | `@react-native-async-storage/async-storage` | Session persistence for Supabase Auth |
| **URL Polyfill** | `react-native-url-polyfill` | Required for Supabase Client in React Native |

---

## 3. Project Directory Structure

```
E:\project\opencode-project-folder\
├── .env.example               # Template for cloud environment variables
├── .env.local                 # Local environment overrides (git-ignored)
├── app.json                   # Expo configuration (scheme: scrapbook, package: com.scrapbook.app)
├── tsconfig.json              # TypeScript configuration with @/* path aliases
├── PROJECT_OVERVIEW.md        # This AI Handoff Document
├── README.md                  # Human-facing user and setup guide
│
├── supabase/
│   ├── README.md              # Walkthrough for setting up Supabase backend
│   └── migrations/
│       ├── 0001_init.sql      # Core tables (profiles, catalog_items, activity_entries), RLS, trigger, bucket
│       └── 0002_photos.sql    # Migration adding `photos jsonb` array column to activity_entries
│
└── src/
    ├── app/
    │   ├── _layout.tsx        # SQLiteProvider, AuthProvider, ThemeProvider, auth gate
    │   ├── (auth)/
    │   │   ├── _layout.tsx    # Stack screen options for auth screens
    │   │   ├── sign-in.tsx    # Email/Password sign in screen
    │   │   └── sign-up.tsx    # Create account screen
    │   └── (tabs)/
    │       ├── _layout.tsx    # Native bottom tabs layout (AppTabs)
    │       ├── index.tsx      # Home screen: Calendar grid + Timeline view toggle
    │       └── explore.tsx    # Explore screen: Search, category/rating filters, insights, account status
    │
    ├── components/
    │   ├── AddEditModal.tsx          # Full entry form: category, metadata auto-fill, poster/cover, photos
    │   ├── DayDetailModal.tsx        # Day sheet showing entries logged for a date, day cover selector, photo thumbnails
    │   ├── CalendarGrid.tsx          # Monthly grid showing day cover posters, entry count badges
    │   ├── CategoryFilter.tsx        # Category selector pills
    │   ├── EntryCard.tsx             # Card item for timeline and explore results; photo count badge
    │   ├── MetadataSearchSheet.tsx   # Search bottom sheet for iTunes/TVMaze/OSM
    │   ├── PhotoViewer.tsx           # Full-screen swipeable modal gallery for personal photos
    │   ├── RatingStars.tsx           # Interactive & read-only star rating component (0.5 to 5.0)
    │   ├── animated-icon.tsx         # Animated splash screen overlay
    │   ├── app-tabs.tsx              # NativeTabs configuration for Expo Router
    │   └── auth/
    │       └── AuthForm.tsx          # Shared Sign In / Sign Up form component
    │
    ├── config/
    │   └── env.ts                    # EXPO_PUBLIC_SUPABASE_* environment variable resolution
    │
    ├── constants/
    │   ├── categories.ts             # Category definitions, icons, colors, metadata field specs
    │   └── theme.ts                  # Light/Dark theme palettes and BottomTabInset
    │
    ├── contexts/
    │   └── auth-context.tsx          # React Context providing session, user, loading, cloudEnabled, signOut
    │
    ├── services/
    │   ├── auth.ts                   # signUpWithEmail, signInWithEmail, signOut, error formatting
    │   ├── db.ts                     # SQLite init, migrations, CRUD, search, tombstones, remote upsert
    │   ├── storage.ts                # Copying temporary image picker URIs to permanent app storage
    │   ├── supabase.ts               # Supabase JS client instantiation (null if unconfigured)
    │   │
    │   ├── cloud/
    │   │   ├── storage.ts            # Upload/delete photos in Supabase `entry-images` bucket
    │   │   └── sync.ts               # Bidirectional push/pull sync engine + tombstone deletion push
    │   │
    │   └── metadata/
    │       ├── index.ts              # Unified metadata search interface (timeout + routing)
    │       ├── itunes.ts             # iTunes API service (Movies & Music)
    │       ├── tvmaze.ts             # TVMaze API service (TV Shows)
    │       └── osm.ts                # OpenStreetMap / Nominatim API service (Places & Food)
    │
    ├── types/
    │   ├── activity.ts               # ActivityEntry, NewActivityEntry, CategoryId, CategoryDef
    │   └── metadata.ts               # MetadataSearchResult, MetadataSearchQuery, ExternalSource
    │
    └── utils/
        └── date.ts                   # YYYY-MM-DD formatting, validation, month bounds helpers
```

---

## 4. Detailed Feature History & Accomplishments

### Phase 1–3: Core Local Experience
- **Calendar Visual Grid:** Interactive month calendar showing the "Day Cover" poster/photo for logged dates, with `+N` badges when multiple memories share a single date.
- **Category System:** Movies, TV, Music, Restaurant, Place — each with distinct colors, Ionicons, and specific metadata fields (e.g. Director, Season/Episode, Artist, Cuisine, City).
- **Day Detail Sheet:** Bottom sheet listing all memories for a selected calendar date, allowing users to toggle which memory serves as the "Day Cover".
- **Timeline View:** Toggle on the Home screen to view entries as a chronological feed.
- **Explore & Insights:** Search by title, note, or metadata; filter by category and minimum rating; view total memory counts and category breakdown bars.
- **Local Persistence:** SQLite database (`activity_scrapbook.db`) storing all entries; camera photos copied to `entry-images/` directory in permanent document storage.

### Phase 4: Keyless Metadata Auto-Fill
- **UI Sheet:** Clean search sheet invoked via an "Auto-fill from iTunes/TVMaze/OpenStreetMap" button.
- **iTunes API (Movies & Music):** Solved iTunes `media=movie` returning 0 results by searching unfiltered and applying client-side filtering for `kind === 'feature-movie'`.
- **TVMaze API (TV Shows):** Fetches show name, network, premiered year, poster art.
- **OpenStreetMap / Nominatim (Places & Food):** Searches geocoded amenities, places, and restaurants to auto-populate city, country, and cuisine type.
- **Remote Poster Caching:** External poster HTTPS URLs stored directly in `imageUri`; rendered via `expo-image` with disk caching to prevent local storage bloat.

### Stage B: Cloud Multi-User System
- **Supabase Authentication:** Email/password authentication via `(auth)/sign-in` and `(auth)/sign-up` routes. Email confirmation turned OFF in Supabase dashboard settings.
- **Auth Gate:** Root layout (`src/app/_layout.tsx`) guards routes — unauthenticated users with active cloud credentials are directed to sign-in; local-only users bypass auth.
- **SQLite Schema Evolution:** Added `remote_id` (TEXT), `user_id` (TEXT), `synced_at` (TEXT), `photos` (TEXT JSON array), and a `sync_deletions` tombstone table for local deletion tracking.
- **Bidirectional Sync (`src/services/cloud/sync.ts`):**
  - **Push:** Local unsynced entries (`synced_at IS NULL OR updated_at > synced_at`) are pushed via `upsert` on `(user_id, local_id)`.
  - **Photo Upload:** Local camera photos are automatically uploaded to the `entry-images` Supabase storage bucket (`/{user_id}/{timestamp}_{rand}.jpg`) and replaced with public HTTPS URLs in cloud payloads.
  - **Pull:** Remote entries fetched and merged into local SQLite via `upsertEntryFromRemote`.
  - **Tombstones:** Local deletions write to `sync_deletions`; the sync engine pushes cloud `DELETE` calls before syncing edits, preventing deleted rows from resurrecting during pull.
  - **Clock Skew Protection:** `markEntrySynced` updates local `updated_at` to match the server `synced_at` timestamp, preventing perpetual "dirty" loops.
- **Multi-Photo Support & Cover Separation:**
  - `imageUri` holds the primary Cover/Poster (from metadata auto-fill or first photo fallback).
  - `photos` array holds additional personal photos.
  - `AddEditModal` features separate Cover (Replace/Camera) and Photos (Add photos/Shoot) controls.
  - `DayDetailModal` and `EntryCard` display thumbnail strips and photo count badges.
  - `PhotoViewer` component provides a full-screen, swipeable modal gallery.

---

## 5. Data Model & Database Schemas

### Local SQLite Schema (`activity_entries`)

```sql
CREATE TABLE IF NOT EXISTS activity_entries (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  logged_date TEXT NOT NULL,
  logged_time TEXT,
  rating REAL,
  note TEXT,
  image_uri TEXT,              -- Cover/Poster image URL or local path
  photos TEXT,                 -- JSON array of personal photo URIs ["path1", "path2"]
  is_cover INTEGER DEFAULT 0,
  external_id TEXT,
  external_source TEXT,
  metadata TEXT,               -- JSON string of category metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  remote_id TEXT,              -- Supabase UUID (populated after sync)
  user_id TEXT,                -- Supabase user UUID
  synced_at TEXT               -- Timestamp of last successful sync
);

CREATE TABLE IF NOT EXISTS sync_deletions (
  remote_id TEXT PRIMARY KEY NOT NULL,
  deleted_at TEXT NOT NULL
);
```

### Remote Postgres Schema (`supabase/migrations/`)

**`0001_init.sql` & `0002_photos.sql`:**

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  external_source text not null,
  external_id text not null,
  category text not null,
  title text not null,
  subtitle text,
  image_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (external_source, external_id)
);

create table if not exists public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  local_id text not null,
  category text not null,
  title text not null,
  subtitle text,
  logged_date date not null,
  logged_time text,
  rating real,
  note text,
  image_url text,
  photos jsonb not null default '[]'::jsonb,
  is_cover boolean not null default false,
  external_id text,
  external_source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, local_id)
);

-- RLS: Owner-scoped activity_entries policies for select, insert, update, delete
-- Storage Bucket: `entry-images` (public read, owner-folder scoped insert/update/delete)
```

---

## 6. How to Run & Test the Project

### Environment Setup
1. Copy `.env.example` to `.env.local`:
   ```ini
   EXPO_PUBLIC_SUPABASE_URL=https://fmxotvuevqyenohumfyz.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_w6NMJGLC0n2qVJHeHBWoig_Qbqx6BWg
   ```
2. Git identity is configured as:
   - Name: `kazi107`
   - Email: `kaziwalid107@gmail.com`

### Development Commands
```powershell
# Install dependencies
npm install

# Typecheck codebase
npx tsc --noEmit

# Run Expo Doctor health check
npx expo-doctor

# Start Metro Bundler
npm start

# Bundle test (Android)
npx expo export --platform android
```

### Connected Physical Device Testing
- **Expo Go URL:** `exp://192.168.0.247:8081` (verify PC and phone are on the same Wi-Fi subnet).
- **Clearing Cache Note:** Avoid creating temporary directories inside `.expo/export-check` while Metro is running, as Metro's `FallbackWatcher` on Windows may crash on malformed path resolution. Clean up using `Remove-Item -Recurse -Force .expo/export-check`.

---

## 7. Key Engineering Conventions & Decisions

1. **Date Standard:** All logged dates strictly use `YYYY-MM-DD` strings formatted via `toLocalDateString()` from `src/utils/date.ts` to prevent UTC offset shifting issues across timezones.
2. **Path Aliasing:** Use `@/` prefix pointing to `src/` (configured in `tsconfig.json`).
3. **Photo Storage Lifecycle:**
   - Temporary URIs from `ImagePicker` are passed to `saveImageToLocalStorage()` before SQLite insertion to persist them inside `entry-images/` in the document directory.
   - On sync, local URIs are uploaded to Supabase Storage and replaced with remote HTTPS URLs.
   - When deleting an entry, local image files are cleaned up via `deleteImageFromLocalStorage()`.
4. **Metadata Auto-Fill:** Designed behind a clean `MetadataSearchSheet` button trigger rather than inline dropdowns. Unified search response contract (`MetadataSearchResult`) maps provider-specific data into the shared model.
5. **No Shell Chaining:** On Windows PowerShell, avoid `&&` operators in shell commands; run commands separately or separate with semicolons.

---

## 8. Remaining Roadmap & Future Phases

### Immediate Refinements (Optional Backlog)
- [ ] **Orphaned Photo Cleanup:** When editing an entry and replacing/removing photos, old local files currently remain on disk. Adding diffing against previous photo arrays during `updateEntry` would clean them up.
- [ ] **Expo Deprecation Warning:** Replace `unstable_settings.initialRouteName` with `unstable_settings.anchor` in route layouts if warning recurs.

### Phase 5: Advanced Cloud & Media Proxy
- [ ] **Edge Function Search Proxy:** Proxy metadata searches through Supabase Edge Functions with a server-side TMDB API key to replace public iTunes/TVMaze limits and unlock TMDB movie/TV metadata.
- [ ] **Conflict Resolution:** Advanced multi-device conflict handling beyond last-write-wins.

### Phase 6: Insights & Feature Expansion
- [ ] **Backup & Export:** Full JSON + photos zip export/import for local backups.
- [ ] **Monthly Recap Cards:** Generated visual summary cards (e.g., "Nov 2026: 12 Movies, 4.2 Avg Rating").
- [ ] **Map View:** Interactive map displaying geocoded Place and Restaurant entries.
- [ ] **Watchlist / Want-to-Go List:** Separate light-weight list for unlogged items the user wants to experience.
