const $ = id => document.getElementById(id);

export class Hud {
  constructor(handlers) {
    const h = handlers;
    this.toastTimer = null;

    $('exag').oninput = e => { $('exagV').textContent = (+e.target.value).toFixed(1) + '×'; };
    $('exag').onchange = e => h.onExaggeration(+e.target.value);
    $('stride').onchange = e => h.onStride(+e.target.value);
    $('slope').onchange = e => h.onSlope(e.target.checked);
    $('tint').onchange = e => h.onTint(e.target.checked);
    $('rscale').oninput = e => { $('rscaleV').textContent = e.target.value + '×'; h.onRoverScale(+e.target.value); };
    $('sunEl').oninput = e => h.onSun();
    $('sunAz').oninput = e => h.onSun();
    $('cam').onchange = e => h.onCamera(e.target.value);
    $('swarmMode').onchange = e => h.onSwarmMode(e.target.value);
    $('resetRover').onclick = () => h.onReset();
    $('taskBtn').onclick = () => h.onTriggerTask();

    // Robot selection buttons (0: Mapper, 1: GeoLab, 2: Transport)
    const btns = document.querySelectorAll('#robotSelector .r-btn');
    btns.forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        h.onSelectRover(idx);
      };
    });
  }

  showToast(message) {
    const toast = $('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.style.display = 'none';
    }, 3200);
  }

  updateRoverSelection(index, rover) {
    const btns = document.querySelectorAll('#robotSelector .r-btn');
    btns.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    if (rover) {
      const badge = $('activeCallsign');
      badge.textContent = `ROV-${rover.callsign}`;
      badge.style.color = rover.accentHex;
      badge.style.backgroundColor = `${rover.accentHex}22`;
      this.updateMissionBox(rover);
    }
  }

  updateMissionBox(rover) {
    const btn = $('taskBtn');
    if (rover.role === 'surface-mapping') {
      $('m-title').textContent = `${rover.icon} Tugas: Pemetaan Permukaan & Eksplorasi`;
      $('m-desc').textContent = 'Memetakan topografi medan Jezero & mendeteksi jalur aman';
      $('m-stat1').textContent = `${rover.agent.mappedKm2.toFixed(2)} km² (${rover.agent.waypointsFound} waypoint)`;
      $('m-stat2').textContent = rover.agent.targetFeature || 'Jezero Western Delta Fan';
      $('m-tool').textContent = 'LiDAR 360° & Phased-Array Radar Aktif';
      $('m-tool').style.color = rover.accentHex;
      btn.textContent = 'Pindai Topografi Medan (Space)';
      btn.style.backgroundColor = '#185a9d';
      btn.style.borderColor = '#2882db';
    } else if (rover.role === 'geological-investigation') {
      $('m-title').textContent = `${rover.icon} Tugas: Investigasi Geologi & Pengeboran`;
      $('m-desc').textContent = 'Analisis mineral singkapan batuan & pengambilan sampel inti';
      $('m-stat1').textContent = `${rover.agent.samplesSealed} tabung sampel dibor`;
      $('m-stat2').textContent = rover.agent.currentMineral;
      $('m-tool').textContent = rover.agent.state === 'drilling' ? 'Bor Inti & Laser Raman: AKTIF' : 'Laser Raman SuperCam: Standby';
      $('m-tool').style.color = rover.accentHex;
      btn.textContent = 'Aktifkan Bor Inti & Laser Spektrometer (Space)';
      btn.style.backgroundColor = '#9d1838';
      btn.style.borderColor = '#db284f';
    } else if (rover.role === 'transport-support') {
      $('m-title').textContent = `${rover.icon} Tugas: Transportasi & Dukungan Misi`;
      $('m-desc').textContent = 'Penampungan tabung sampel kargo & relay komunikasi MRO';
      $('m-stat1').textContent = `${rover.agent.tubesCached} / ${rover.agent.maxTubes} slot tabung terisi`;
      $('m-stat2').textContent = rover.agent.relaySignal;
      $('m-tool').textContent = 'Relay Dish High-Gain: 100% Online';
      $('m-tool').style.color = rover.accentHex;
      btn.textContent = 'Amankan & Simpan Tabung Sampel (Space)';
      btn.style.backgroundColor = '#187d46';
      btn.style.borderColor = '#2bb86a';
    }
  }

  setMeshInfo(i) {
    $('meshInfo').textContent = `${(i.vertices / 1e3).toFixed(0)}k vertices · ${(i.triangles / 1e3).toFixed(0)}k tris · ${i.meshCell} m mesh`;
  }

  update(s) {
    $('r-lon').textContent = `${s.lon.toFixed(5)}° E, ${s.lat.toFixed(5)}° N`;
    $('r-xy').textContent = `X ${s.X.toFixed(0)}  Y ${s.Y.toFixed(0)} m`;
    $('r-el').textContent = `${s.elev.toFixed(1)} m`;
    $('r-slope').textContent = `${s.slope.toFixed(1)}° (DEM 80 m baseline)`;
    $('r-hd').textContent = `${((s.heading * 180 / Math.PI) % 360 + 360) % 360 | 0}°  ·  ${s.speed.toFixed(1)} m/s`;
    $('r-status').textContent = s.status;
    $('r-status').className = s.status.startsWith('blocked') ? 'warn' : '';
    $('fps').textContent = `${s.fps.toFixed(0)} fps`;

    if (s.rover) {
      this.updateMissionBox(s.rover);
    }
  }

  setInspect(p) {
    $('inspect').textContent = p
      ? `${p.lon.toFixed(5)}° E, ${p.lat.toFixed(5)}° N · elev ${p.elevation.toFixed(1)} m · slope ${p.slopeDeg.toFixed(1)}°`
      : 'klik medan untuk inspeksi';
  }

  showError(m) {
    $('loading').textContent = m;
    $('loading').classList.add('err');
  }

  hideLoading() {
    $('loading').style.display = 'none';
  }

  setLoading(m) {
    $('loading').textContent = m;
  }
}
