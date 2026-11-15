# Data sources

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

## Verification status of archived events

Dates and sunspot regions for 6 Sep 2017, 10 Sep 2017, 3 Oct 2024, 9 Aug 2011, 11 May 2024, 25 Feb 2014, 14 Dec 2023 and 7 Mar 2012 were checked against SpaceWeatherLive's top-50 flare lists. The 28 Oct 2021 date is confirmed by published papers on the first ground level enhancement of Solar Cycle 25. The 23 Jul 2012 CME is confirmed by NASA and press reports. Flare classes are shown as first reported; newer NOAA data rescales some older classes upward. The class for 28 Oct 2021 (X1.0) was not independently re-checked. Before judging, confirm each row against the DONKI web tool.
