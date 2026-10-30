# Afriam Mana-ing — Portfolio

Personal portfolio of Afriam D. Mana-ing, BSIT graduate (2026) and IT Staff at the Kalinga Provincial Treasurer's Office.

Live site: https://afriam.github.io

## Structure

```
index.html   all pages (Home, About, Journey, Projects, IT Arcade, Contact)
style.css    all styles (theme colors are CSS variables at the top)
script.js    sidebar + page router, theme, typewriter, visitor console, project filter,
             contact form, IT Arcade core (score, difficulty, tabs) + logic games, 3D background
games.js     extra arcade games (Type Master, Bug Hunt, Hex Hue, Signal Memory) + sound engine
mylogo.jpg   logo (sidebar, mobile top bar, favicon)
assests/     images
```

## Features

- **Smart sidebar**: each button opens its own page with an animated transition. Collapses to icons on desktop (remembered per visitor) and becomes a slide-out drawer on phones.
- **Page links**: every page has its own URL (`#about`, `#arcade`, …), so the browser back button works and pages can be shared directly. Keys `1`–`6` jump between pages.
- **IT Arcade**: seven games, each with Easy and Hard modes:
  - *Type Master*: type IT words (Easy) or code snippets (Hard) as they fly through a 3D tunnel. Every correct key plays the next note of a melody, and the sound and visuals get brighter as you type faster. Sound plays only while typing.
  - *Truth Table*: fill in the output column for a random boolean expression.
  - *Mystery Gate*: work out which gate or expression produced a truth table.
  - *Binary Blitz*: flip bits to match decimal (and, on Hard, hex) targets against the clock.
  - *Bug Hunt*: click the broken line in a code snippet (syntax bugs on Easy, logic and security bugs on Hard).
  - *Hex Hue*: match hex codes to colors, or colors to near-identical hex codes on Hard.
  - *Signal Memory*: repeat a growing light-and-tone sequence on a 3D pad.

  Score, streaks, and records are saved in the visitor's browser. The speaker button mutes all game sounds.
- Light/dark mode follows the visitor's system setting on first visit and remembers their choice afterwards.
- The contact form sends through EmailJS (keys are at the top of the contact form section in `script.js`).
- Fully responsive from small phones to wide desktop screens.

## Updating

CSS and JS links in `index.html` end in `?v=4`. Bump that number after changing those files so visitors' browsers load the new version instead of a cached copy.
