// Experience on a 3D globe: same gold diamonds, labels and Aether as the projects map.

const XP_KEY = 'last-xp'
let xp, globe, xpCurrent = -1, xpAt = 0

function xpStore(k, v) {
  try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v) } catch { return null }
}

function xpSpan(p) {
  return p.roles.map((r) => r.dates).join(' · ')
}

// The label's second line is just the years, e.g. "2024 – Now", so neighbors don't sprawl into each other.
function xpYears(p) {
  const first = p.roles[0].dates.match(/\d{4}/)[0]
  const ends = p.roles.map((r) => (/Present/.test(r.dates) ? 'Now' : r.dates.match(/\d{4}(?!.*\d{4})/)[0]))
  const last = ends.includes('Now') ? 'Now' : ends.sort().at(-1)
  return first === last ? first : `${first} – ${last}`
}

function xpMarker(p, i) {
  const el = document.createElement('div')
  el.className = 'gi-host xp-host'
  el.innerHTML = `<div class="gi-marker">
    <div class="marker-glow"></div>
    <button class="stop-label${p.side === 'top' ? ' above' : ''}" type="button" aria-label="${esc(p.place)}">
      <span class="stop-num">${i + 1}</span>
      <span class="stop-text">
        <span class="stop-name">${esc(p.place)}</span>
        <span class="stop-date">${esc(xpYears(p))}</span>
      </span>
    </button>
  </div>`
  el.querySelector('.stop-label').addEventListener('click', () => openXp(i))
  return el
}

function aetherEl() {
  const el = document.createElement('div')
  el.className = 'xp-aether'
  el.innerHTML = '<img class="jt-icon jt-beside" src="traveler.png" alt="" draggable="false">'
  return el
}

