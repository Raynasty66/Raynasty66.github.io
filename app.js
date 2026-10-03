// Projects charted on Teyvat, on the same Kongying Tavern tiles as Genshin Soundpact.

// Kongying's projection: latlng is the game coordinate, projected pixel = (lat + 3568, lng + 6969).
const MAP_CENTER = [3568, 6969]
const MAP_SIZE = [30370, 26624]
const TILES_OFFSET = [-17408, -10240]
const FOCUS_ZOOM = -1.5
const HOP_MS = 1100
const TILE_RETRY_MS = 700
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const CRS = L.Util.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
  projection: {
    project: (ll) => new L.Point(ll.lat + MAP_CENTER[0], ll.lng + MAP_CENTER[1]),
    unproject: (p) => new L.LatLng(p.x - MAP_CENTER[0], p.y - MAP_CENTER[1]),
  },
  bounds: L.bounds(L.point(0, 0), L.point(MAP_SIZE[0], MAP_SIZE[1])),
})

// Server z is leaflet zoom + 13; a refused tile gets one late retry so the overview never keeps a hole.
const GiTiles = L.TileLayer.extend({
  getTileUrl(c) {
    return `https://assets.yuanshen.site/tiles_twt672/${c.z + 13}/${c.x}_${c.y}.png`
  },
  createTile(coords, done) {
    const tile = L.TileLayer.prototype.createTile.call(this, coords, done)
    let retried = false
    tile.addEventListener('error', () => {
      if (retried || !this._map) return
      retried = true
      const url = this.getTileUrl(coords)
      setTimeout(() => { if (this._map) tile.src = url + '?r=1' }, TILE_RETRY_MS)
    })
    return tile
  },
})

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

function fmtDate(iso) {
  const [y, m] = iso.split('-')
  return `${MONTHS[+m - 1]} ${y}`
}

let map, stops, traveler, overviewBounds
let current = -1
let travelerAt = 0
let walk = null

function overviewPadding() {
  const sz = map.getSize()
  const x = Math.min(90, Math.round(sz.x * 0.1))
  return {
    paddingTopLeft: L.point(x, Math.min(120, Math.round(sz.y * 0.22))),
    paddingBottomRight: L.point(x, Math.min(110, Math.round(sz.y * 0.2))),
  }
}

function markerHtml(p, i) {
  const side = p.side === 'top' ? ' above' : ''
  return `<div class="gi-marker">
    <div class="marker-glow"></div>
    <button class="stop-label${side}" type="button" data-i="${i}" aria-label="${esc(p.name)}, ${fmtDate(p.date)}">
      <span class="stop-num">${i + 1}</span>
      <span class="stop-text">
        <span class="stop-name">${esc(p.name)}</span>
        <span class="stop-date">${fmtDate(p.date)}</span>
      </span>
    </button>
  </div>`
}

