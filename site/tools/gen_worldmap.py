# -*- coding: utf-8 -*-
"""One-off generator: world-atlas countries-110m TopoJSON -> tools/worldmap_paths.py
   (per-country SVG path strings in equirectangular projection + region per ISO2)."""
import json, sys
sys.path.insert(0, 'tools')
from build import COUNTRIES  # name -> iso list lives in build.py

topo = json.load(open('/tmp/world-110m.json'))
scale = topo['transform']['scale']; tr = topo['transform']['translate']
arcs = topo['arcs']

def arc_pts(ai):
    rev = ai < 0
    a = arcs[~ai if rev else ai]
    pts = []; x = y = 0
    for dx, dy in a:
        x += dx; y += dy
        pts.append((x * scale[0] + tr[0], y * scale[1] + tr[1]))
    return pts[::-1] if rev else pts

def ring(arc_ids):
    pts = []
    for ai in arc_ids:
        p = arc_pts(ai)
        pts.extend(p[1:] if pts else p)
    return pts

def geom_rings(g):
    if g['type'] == 'Polygon':
        return [ring(r) for r in g['arcs']]
    if g['type'] == 'MultiPolygon':
        return [ring(r) for poly in g['arcs'] for r in poly]
    return []

WIN_L, WIN_R = -170.0, 190.0  # projection window in unwrapped longitude (centre +10)

def project(lon, lat):
    lat = max(lat, -60)
    return (round((lon - WIN_L) * (960 / 360), 1), round((90 - lat) * (500 / 180), 1))

def unwrap_ring(pts):
    if not pts: return pts
    out = [pts[0]]
    for lon, lat in pts[1:]:
        plon = out[-1][0]
        while lon - plon < -180: lon += 360
        while lon - plon > 180: lon -= 360
        out.append((lon, lat))
    return out

def clip_ring(pts):
    # Sutherland-Hodgman against the vertical window [WIN_L, WIN_R]
    def clip_edge(poly, inside, intersect):
        if not poly: return poly
        out = []
        prev = poly[-1]; pin = inside(prev)
        for cur in poly:
            cin = inside(cur)
            if cin:
                if not pin: out.append(intersect(prev, cur))
                out.append(cur)
            elif pin:
                out.append(intersect(prev, cur))
            prev, pin = cur, cin
        return out
    def ix(edge):
        def f(a, b):
            t = (edge - a[0]) / (b[0] - a[0]) if b[0] != a[0] else 0
            return (edge, a[1] + t * (b[1] - a[1]))
        return f
    pts = clip_edge(pts, lambda p: p[0] >= WIN_L, ix(WIN_L))
    pts = clip_edge(pts, lambda p: p[0] <= WIN_R, ix(WIN_R))
    return pts

def path_d(rings):
    parts = []
    for r in rings:
        r = clip_ring(unwrap_ring(r))
        if len(r) < 3: continue
        cmds = []
        for i, (lon, lat) in enumerate(r):
            x, y = project(lon, lat)
            cmds.append(('M' if i == 0 else 'L') + f'{x} {y}')
        parts.append(''.join(cmds) + 'Z')
    return ''.join(parts)

