# Raymond Yang Portfolio

My projects, in the order I built them, charted on an original map. A guide
drifts along the route from the first project to the latest; click any waypoint
(or use the arrow keys) to see it in action. The About me popup has my
background and experience.

Live at **https://raynasty66.github.io**

## Adding a project

Everything on the page comes from `projects.json`. Add an entry and push:

```json
{
  "id": "my-project",
  "name": "My Project",
  "date": "2026-10-03",
  "ll": [614, 522],
  "side": "bottom",
  "gif": "gifs/my-project.gif",
  "tagline": "One line that shows on the map card",
  "summary": "A sentence or two about what it does.",
  "stack": ["Python"],
  "links": [{ "label": "GitHub", "url": "https://github.com/Raynasty66/my-project" }]
}
```

- `date` sets the order of the route; the list is sorted for you.
- `ll` is a pixel position `[x, y]` on the 4096×3072 `map.webp`. The snowy
  north-west corner around `[614, 522]` and the canal city at `[1597, 2519]` are
  still unclaimed.
- `side` hangs the label `top` or `bottom` of its waypoint. Labels that would
  collide fold down to their numbered diamond and open on hover.
- The first link is drawn as the gold button.
- `gif` is the looping demo shown on the card; leave it out and the card just skips it.

## Running locally

It's plain HTML, CSS and JavaScript with no build step. Serve the folder:

```
python -m http.server 8000
```

and open http://localhost:8000. (Opening `index.html` directly won't load
`projects.json`.)

## Credits

The map is original, generated for this site. Rendering by
[Leaflet](https://leafletjs.com).
