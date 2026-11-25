# Regenerating the screenshots

The franchise guide's screenshots are taken from the real app against a mock backend, so no real
franchise, customer or sales data is ever captured. Run these when the dashboard UI changes.

```bash
cd docs/franchise-guide/_capture
npm install                 # once, installs playwright-core
./run.sh                    # terminal 1: starts the app on :3100 with every API host mocked
node capture.mjs            # terminal 2: writes ../images/*.png
```

- `mock.mjs` holds the sample franchise, gyms, drinks, orders and the franchise role's permission
  list. Everything in it is invented. When a response schema in `shared/` changes, update it here.
- `capture.mjs` lists the screenshots (`SHOTS`). `ONLY="^10" node capture.mjs` takes a subset and
  `DUMP=700 node capture.mjs` prints each page's text so a blank or error page is easy to spot.
- It uses the installed Google Chrome. Set `CHROME_PATH` to use another browser and `BASE_URL` if
  the app is not on `http://localhost:3100`.
- The permission list in `mock.mjs` follows `docs/machine-access-matrix.md`. The backend decides
  what a real franchise sees, so check the two agree before sharing the guide.