function gallery(r) {
  const ims = r.images || []
  if (!ims.length) return ''
  const first = ims[0]
  return `<figure class="xp-gallery">
    <div class="xp-main"><img src="${esc(first.src)}" alt="${esc(first.caption)}" loading="lazy"></div>
    <figcaption><span class="xp-cap">${esc(first.caption)}</span> <span class="xp-credit">${esc(first.credit || '')}</span></figcaption>
    ${ims.length > 1 ? `<div class="xp-thumbs">${ims.map((im, k) => `<button type="button" class="${k ? '' : 'on'}" data-src="${esc(im.src)}" data-caption="${esc(im.caption)}" data-credit="${esc(im.credit || '')}" aria-label="${esc(im.caption)}"><img src="${esc(im.src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
  </figure>`
}

function renderXpCard(i) {
  const p = xp[i]
  const card = document.getElementById('xp-card')
  card.innerHTML = `
    <button class="card-close" type="button" aria-label="Close">✕</button>
    <div class="card-kicker">Stop ${i + 1} of ${xp.length}</div>
    <h2 class="card-title">${esc(p.place)}</h2>
    ${p.roles.map((r) => `
      <div class="xp-role-block">
        <div class="xp-head"><strong>${esc(r.org)}</strong><span>${esc(r.dates)}</span></div>
        <div class="xp-role">${esc(r.role)}</div>
        ${gallery(r)}
        <ul class="xp-points">${(r.points || []).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        ${r.skills ? `<ul class="card-stack">${r.skills.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
        ${r.links ? `<div class="card-links">${r.links.map((l) => `<a class="pill" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join('')}</div>` : ''}
      </div>`).join('')}
    <div class="card-nav">
      <button class="nav-prev" type="button" ${i === 0 ? 'disabled' : ''}>◀ ${i > 0 ? esc(xp[i - 1].place) : 'Start'}</button>
      <button class="nav-next" type="button" ${i === xp.length - 1 ? 'disabled' : ''}>${i < xp.length - 1 ? esc(xp[i + 1].place) : 'The end, for now'} ▶</button>
    </div>`
  // Thumbnails swap the big photo and its caption in place.
  card.querySelectorAll('.xp-gallery').forEach((gal) => {
    gal.querySelectorAll('.xp-thumbs button').forEach((b) => b.addEventListener('click', () => {
      const im = gal.querySelector('.xp-main img')
      im.src = b.dataset.src
      im.alt = b.dataset.caption
      gal.querySelector('.xp-cap').textContent = b.dataset.caption
      gal.querySelector('.xp-credit').textContent = b.dataset.credit
      gal.querySelectorAll('.xp-thumbs button').forEach((o) => o.classList.toggle('on', o === b))
    }))
  })
  card.querySelector('.card-close').addEventListener('click', closeXp)
  card.querySelector('.nav-prev').addEventListener('click', () => openXp(i - 1))
  card.querySelector('.nav-next').addEventListener('click', () => openXp(i + 1))
  card.hidden = false
  card.classList.remove('card-in')
  void card.offsetWidth
  card.classList.add('card-in')
}

// Flies the camera to a stop, nudged west so the card on the right doesn't cover it.
function flyTo(i, ms = 1200) {
  const docked = getComputedStyle(document.getElementById('xp-card')).position === 'absolute'
  const [lat, lng] = xp[i].ll
  globe.pointOfView({ lat, lng: lng + (docked ? 18 : 0), altitude: 1.5 }, reduceMotion ? 0 : ms)
}

function placeAether(i) {
  xpAt = i
  globe.htmlElementsData([...xp.map((p, k) => ({ ...p, k })), { aether: true, ll: xp[i].ll }])
}

function openXp(i) {
  if (i < 0 || i >= xp.length) return
  xpCurrent = i
  document.querySelectorAll('.xp-host').forEach((el, k) => el.classList.toggle('active', k === i))
  renderXpCard(i)
  flyTo(i)
  placeAether(i)
  xpStore(XP_KEY, xp[i].id)
}

function closeXp() {
  xpCurrent = -1
  document.getElementById('xp-card').hidden = true
  document.querySelectorAll('.xp-host').forEach((el) => el.classList.remove('active'))
  globe.pointOfView(overviewPov(), reduceMotion ? 0 : 1000)
}

// Narrow screens start further out so all four stops fit across.
function overviewPov() {
  const w = document.getElementById('globe').clientWidth
  return { lat: 32, lng: -165, altitude: w < 600 ? 3.1 : 1.95 }
}

function sizeGlobe() {
  const box = document.getElementById('globe')
  globe.width(box.clientWidth).height(box.clientHeight)
}

async function initGlobe() {
  const res = await fetch(`experience.json?v=${new URL(APP_SRC || 'app.js', location.href).searchParams.get('v') || ''}`, { cache: 'no-cache' })
  xp = await res.json()
  const box = document.getElementById('globe')
  const markers = new Map()
  const T = 'https://cdn.jsdelivr.net/npm/three-globe@2/example/img/'
  globe = Globe()(box)
    .backgroundColor('rgba(0,0,0,0)')
    .globeImageUrl(T + 'earth-blue-marble.jpg')
    .bumpImageUrl(T + 'earth-topology.png')
    .atmosphereColor('#d3bc8e')
    .atmosphereAltitude(0.18)
    .arcsData(xp.slice(1).map((p, k) => ({ a: xp[k].ll, b: p.ll })))
    .arcStartLat((d) => d.a[0]).arcStartLng((d) => d.a[1])
    .arcEndLat((d) => d.b[0]).arcEndLng((d) => d.b[1])
    .arcColor(() => '#d3bc8e')
    .arcStroke(0.6)
    .arcDashLength(0.35).arcDashGap(0.2)
    .arcDashAnimateTime(reduceMotion ? 0 : 6000)
    .arcAltitudeAutoScale(0.35)
    .htmlLat((d) => d.ll[0]).htmlLng((d) => d.ll[1]).htmlAltitude(0.01)
    .htmlElement((d) => {
      if (d.aether) return aetherEl()
      if (!markers.has(d.k)) markers.set(d.k, xpMarker(d, d.k))
      return markers.get(d.k)
    })
  // Labels on the far side of the Earth hide instead of floating through it.
  if (globe.htmlElementVisibilityModifier) globe.htmlElementVisibilityModifier((el, visible) => { el.style.opacity = visible ? 1 : 0; el.style.pointerEvents = visible ? '' : 'none' })
  const ctl = globe.controls()
  ctl.enableZoom = true
  ctl.minDistance = 160
  ctl.maxDistance = 500
  sizeGlobe()
  window.addEventListener('resize', sizeGlobe)
  const last = Math.max(0, xp.findIndex((p) => p.id === xpStore(XP_KEY)))
  placeAether(last)
  globe.pointOfView(overviewPov(), 0)
  buildXpLog()
  buildPopupXp()
  if (document.querySelector('.view[data-view="experience"]').hidden) globe.pauseAnimation()
}

// The popup's Experience page lists every role from the same data as the globe, newest first.
function buildPopupXp() {
  const roles = xp.flatMap((p) => p.roles).sort((a, b) => b.start.localeCompare(a.start))
  document.getElementById('pop-xp').innerHTML = roles
    .map((r) => `<li>
      <div class="xp-head"><strong>${esc(r.org)}</strong><span>${esc(r.dates)}</span></div>
      <div class="xp-role">${esc(r.role)}</div>
      <p>${esc(r.points[0])}</p>
    </li>`)
    .join('')
}

function buildXpLog() {
  document.getElementById('xp-log').innerHTML = xp
    .map((p, i) => `<li>
      <button type="button" data-i="${i}">
        <span class="log-num">${i + 1}</span>
        <span class="log-main">
          <span class="log-name">${esc(p.place)}</span>
          <span class="log-tagline">${esc(p.roles.map((r) => `${r.role}, ${r.org}`).join(' · '))}</span>
        </span>
        <span class="log-meta">${esc(xpSpan(p))}</span>
      </button>
    </li>`)
    .join('')
  document.querySelectorAll('#xp-log button').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('globe-wrap').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
    openXp(+b.dataset.i)
  }))
}