ALIAS = {
 'United States of America': 'United States', 'Dominican Rep.': 'Dominican Republic',
 'Central African Rep.': 'Central African Republic', 'Eq. Guinea': 'Equatorial Guinea',
 'S. Sudan': 'South Sudan', 'Bosnia and Herz.': 'Bosnia and Herzegovina',
 'North Macedonia': 'North Macedonia', 'Macedonia': 'North Macedonia', 'Czechia': 'Czech Republic',
 "Côte d'Ivoire": 'Ivory Coast', 'The Bahamas': 'Bahamas', 'Bahamas': 'Bahamas', 'The Gambia': 'Gambia',
 'Solomon Is.': 'Solomon Islands', 'Marshall Is.': 'Marshall Islands', 'Laos': 'Laos',
 'Dem. Rep. Congo': None, 'W. Sahara': None, 'Somaliland': None, 'N. Cyprus': None,
 'New Caledonia': None, 'Fr. S. Antarctic Lands': None, 'Puerto Rico': None, 'Greenland': None,
 'Antarctica': None, 'Norfolk Island': None, 'Aland': None, 'Guam': None, 'Faroe Is.': None,
 'French Guiana': 'French Guiana',
}
name2iso = {n: i for n, i in COUNTRIES}
ME_ASIA = {'Saudi Arabia','United Arab Emirates','Qatar','Kuwait','Bahrain','Oman','Yemen','Jordan','Lebanon','Syria','Iraq','Israel','Palestine','Turkey','Cyprus','Iran','Afghanistan','Pakistan','India','Nepal','Bhutan','Bangladesh','Sri Lanka','Maldives','China','Japan','South Korea','North Korea','Mongolia','Taiwan','Hong Kong','Thailand','Vietnam','Laos','Cambodia','Myanmar','Malaysia','Singapore','Brunei','Philippines','Indonesia','Kazakhstan','Kyrgyzstan','Tajikistan','Turkmenistan','Uzbekistan','Azerbaijan','Georgia','Armenia','Timor-Leste'}
CENTRAL_AM = {'Mexico','Guatemala','Belize','Honduras','El Salvador','Nicaragua','Costa Rica','Panama','Cuba','Jamaica','Haiti','Dominican Republic','Bahamas','Trinidad and Tobago','Barbados','Grenada','Saint Lucia','Saint Vincent and the Grenadines','Antigua and Barbuda','Saint Kitts and Nevis','Dominica'}
OCEANIA_NAMES = {'Australia','New Zealand','Papua New Guinea','Fiji','Solomon Islands','Vanuatu','Samoa','Tonga','Kiribati','Micronesia','Palau','Marshall Islands','Nauru','Tuvalu'}

def region_for(name, lon, lat):
    if name in OCEANIA_NAMES: return 'oceania'
    if name in ME_ASIA: return 'asia'
    if name == 'Russia': return 'europe'
    if name == 'Egypt': return 'africa'
    if lon < -30:
        if name in CENTRAL_AM: return 'namerica'
        return 'samerica' if lat < 13 else 'namerica'
    if -27 <= lon <= 46 and lat >= 36: return 'europe'
    if -20 <= lon <= 52 and -36 <= lat < 36: return 'africa'
    if lon >= 112 and lat < 8: return 'oceania'
    return 'asia'

worldmap = {}; land = []
matched = set()
for g in topo['objects']['countries']['geometries']:
    nm = g['properties']['name']
    rings = geom_rings(g)
    if not rings: continue
    d = path_d(rings)
    if not d: continue
    ours = ALIAS.get(nm, nm)
    if ours is None or ours not in name2iso:
        land.append(d); continue
    iso = name2iso[ours]
    # centroid: bbox centre of the largest ring
    big = max(rings, key=len)
    lons = [p[0] for p in big]; lats = [p[1] for p in big]
    clon = (min(lons) + max(lons)) / 2; clat = (min(lats) + max(lats)) / 2
    worldmap[iso] = {'d': d, 'r': region_for(ours, clon, clat), 'n': ours}
    matched.add(ours)

unmatched = [n for n, i in COUNTRIES if n not in matched]
print('matched:', len(matched), 'of', len(COUNTRIES))
print('unmatched:', unmatched)
with open('tools/worldmap_paths.py', 'w', encoding='utf-8') as f:
    f.write('# Generated by tools/gen_worldmap.py from world-atlas countries-110m (equirectangular, viewBox 0 0 960 500).\n')
    f.write('WORLDMAP = ' + repr(worldmap) + '\n')
    f.write('WORLDLAND = ' + repr(''.join(land)) + '\n')
print('written tools/worldmap_paths.py')