function buildMap() {
  map = L.map('map', {
    crs: CRS,
    minZoom: -6,
    maxZoom: 2,
    zoomSnap: 0.25,
    zoomControl: false,
    keyboard: false,
    wheelPxPerZoomLevel: 80,
  })
  map.attributionControl.setPrefix(false)
  map.attributionControl.addAttribution(
    'Map © <a href="https://yuanshen.site" target="_blank" rel="noopener noreferrer">Kongying Tavern</a> · Genshin Impact © HoYoverse',
  )
  L.control.zoom({ position: 'bottomleft' }).addTo(map)

  overviewBounds = L.latLngBounds(stops.map((p) => p.ll))
  map.fitBounds(overviewBounds, overviewPadding())

  const tileBounds = L.latLngBounds(
    L.latLng(-MAP_CENTER[0] + TILES_OFFSET[0], -MAP_CENTER[1] + TILES_OFFSET[1]),
    L.latLng(MAP_SIZE[0] - MAP_CENTER[0] + TILES_OFFSET[0], MAP_SIZE[1] - MAP_CENTER[1] + TILES_OFFSET[1]),
  )
  map.setMaxBounds(tileBounds.pad(0.05))
  map.options.maxBoundsViscosity = 1.0

  new GiTiles('', {
    maxZoom: 2,
    minZoom: -6,
    maxNativeZoom: 0,
    minNativeZoom: -3,
    tileSize: 256,
    noWrap: true,
    // The CDN's coverage stops at projected x 12288.
    bounds: L.latLngBounds(
      L.latLng(-MAP_CENTER[0] + TILES_OFFSET[0], -MAP_CENTER[1] + TILES_OFFSET[1]),
      L.latLng(12288 - MAP_CENTER[0], MAP_SIZE[1] - MAP_CENTER[1] + TILES_OFFSET[1]),
    ),
  }).addTo(map)

  L.polyline(stops.map((p) => p.ll), {
    className: 'gi-route',
    color: '#d3bc8e',
    weight: 3,
    dashArray: '10 12',
    opacity: 0.85,
    interactive: false,
  }).addTo(map)

  stops.forEach((p, i) => {
    p.marker = L.marker(p.ll, {
      icon: L.divIcon({ className: 'gi-host', html: markerHtml(p, i), iconSize: [0, 0] }),
      keyboard: false,
    }).addTo(map)
    p.el = p.marker.getElement()
    // A drag that starts on a label carries the label along under the cursor, so its release isn't a click.
    p.el.querySelector('.stop-label').addEventListener('click', () => { if (!map.dragging.moved()) go(i) })
  })

  map.createPane('journey')
  map.getPane('journey').style.zIndex = 620
  map.getPane('journey').style.pointerEvents = 'none'
  traveler = L.marker(stops[0].ll, {
    pane: 'journey',
    interactive: false,
    keyboard: false,
    icon: L.divIcon({ className: 'journey-traveler', html: '<img class="jt-icon" src="traveler.png" alt="" draggable="false">', iconSize: [0, 0] }),
  }).addTo(map)

  map.on('zoomend moveend', declutter)
  window.addEventListener('resize', () => {
    if (current < 0) map.fitBounds(overviewBounds, { ...overviewPadding(), animate: false })
    declutter()
  })
  declutter()
}

// Labels that would land on an earlier one or hang off the map collapse to their diamond; the open waypoint keeps its name.
function declutter() {
  const box = map.getContainer().getBoundingClientRect()
  const order = stops.map((_, i) => i)
  if (current >= 0) order.unshift(...order.splice(current, 1))
  const kept = []
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
  for (const p of stops) kept.push(p.el.querySelector('.stop-num').getBoundingClientRect())
  for (const i of order) {
    const text = stops[i].el.querySelector('.stop-text').getBoundingClientRect()
    const own = kept[i]
    const off = text.left < box.left || text.right > box.right || text.top < box.top || text.bottom > box.bottom
    const clash = i !== current && (off || kept.some((r) => r !== own && hit(text, r)))
    stops[i].el.classList.toggle('squeezed', clash)
    if (!clash) kept.push(text)
  }
}

// The sprite faces left, so it mirrors whenever it walks east.
function face(from, to) {
  const img = traveler.getElement()?.querySelector('.jt-icon')
  if (img && to[0] !== from[0]) img.classList.toggle('jt-right', to[0] > from[0])
}

function pulse(i) {
  const lbl = stops[i].el.querySelector('.stop-label')
  lbl.classList.remove('journey-pulse')
  void lbl.offsetWidth
  lbl.classList.add('journey-pulse')
}

// At a waypoint whose label hangs above it, Aether steps aside so he isn't standing on the name.
function rest(walking) {
  const img = traveler.getElement()?.querySelector('.jt-icon')
  img?.classList.toggle('jt-beside', !walking && stops[travelerAt].side === 'top')
}

