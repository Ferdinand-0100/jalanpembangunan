const $ = id => document.getElementById(id);
export class Hud {
  constructor(handlers) {
    const h = handlers;
    $('exag').oninput = e => { $('exagV').textContent = (+e.target.value).toFixed(1) + '×'; };
    $('exag').onchange = e => h.onExaggeration(+e.target.value);
    $('stride').onchange = e => h.onStride(+e.target.value);
    $('slope').onchange = e => h.onSlope(e.target.checked);
    $('tint').onchange = e => h.onTint(e.target.checked);
    $('rscale').oninput = e => { $('rscaleV').textContent = e.target.value + '×'; h.onRoverScale(+e.target.value); };
    $('sunEl').oninput = e => h.onSun();
    $('sunAz').oninput = e => h.onSun();
    $('cam').onchange = e => h.onCamera(e.target.value);
    $('resetRover').onclick = () => h.onReset();
  }
  setMeshInfo(i) { $('meshInfo').textContent = `${(i.vertices / 1e3).toFixed(0)}k vertices · ${(i.triangles / 1e3).toFixed(0)}k tris · ${i.meshCell} m mesh`; }
  update(s) {
    $('r-lon').textContent = `${s.lon.toFixed(5)}° E, ${s.lat.toFixed(5)}° N`;
    $('r-xy').textContent = `X ${s.X.toFixed(0)}  Y ${s.Y.toFixed(0)} m`;
    $('r-el').textContent = `${s.elev.toFixed(1)} m`;
    $('r-slope').textContent = `${s.slope.toFixed(1)}° (DEM-scale, 80 m baseline)`;
    $('r-hd').textContent = `${((s.heading * 180 / Math.PI) % 360 + 360) % 360 | 0}°  ·  ${s.speed.toFixed(1)} m/s`;
    $('r-status').textContent = s.status; $('r-status').className = s.status.startsWith('blocked') ? 'warn' : '';
    $('fps').textContent = `${s.fps.toFixed(0)} fps`;
  }
  setInspect(p) {
    $('inspect').textContent = p ? `${p.lon.toFixed(5)}° E, ${p.lat.toFixed(5)}° N · elev ${p.elevation.toFixed(1)} m · slope ${p.slopeDeg.toFixed(1)}°` : 'click terrain to inspect';
  }
  showError(m) { $('loading').textContent = m; $('loading').classList.add('err'); }
  hideLoading() { $('loading').style.display = 'none'; }
  setLoading(m) { $('loading').textContent = m; }
}
