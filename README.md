# Raymond Yang Portfolio

My projects, in the order I built them, charted across Teyvat in the style of
[Genshin Soundpact](https://genshin-soundpact.org). Aether walks the route from
the first project to the latest; click any waypoint (or use the arrow keys) to
see it in action. The About me popup has my background and experience.

Live at **https://raynasty66.github.io**

## Adding a project

Everything on the page comes from `projects.json`. Add an entry and push:

```json
{
  "id": "my-project",
  "name": "My Project",
  "date": "2026-10-03",
  "ll": [-3213, -304],
  "side": "bottom",
  "gif": "gifs/my-project.gif",
  "tagline": "One line that shows on the map card",
  "summary": "A sentence or two about what it does.",
  "stack": ["Python"],
  "links": [{ "label": "GitHub", "url": "https://github.com/Raynasty66/my-project" }]
}
```

- `date` sets the order of the route; the list is sorted for you.
- `ll` is a Teyvat game coordinate from [Kongying Tavern's map](https://yuanshen.site)
  (first number grows east, second grows south). Sumeru City, around
  `[-3213, -304]`, is still free.
- `side` hangs the label `top` or `bottom` of its waypoint. Labels that would
  collide fold down to their numbered diamond and open on hover.
- The first link is drawn as the gold button.
- `gif` is the looping demo on the card: a `.gif`, or a silent `.mp4` that autoplays on loop. Leave it out and the card skips it.

When you change `app.js`, `style.css` or `projects.json`, bump the `?v=` number on
the two asset links in `index.html`, so visitors never mix an old cached script with
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
© HoYoverse. Rendering by [Leaflet](https://leafletjs.com).