// Walks Aether to a waypoint at constant speed, then he stands still there.
function walkPath(pts, idxs, totalMs) {
  if (walk) cancelAnimationFrame(walk.raf)
  travelerAt = idxs[idxs.length - 1]
  if (reduceMotion || pts.length < 2) {
    walk = null
    traveler.setLatLng(pts[pts.length - 1])
    rest(false)
    return
  }
  const lens = []
  let total = 0
  for (let k = 1; k < pts.length; k++) {
    const d = Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])
    lens.push(d)
    total += d
  }
  rest(true)
  const t0 = performance.now()
  let leg = -1
  walk = { raf: 0 }
  const step = (now) => {
    const dist = Math.min(1, (now - t0) / totalMs) * total
    let k = 0
    let acc = 0
    while (k < lens.length - 1 && acc + lens[k] < dist) acc += lens[k++]
    if (k !== leg) {
      if (leg >= 0 && idxs[k] != null) pulse(idxs[k])
      leg = k
      face(pts[k], pts[k + 1])
    }
    const f = lens[k] ? Math.min(1, (dist - acc) / lens[k]) : 1
    traveler.setLatLng([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f])
    if (dist < total) {
      walk.raf = requestAnimationFrame(step)
    } else {
      walk = null
      pulse(travelerAt)
      rest(false)
    }
  }
  walk.raf = requestAnimationFrame(step)
}

// Centers the stop in whatever part of the map the card leaves uncovered.
function focusOn(i) {
  const card = document.getElementById('card')
  const docked = getComputedStyle(card).position === 'absolute'
  const shift = docked ? (card.offsetWidth + 16) / 2 : 0
  const z = Math.min(0, Math.max(map.getZoom(), FOCUS_ZOOM))
  const target = map.unproject(map.project(stops[i].ll, z).add([shift, 0]), z)
  map.flyTo(target, z, { duration: reduceMotion ? 0 : 0.9 })
}

// Smooth demos ship as silent looping MP4s, which behave like a GIF at a fraction of the size.
function demoHtml(p) {
  if (!p.gif) return ''
  if (p.gif.endsWith('.mp4')) return `<video class="card-gif" src="${esc(p.gif)}" autoplay loop muted playsinline disablepictureinpicture disableremoteplayback controlslist="nodownload nofullscreen noremoteplayback" aria-label="${esc(p.name)} in action"></video>`
  return `<img class="card-gif" src="${esc(p.gif)}" alt="${esc(p.name)} in action">`
}

function renderCard(i) {
  const p = stops[i]
  const card = document.getElementById('card')
  card.innerHTML = `
    <button class="card-close" type="button" aria-label="Close">✕</button>
    <div class="card-kicker">Waypoint ${i + 1} of ${stops.length}</div>
    <h2 class="card-title">${esc(p.name)}</h2>
    <div class="card-date">${fmtDate(p.date)}</div>
    <p class="card-tagline">${esc(p.tagline)}</p>
    <p class="card-summary">${esc(p.summary)}</p>
    ${demoHtml(p)}
    <ul class="card-stack">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <div class="card-links">${p.links
      .map((l, k) => `<a class="pill${k === 0 ? ' pill-gold' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`)
      .join('')}</div>
    <div class="card-nav">
      <button class="nav-prev" type="button" ${i === 0 ? 'disabled' : ''}>◀ ${i > 0 ? esc(stops[i - 1].name) : 'Start'}</button>
      <button class="nav-next" type="button" ${i === stops.length - 1 ? 'disabled' : ''}>${i < stops.length - 1 ? esc(stops[i + 1].name) : 'The end, for now'} ▶</button>
    </div>`
  card.querySelector('.card-close').addEventListener('click', () => go(-1))
  card.querySelector('.nav-prev').addEventListener('click', () => go(i - 1))
  card.querySelector('.nav-next').addEventListener('click', () => go(i + 1))
  card.hidden = false
  card.classList.remove('card-in')
  void card.offsetWidth
  card.classList.add('card-in')
}

function closeCard() {
  const card = document.getElementById('card')
  card.hidden = true
  current = -1
  stops?.forEach((p) => p.el.classList.remove('active'))
  if (stops) declutter()
  document.querySelectorAll('#log li').forEach((li) => li.classList.remove('active'))
}

function open(i) {
  current = i
  stops.forEach((p, k) => p.el.classList.toggle('active', k === i))
  declutter()
  document.querySelectorAll('#log li').forEach((li, k) => li.classList.toggle('active', k === i))
  renderCard(i)
  focusOn(i)
  storeSet(LAST_KEY, stops[i].id)
  const card = document.getElementById('card')
  if (getComputedStyle(card).position !== 'absolute') card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' })
  if (travelerAt !== i || walk) {
    const here = traveler.getLatLng()
    walkPath([[here.lat, here.lng], stops[i].ll], [null, i], HOP_MS)
  }
}

// The hash is the source of truth, so back/forward and shared links land on the same stop.
function go(i) {
  if (i === current && i >= 0) return open(i)
  location.hash = i >= 0 && i < stops.length ? `#/${stops[i].id}` : '#/'
}

