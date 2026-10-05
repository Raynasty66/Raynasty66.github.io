# Raymond Yang Portfolio

My experience on a 3D globe and my projects on a Teyvat road map, in the style of
[Genshin Soundpact](https://genshin-soundpact.org). Aether walks the route from
the first project to the latest; click any waypoint (or use the arrow keys) to
see it in action. The About me popup has my background and experience.

Live at **https://raynasty66.github.io**

## Adding experience

`experience.json` drives the globe. Each stop is a place (`ll` is real
`[latitude, longitude]`) with one or more `roles`; `side` hangs the label above
(`top`) or below (`bottom`) the pin. Each role takes `points`, `skills`, optional
`links`, and `images` (`src`, `caption`, optional `credit`) from the `xp/` folder.

## Adding a project

Everything on the page comes from `projects.json`. Add an entry and push:

```json
{
  "id": "my-project",
  "name": "My Project",
  "date": "2026-10-03",
  "ll": [-5518, -5541],
  "side": "bottom",
  "gif": "gifs/my-project.gif",
  "tagline": "One line that shows on the map card",
  "summary": "A sentence or two about what it does.",
  "stack": ["Python"],
  "links": [{ "label": "GitHub", "url": "https://github.com/Raynasty66/my-project" }]
}
```

- `date` sets the order of the route; the list is sorted for you. Add `"wip": true` to a project still in progress: it always goes last and shows "In progress".
- `ll` is a Teyvat game coordinate. Projects follow Genshin Soundpact's region
  route in date order: Mondstadt `[1610, -3850]`, Liyue `[110, -190]`, Dragonspine
  `[1590, -2212]`, Golden Apple Archipelago `[4150, 620]`, Inazuma `[6456, 3355]`,
  Enkanomiya `[2040, 3980]`, The Chasm `[-1781, 45]`, Sumeru `[-3213, -304]`, Veluriyam Mirage `[-6500, 300]`. The next
  project goes to Fontaine `[-5518, -5541]`, then Chenyu Vale `[-2070, -3834]`.
- `side` hangs the label `top` or `bottom` of its waypoint. Labels that would
  collide fold down to their numbered diamond and open on hover.
- The first link is drawn as the gold button.
- `gif` is the looping demo on the card: a `.gif`, or a silent `.mp4` that autoplays on loop. Leave it out and the card skips it.

When you change `app.js`, `globe.js`, `style.css` or either JSON file, bump the `?v=` number on
the asset links in `index.html`, so visitors never mix an old cached script with
new data.

## Running locally

It's plain HTML, CSS and JavaScript with no build step. Serve the folder:

```
python -m http.server 8000
```

and open http://localhost:8000. (Opening `index.html` directly won't load
`projects.json`.)

## Credits

Map tiles © [Kongying Tavern](https://yuanshen.site), CC BY-NC-SA. Genshin Impact
© HoYoverse. Rendering by [Leaflet](https://leafletjs.com) and [globe.gl](https://globe.gl); Earth imagery from NASA Blue Marble (public domain). Invention Studio photos © Invention Studio @ Georgia Tech, credited on the card.
