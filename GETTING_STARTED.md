# Getting Started (no coding experience needed)

This walks you through running the price-fetching script on your own
computer, step by step. It should take about 20-30 minutes total, most of
which is the script running in the background.

## 1. Install Python

Python is the programming language the script is written in.

- **Mac**: Open the "Terminal" app (search for it with Spotlight, `Cmd+Space`
  then type "Terminal"). Type `python3 --version` and press Enter. If you see
  a version number like `Python 3.11.x`, you already have it — skip to step 2.
  If not, download it from **python.org/downloads** and run the installer.
- **Windows**: Download Python from **python.org/downloads**, run the
  installer, and make sure you check the box that says **"Add python.exe to
  PATH"** before clicking Install — this step is easy to miss and matters.

## 2. Get the code onto your computer

You have two options — pick whichever feels easier.

**Option A — Download as a ZIP (simplest, no extra tools needed):**
1. Go to `https://github.com/jake12346432/Porject`
2. Make sure the branch selector (top-left of the file list) is set to
   `claude/quarterly-stock-prices-portfolio-qsl4v6`
3. Click the green **Code** button → **Download ZIP**
4. Unzip it somewhere easy to find, like your Desktop

**Option B — Use git (if you already have it installed):**
```
git clone -b claude/quarterly-stock-prices-portfolio-qsl4v6 https://github.com/jake12346432/Porject.git
```

## 3. Open a terminal in that folder

- **Mac**: In Finder, open the unzipped folder, then right-click inside it
  and choose "New Terminal at Folder" (or open Terminal and type `cd `
  followed by dragging the folder into the window, then press Enter).
- **Windows**: Open the unzipped folder in File Explorer, click the address
  bar at the top, type `cmd`, and press Enter — this opens a command prompt
  already inside that folder.

## 4. Install the required packages

These are the tools the script depends on (like installing an app before you
can use it). In the terminal you just opened, type:

```
pip install -r requirements.txt
```

Press Enter and wait for it to finish (a bunch of text will scroll by — that's
normal). If `pip` isn't recognized on Windows, try `pip3` or
`python -m pip install -r requirements.txt` instead.

## 5. Run the script

Still in that same terminal, type:

```
python3 fetch_quarterly_prices.py
```

(On Windows, if `python3` isn't recognized, use `python` instead.)

You'll see it print progress for each of the ~480 companies, one line at a
time — this takes roughly **10-15 minutes**. It's normal to see a handful of
lines saying "UNRESOLVED" — that just means a few tickers couldn't be
auto-matched and are logged for you to review afterward, the rest will still
complete fine.

## 6. Find your results

When it finishes, a new folder called `output` will appear in the same
directory, containing:

- **`quarterly_prices_wide.csv`** — this is the main one: open it in Excel or
  Google Sheets. Each row is a quarter date, each column is a company.
- **`quarterly_prices_long.csv`** — same data in a different (tidy/database)
  layout, useful if you're feeding it into another program.
- **`resolved_ticker_map.csv`** — shows exactly which Yahoo Finance symbol
  was used for each company.
- **`unresolved_tickers.csv`** — any companies that failed to fetch, so you
  know what (if anything) to double check.

## If something goes wrong

- **"command not found: python3"** → Python isn't installed correctly, or
  wasn't added to PATH. Reinstall from python.org and make sure to check the
  PATH box on Windows.
- **"command not found: pip"** → try `pip3` or `python3 -m pip install -r requirements.txt`.
- **The script stops with an error partway through** → just run
  `python3 fetch_quarterly_prices.py` again — it starts fresh each time and
  won't duplicate anything, it just overwrites the `output` folder.
- Anything else — copy the error message and send it back and it can be
  diagnosed from there.