function route(first) {
  const id = location.hash.replace(/^#\/?/, '')
  const i = stops.findIndex((p) => p.id === id)
  if (i >= 0) {
    if (first) place(i)
    open(i)
  } else if (current >= 0) {
    closeCard()
    map.flyToBounds(overviewBounds, { ...overviewPadding(), duration: reduceMotion ? 0 : 0.8 })
  }
}

// Aether stands still on the last waypoint the reader opened, or the first one on a first visit.
const LAST_KEY = 'last-stop'

function place(i) {
  traveler.setLatLng(stops[i].ll)
  travelerAt = i
  rest(false)
}

// The about popup opens by itself on a first visit.
const ABOUT_KEY = 'seen-about'
const introOpen = () => !document.getElementById('about').hidden

// The popup has three pages; every button or tab carrying data-page switches to that page.
function showPage(page) {
  document.querySelectorAll('.intro-page').forEach((el) => { el.hidden = el.dataset.page !== page })
  document.querySelectorAll('.intro-tabs [data-page]').forEach((b) => b.setAttribute('aria-selected', b.dataset.page === page))
  document.getElementById('about').scrollTop = 0
}

function openAbout(page = 'about') {
  showPage(page)
  const about = document.getElementById('about')
  about.hidden = false
  about.scrollTop = 0
  document.getElementById('about-go').focus({ preventScroll: true })
}

function closeAbout() {
  storeSet(ABOUT_KEY, '1')
  document.getElementById('about').hidden = true
}

function storeGet(k) {
  try { return localStorage.getItem(k) } catch { return null }
}

function storeSet(k, v) {
  try { localStorage.setItem(k, v) } catch {}
}

function buildLog() {
  document.getElementById('log').innerHTML = stops
    .map((p, i) => `<li>
      <button type="button" data-i="${i}">
        <span class="log-num">${i + 1}</span>
        <span class="log-main">
          <span class="log-name">${esc(p.name)}</span>
          <span class="log-tagline">${esc(p.tagline)}</span>
        </span>
        <span class="log-meta">${fmtDate(p.date)}</span>
      </button>
    </li>`)
    .join('')
  document.querySelectorAll('#log button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelector('.map-wrap').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
      go(+b.dataset.i)
    })
  })
}

async function main() {
  const res = await fetch('projects.json')
  stops = (await res.json()).sort((a, b) => a.date.localeCompare(b.date))
  buildMap()
  buildLog()
  place(Math.max(0, stops.findIndex((p) => p.id === storeGet(LAST_KEY))))
  document.querySelectorAll('.site-header [data-page]').forEach((b) => b.addEventListener('click', () => openAbout(b.dataset.page)))
  document.querySelectorAll('.intro-card [data-page]:not(section)').forEach((b) => b.addEventListener('click', () => showPage(b.dataset.page)))
  document.getElementById('about-close').addEventListener('click', closeAbout)
  document.getElementById('about-go').addEventListener('click', closeAbout)
  document.getElementById('about').addEventListener('click', (e) => { if (e.target.id === 'about') closeAbout() })
  if (!storeGet(ABOUT_KEY) && !location.hash.replace(/^#\/?/, '')) openAbout()
  window.addEventListener('hashchange', () => route(false))
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return
    if (introOpen()) { if (e.key === 'Escape') closeAbout(); return }
    if (e.key === 'Escape' && current >= 0) go(-1)
    else if (e.key === 'ArrowRight') go(Math.min(stops.length - 1, current + 1))
    else if (e.key === 'ArrowLeft' && current > 0) go(current - 1)
  })
  route(true)
}

main()
