# Mumbai Local Timetable

A free, open-source, mobile-first web app (installable PWA) that shows the Mumbai suburban (local) train timetable — plus the metro and monorail lines included in the same data source — hosted on GitHub Pages with no backend. Pick a line and station to see the departure board in time order, and tap any departure for the full stop-by-stop run.

## Disclaimer

This is an **unofficial, independent, research/educational project**, not affiliated with Mobond, m-Indicator, Western Railway, Central Railway, or any operator. The timetable data originates from Mobond's published `mumbaidb.zip` (itself a compilation of official railway timetables). Train times are factual data; the *compilation* is Mobond's work. The code in this repository is MIT-licensed; **no licence is claimed over the timetable data itself.** If you are the rights holder and want this changed or removed, open an issue — it will be honoured promptly.

The source zip, decoded CSVs and generated JSON are deliberately not stored in this repository; every deployment regenerates them from upstream (see `BUILD_SPEC.md`).
