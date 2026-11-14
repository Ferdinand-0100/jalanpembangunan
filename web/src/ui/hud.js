const $ = id => document.getElementById(id);

export class Hud {
  constructor(handlers) {
    const h = handlers;
    this.toastTimer = null;
    this.showDetails = false;

    // Sliders & controls
    if ($('exag')) {
      $('exag').oninput = e => { $('exagV').textContent = (+e.target.value).toFixed(1) + '×'; };
      $('exag').onchange = e => h.onExaggeration(+e.target.value);
    }
    if ($('stride')) $('stride').onchange = e => h.onStride(+e.target.value);
    if ($('slope')) $('slope').onchange = e => h.onSlope(e.target.checked);
    if ($('tint')) $('tint').onchange = e => h.onTint(e.target.checked);
    if ($('rscale')) {
      $('rscale').oninput = e => { $('rscaleV').textContent = e.target.value + '×'; h.onRoverScale(+e.target.value); };
    }
    if ($('sunEl')) $('sunEl').oninput = () => h.onSun();
    if ($('sunAz')) $('sunAz').oninput = () => h.onSun();
    if ($('cam')) $('cam').onchange = e => h.onCamera(e.target.value);
    if ($('swarmMode')) $('swarmMode').onchange = e => h.onSwarmMode(e.target.value);
    if ($('resetRover')) $('resetRover').onclick = () => h.onReset();
    if ($('openMapPortalBtn')) $('openMapPortalBtn').onclick = () => h.onOpenMapPortal();

    // Contextual Action Buttons
    if ($('mainActionBtn')) $('mainActionBtn').onclick = () => h.onTriggerTask();
    if ($('secActionBtn')) $('secActionBtn').onclick = () => h.onSecondaryAction();

    // Toggle Telemetry Details Modal/Drawer
    if ($('toggleDetailsBtn')) {
      $('toggleDetailsBtn').onclick = () => {
        this.showDetails = !this.showDetails;
        const panel = $('telemetryDetails');
        if (panel) panel.style.display = this.showDetails ? 'block' : 'none';
        $('toggleDetailsBtn').textContent = this.showDetails ? '▲ Sembunyikan Detail' : '📊 Lihat Detail Telemetri';
      };
    }

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
    }, 3800);
  }

  updateRoverSelection(index, rover) {
    const btns = document.querySelectorAll('#robotSelector .r-btn');
    btns.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });

    if (rover) {
      const badge = $('activeCallsign');
      if (badge) {
        badge.textContent = `ROV-${rover.callsign}`;
        badge.style.color = rover.accentHex;
        badge.style.backgroundColor = `${rover.accentHex}22`;
      }
    }
  }

  updateWorkflow(missionSystem, activeRover) {
    if (!missionSystem) return;

    // Update Step Indicator
    const step1 = $('step-map');
    const step2 = $('step-transport');
    const step3 = $('step-lab');
    const step4 = $('step-research');

    const hasWaypoint = !!missionSystem.activeWaypoint;
    const hasCargo = !!missionSystem.transportCargo;
    const hasLab = !!missionSystem.labStation;
    const isCarrying = missionSystem.transportState === 'carrying_to_lab';

    if (step1) step1.className = 'wf-step' + (hasWaypoint || hasCargo ? ' done' : ' current');
    if (step2) step2.className = 'wf-step' + (hasCargo ? ' done' : (hasWaypoint ? ' active' : ''));
    if (step3) step3.className = 'wf-step' + (hasLab ? ' done' : (activeRover?.role === 'geological-investigation' ? ' current' : ''));
    if (step4) step4.className = 'wf-step' + (missionSystem.samplesAnalyzedCount > 0 ? ' done' : (isCarrying ? ' active' : ''));

    // Update Contextual Action Buttons based on active rover role
    const mainBtn = $('mainActionBtn');
    const secBtn = $('secActionBtn');

    if (!mainBtn || !activeRover) return;

    if (activeRover.role === 'surface-mapping') {
      $('act-role-title').textContent = '🗺️ Ares Mapper (Eksplorasi)';
      $('act-role-status').textContent = hasWaypoint ? 'Waypoint Ditandai — Siap Dijemput' : 'Siap Menandai Titik Sampel';
      $('act-role-status').style.color = '#00d4ff';

      mainBtn.textContent = '📍 Tandai Waypoint Sampel (Space)';
      mainBtn.style.display = 'block';
      mainBtn.style.background = 'linear-gradient(135deg, #185a9d 0%, #0d3660 100%)';
      mainBtn.style.borderColor = '#00d4ff';

      if (secBtn) {
        secBtn.textContent = '🚛 Panggil Hermes Transport (C)';
        secBtn.style.display = hasWaypoint ? 'block' : 'none';
        secBtn.style.background = 'linear-gradient(135deg, #2c6e49 0%, #17422b 100%)';
        secBtn.style.borderColor = '#00ff88';
      }
    } else if (activeRover.role === 'geological-investigation') {
      $('act-role-title').textContent = '🔬 Curiosity GeoLab (Riset)';
      $('act-role-status').textContent = hasLab ? 'Stasiun Lab Sains Berdiri' : 'Siap Membangun Stasiun Lab';
      $('act-role-status').style.color = '#ff3b5c';

      mainBtn.textContent = hasLab ? '🔬 Laser Raman & Bor Sampel (Space)' : '🏗️ Bangun Stasiun Lab Sains (Space / B)';
      mainBtn.style.display = 'block';
      mainBtn.style.background = 'linear-gradient(135deg, #9d1838 0%, #5e0d20 100%)';
      mainBtn.style.borderColor = '#ff3b5c';

      if (secBtn) {
        secBtn.textContent = '🔬 Analisis Batuan Sekitar';
        secBtn.style.display = hasLab ? 'block' : 'none';
        secBtn.style.background = '#3a2016';
        secBtn.style.borderColor = '#6b4a36';
      }
    } else if (activeRover.role === 'transport-support') {
      $('act-role-title').textContent = '🚛 Hermes Container Hauler (Logistik)';
      const cargoText = hasCargo ? `📦 Kargo: ${missionSystem.transportCargo.name}` : '📡 Radar: Memindai Benda Unik Mars...';
      $('act-role-status').textContent = cargoText;
      $('act-role-status').style.color = hasCargo ? '#00ff88' : '#ffb74d';

      if (hasCargo) {
        mainBtn.textContent = hasLab ? '🚚 Kirim Kontainer ke Stasiun Lab (Space)' : '⚠️ Bangun Lab Dahulu (Pakai GeoLab)!';
        mainBtn.style.background = hasLab ? 'linear-gradient(135deg, #187d46 0%, #0d4a29 100%)' : '#4a3020';
        mainBtn.style.borderColor = hasLab ? '#00ff88' : '#ff9f55';
      } else {
        mainBtn.textContent = '📡 Kunci Target Radar / Jemput (Space)';
        mainBtn.style.background = 'linear-gradient(135deg, #187d46 0%, #0d4a29 100%)';
        mainBtn.style.borderColor = '#00ff88';
      }
      mainBtn.style.display = 'block';

      if (secBtn) {
        secBtn.style.display = 'none';
      }
    }

    // Update Quest Checklist
    const questList = $('questList');
    if (questList && missionSystem.quests) {
      questList.innerHTML = missionSystem.quests.map(q => `
        <div class="quest-item ${q.completed ? 'completed' : ''}">
          <span class="q-icon">${q.completed ? '✓' : '○'}</span>
          <span class="q-title">${q.title}</span>
        </div>
      `).join('');
    }

    // Score display
    if ($('scienceScore')) {
      $('scienceScore').textContent = `${missionSystem.researchScore} Poin Riset`;
    }
  }

  setMeshInfo(i) {
    if ($('meshInfo')) {
      $('meshInfo').textContent = `${(i.vertices / 1e3).toFixed(0)}k vertices · ${(i.triangles / 1e3).toFixed(0)}k tris · ${i.meshCell} m`;
    }
  }

  update(s) {
    // Only update detailed telemetry if the details drawer is open
    if (this.showDetails) {
      if ($('r-lon')) $('r-lon').textContent = `${s.lon.toFixed(5)}° E, ${s.lat.toFixed(5)}° N`;
      if ($('r-xy')) $('r-xy').textContent = `X ${s.X.toFixed(0)}  Y ${s.Y.toFixed(0)} m`;
      if ($('r-el')) $('r-el').textContent = `${s.elev.toFixed(1)} m`;
      if ($('r-slope')) $('r-slope').textContent = `${s.slope.toFixed(1)}°`;
      if ($('r-hd')) $('r-hd').textContent = `${((s.heading * 180 / Math.PI) % 360 + 360) % 360 | 0}°`;
      if ($('r-status')) {
        $('r-status').textContent = s.status;
        $('r-status').className = s.status.startsWith('blocked') ? 'warn' : '';
      }
    }

    // Fast top telemetry bar
    if ($('topSpeed')) $('topSpeed').textContent = `${s.speed.toFixed(1)} m/s`;
    if ($('topElev')) $('topElev').textContent = `${s.elev.toFixed(0)} m`;
    if ($('fps')) $('fps').textContent = `${s.fps.toFixed(0)} fps`;
  }

  setInspect(p) {
    if ($('inspect')) {
      $('inspect').textContent = p
        ? `📍 ${p.lon.toFixed(5)}° E, ${p.lat.toFixed(5)}° N · Elev: ${p.elevation.toFixed(1)} m`
        : '';
    }
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
