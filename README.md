# Scrapbook

An all-in-one personal media & memory diary for Android (and iOS where supported).
Log the movies, TV shows, music, restaurants, and places that make up your days and
see them come alive on a clean, visual calendar.

This is a **local-first** app: all entries and photos live on-device (SQLite +
app document storage). No account required.

## Tech stack

- **React Native + Expo (SDK 58)** with **TypeScript**
- **expo-router** for file-based navigation with native tabs
- **expo-sqlite** for local persistence
- **expo-file-system** for permanent on-device photo storage
- **expo-image-picker** for camera / gallery
- **expo-haptics** for tactile feedback

## Features (Phase 1–4)

- Visual month calendar where each day shows the poster/photo of the day
  (plus a `+N` badge when multiple memories share a day)
- Category filters: movies, TV, music, food & dining, places & travel
- Quick log / edit flow with rating, notes, photo, date, and category-specific extras
  (director, season/episode, artist, cuisine, city, etc.)
- **Metadata auto-fill**: search iTunes (movies/music), TVMaze (TV), and
  OpenStreetMap (food & places) to pull in titles, posters, credits, and locations
  with one tap
- Day detail sheet with "set as day cover" when several entries share a date
- Timeline feed view toggle
- Search and insights on the Explore tab (search, category + rating filters,
  category breakdown, stats)
- Light & dark mode

## Project structure

```
src/
  app/
    _layout.tsx      # SQLite provider, theme, native tabs
    index.tsx        # Calendar + timeline home screen
    explore.tsx      # Search, filters, and insights
  components/
    CalendarGrid.tsx
    CategoryFilter.tsx
    EntryCard.tsx
    RatingStars.tsx
    AddEditModal.tsx
    DayDetailModal.tsx
    MetadataSearchSheet.tsx
  constants/
    categories.ts    # Category definitions, colors, extra fields
    theme.ts         # Colors, spacing, fonts
  services/
    db.ts            # Schema + CRUD + search queries
    storage.ts       # Copies picked images into app document storage
    metadata/
      index.ts       # Unified search entrypoint (timeout + routing)
      itunes.ts      # Movies & music search
      tvmaze.ts      # TV shows search
      osm.ts         # Places & restaurants search (Nominatim)
  types/
    activity.ts      # Shared entry model
    metadata.ts      # Auto-fill result contract
  utils/
    date.ts          # Local-date helpers (YYYY-MM-DD formatting/validation)
```

## Run it on a physical Android phone

1. Install **Expo Go** from the Play Store.
2. Make sure your phone and PC are on the same Wi-Fi network.
3. Start the dev server:

   ```bash
   npm start
   ```

4. Scan the QR code with Expo Go (Android), or press `a` to open on a USB-connected
   device / emulator.

> If the QR code can't connect over LAN, run `npx expo start --tunnel`.

## Useful commands

```bash
npm start          # Start Metro / Expo dev server
npm run android    # Start and open on Android
npx tsc --noEmit   # Type-check the project
npm run lint       # Lint (first run configures ESLint)
```

## Roadmap

- **Phase 4 (done):** metadata auto-fill via iTunes (movies/music), TVMaze (TV),
  and OpenStreetMap (food & places). Keyless, with `expo-image` disk-cached posters.
- **Stage B:** Supabase auth + cloud database + object storage + edge-function
  search proxy (server-side TMDB key)
- **Later:** backup/export (JSON + photos), monthly recap cards, map view,
  watchlist / want-to-go list
