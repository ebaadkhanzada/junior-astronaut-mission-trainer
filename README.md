# Junior Astronaut Mission Trainer

A browser game for ages 7 to 12. Land on the Moon (Shackleton Crater rim) or Mars (Jezero Crater), walk your astronaut around the outpost, and keep the crew alive for 5, 7 or 9 days. No download, account or build step.

Built for NASA's hackathon challenge **Build a Junior Astronaut Mission Trainer**.

**Play it:** `<paste your GitHub Pages link here>`  |  **Demo video:** `<paste link here>`

## Run it

- Quickest: open `index.html` in a browser.
- Local server (recommended, lets the live NASA call work): `python3 -m http.server 8000` then open http://localhost:8000
- Online: GitHub Pages (Settings, Pages, Deploy from a branch, `main`, `/ (root)`).

## Live NASA data (optional)

Click the data panel in the game and paste a free key from https://api.nasa.gov/. The key is kept only in your browser tab (sessionStorage) and is never written to the code or sent anywhere except api.nasa.gov. Without a key the game uses its built-in archive and labels it **Archived**. It says **Live** only if the DONKI request really succeeds.

## Project structure

```
index.html          page markup, loads everything below
css/style.css       all styling
js/data.js          NASA data: sites, difficulty modes, storm archive, tips  (safe to edit)
js/sim.js           game rules and simulation (no DOM, testable in Node)
js/render.js        canvas drawing: world, habitat interior, astronaut
js/ui.js            HUD, menus, input, sound, debrief, live DONKI fetch
tests/balance-bot.js  plays hundreds of missions to check difficulty (node tests/balance-bot.js 40)
docs/               data sources, playtest log, demo script
```

## The trade-off mechanic

Every action costs something. Power comes from solar panels only in daylight and is shared by the air scrubber, grow lights, radio and lab. Radiation builds while you are exposed. Suit air drains outside. Walls and the storm cellar stop solar storm particles well, but cosmic rays only a little.

| | Easy (Cadet) | Medium (Pilot) | Hard (Commander) |
|---|---|---|---|
| Days (60 s each) | 5 | 7 | 9 |
| Storms | 2 (1 small, 1 strong) | 3 (1 small, 2 strong) | 4 (2 strong, 2 huge) |
| Warning time | 26 s | 16 s | 9 s (fast storms: 6 s on the Moon, 4 s on Mars) |
| Breakdowns | none | 1 | 3 (+ dust storm on Mars) |
| Fitness meter | off | on | on |
| Guided first day | yes | optional | optional |

Replayability: every mission has a code (for example `MH-4821`). The same code gives the same storms and rock sites. "Today's mission" gives everyone the same seed on a given day.

## Real NASA data used

| Source | How it is used | Status |
|---|---|---|
| NASA DONKI (flares, CMEs) | Each storm is a real past event: date, class, sunspot region | Archived (10 events). The page also tries the live DONKI API and labels it **Live** only if it succeeds |
| Chang'e 4 lunar lander measurements | Moon everyday radiation, 1.37 mSv/day | Published value |
| Curiosity RAD instrument | Mars everyday radiation, 0.64 mSv/day (1.84 mSv/day in transit) | Published value |
| NASA JPL | 2017 storm doubled radiation at Mars | Quoted fact |
| NASA OSDR, study OSD-342 | Exercise event: spaceflight muscle and bone loss in mice | Quoted fact |
| Canadian Space Agency food production toolkit | Food and health tip | Quoted fact |

Not used yet (documented endpoints, would be the next step): RadLab API (`https://visualization.osdr.nasa.gov/radlab/api`, ISS dose rates), Mars Trek terrain, Mars Rover Photos, APOD.

## What is simplified (stated in the game)

- Storm doses are scaled for a 9-minute mission. The safety line (15, 16 or 16 mSv; 75% of that on Mars) stands in for NASA's career limit of 600 mSv.
- Shielding is a three-zone model (outside, inside the habitat, storm cellar).
- One game day is 60 seconds.

## Verification status of archived events

Dates and sunspot regions for 6 Sep 2017, 10 Sep 2017, 3 Oct 2024, 9 Aug 2011, 11 May 2024, 25 Feb 2014, 14 Dec 2023 and 7 Mar 2012 were checked against SpaceWeatherLive's top-50 flare lists. The 28 Oct 2021 date is confirmed by published papers on the first ground level enhancement of Solar Cycle 25. The 23 Jul 2012 CME is confirmed by NASA and press reports. Flare classes are shown as first reported; newer NOAA data rescales some older classes upward. The class for 28 Oct 2021 (X1.0) was not independently re-checked. Before judging, confirm each row against the DONKI web tool.

## Team

| Name | Role | Main contributions |
|---|---|---|
| `<name>` | `<role>` | `<what they actually did>` |
| `<name>` | `<role>` | `<what they actually did>` |
| `<name>` | `<role>` | `<what they actually did>` |

Fill this in honestly from the Git history and Issues.

## Credits and license

Data: NASA DONKI, NASA OSDR, JPL, Curiosity RAD, Chang'e 4 published results, Canadian Space Agency. Not affiliated with or endorsed by NASA or CSA. Code released under the MIT License (see `LICENSE`).
