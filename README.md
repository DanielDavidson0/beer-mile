# Beer Mile Line

A phone web app for planning, logging and scoring beer mile crawls. It's plain files (no server, no login), so it can be hosted for free.

## Put it online (free, about 5 minutes)

### Option A: Netlify Drop (easiest, no coding tools)
1. On a computer, unzip this folder.
2. Go to **app.netlify.com/drop** and sign up for a free account. The account keeps the site online permanently.
3. Drag the whole `beer-mile-site` folder onto the page.
4. Netlify gives you a web address like `something-random.netlify.app`. You can rename it under **Site configuration → Change site name**.

**To update later:** open the site in Netlify, go to **Deploys**, and drag the new folder onto the upload box.

### Option B: GitHub Pages
1. Create a free GitHub account and a new **public** repository.
2. Click **Add file → Upload files** and drag in everything inside this folder (not the folder itself).
3. Go to **Settings → Pages**. Under "Branch" pick `main` and `/ (root)`, then save.
4. After a minute your site is at `https://<your-username>.github.io/<repo-name>/`.

**To update later:** upload the changed files again in the repository.

## Put it on your phone
1. Open your site's address in **Safari** (iPhone) or **Chrome** (Android).
2. iPhone: **Share → Add to Home Screen**. Android: **⋮ → Add to Home screen** or **Install app**.
3. It opens full screen with its own icon, and no Claude banner.

## Sample data
The 7 March 2026 trip is built in, so the app isn't empty the first time you open it. Players show as first names only because the site is public. Importing the full backup file (⚙ → Import a backup) swaps in full names.

## Where your data lives
- Trips, players and your own maps are saved **on that phone, in that browser**. On an iPhone, the Home Screen app and Safari keep **separate** data, so stick to the Home Screen app.
- Use the ⚙ button to **export a backup** now and then. Importing a backup on another phone moves everything across. Friends can swap backups to merge trips.
- Clearing the browser's website data deletes it, so keep a backup.

## What's in it
- **Maps:** Bermondsey, Blackhorse, Tottenham Hale, Hackney Wick and Manchester Piccadilly. Switch between them with the map button. Toggle between the Tube-style **Line** and a real street **Map**.
- **Edit:** reorder or remove stops, add nearby bars found on OpenStreetMap, or add one by name. Edits save as your own version under the original map, which is left unchanged.
- **Build a route:** tap a start, an end and any waypoints on the street map. The app finds bars along the path and lines them up in walking order.
- **Trips:** pick the map and starting end, log drinks and scores, and get a summary of best and worst stops and each player's averages.

## Good to know
- Bar locations and searches come from **OpenStreetMap** (free; © OpenStreetMap contributors). New or oddly named bars may be missing or slightly misplaced. You can add them by name in the editor.
- The street map uses Esri's plain dark-grey base map (free with attribution for light use). If that doesn't load it falls back to standard OpenStreetMap tiles, darkened.
- Stop locations are looked up once per phone and remembered. Exported backups include them.
- Venue lists were researched in November 2026. Some places (noted in their descriptions) may have closed or changed hours, so check before you go.
- The Line view works offline once the app has been opened once. The street map and bar searches need a connection.

## Files
`index.html` page · `styles.css` look · `app.js` the app · `data.js` the built-in maps and the sample trip · `sw.js` offline support · `manifest.webmanifest` + `icons/` home-screen app details.
