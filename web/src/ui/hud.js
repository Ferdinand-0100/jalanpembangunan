import { RoverViewer } from './roverViewer.js';

const $ = id => document.getElementById(id);

export class Hud {
  /**
   * @param {Object} handlers
   */
  constructor(handlers) {
    const h = handlers;
    this.handlers = h;
    this.toastTimer = null;
    this.showDetails = false;
    this.showHistLog = false;
    this.historyTrackEnabled = true;

    // 1. Initialize Interactive 3D Rover Viewer
    const viewerContainer = $('roverViewerContainer');
    if (viewerContainer) {
      this.roverViewer = new RoverViewer(viewerContainer);
    }

    // Interactive 3D Viewer Toolbar Controls
    if ($('viewerResetBtn')) {
      $('viewerResetBtn').onclick = () => {
        if (this.roverViewer) this.roverViewer.resetView();
      };
    }
    if ($('viewerZoomInBtn')) {
      $('viewerZoomInBtn').onclick = () => {
        if (this.roverViewer) this.roverViewer.zoomIn();
      };
    }
    if ($('viewerZoomOutBtn')) {
      $('viewerZoomOutBtn').onclick = () => {
        if (this.roverViewer) this.roverViewer.zoomOut();
      };
    }
    if ($('viewerRotateBtn')) {
      $('viewerRotateBtn').onclick = () => {
        if (this.roverViewer) {
          const auto = this.roverViewer.toggleAutoRotate();
          $('viewerRotateBtn').classList.toggle('active', auto);
          $('viewerRotateBtn').textContent = auto ? '⟳ Auto: ON' : '⟳ Auto';
        }
      };
    }

    // 2. SHOW HISTORY TRACK Toggle Button
    if ($('historyToggleBtn')) {
      $('historyToggleBtn').onclick = () => {
        this.historyTrackEnabled = !this.historyTrackEnabled;
        const btn = $('historyToggleBtn');
        const stateTag = $('histToggleState');
        btn.classList.toggle('active', this.historyTrackEnabled);
        if (stateTag) {
          stateTag.textContent = this.historyTrackEnabled ? '[ ON ]' : '[ OFF ]';
          stateTag.style.color = this.historyTrackEnabled ? 'var(--data-cyan)' : 'var(--text-dim)';
        }
        if (h.onToggleHistory) {
          h.onToggleHistory(this.historyTrackEnabled);
        }
        this.showToast(this.historyTrackEnabled ? 'History Track: Ditampilkan di medan Mars' : 'History Track: Disembunyikan');
      };
    }

    // Toggle Collapsible Movement History Log
    if ($('toggleHistLogBtn')) {
      $('toggleHistLogBtn').onclick = () => {
        this.showHistLog = !this.showHistLog;
        const c = $('histLogContainer');
        if (c) c.style.display = this.showHistLog ? 'block' : 'none';
        $('toggleHistLogBtn').textContent = this.showHistLog ? '▲ Sembunyikan Riwayat Lintasan' : '📜 Buka Riwayat Lintasan (Log Telemetri) ▼';
      };
    }

    // Buka Meja Riset & Backpack Laboratorium Spesimen Mars
    if ($('toggleBackpackBtn')) {
      $('toggleBackpackBtn').onclick = () => {
        if (typeof h.onOpenBackpack === 'function') {
          h.onOpenBackpack();
        } else if (window.labBackpack && typeof window.labBackpack.toggle === 'function') {
          window.labBackpack.toggle();
        }
      };
    }

    // 3. Top-Left Simulation Settings Modal Toggle
    if ($('toggleSettingsBtn')) {
      $('toggleSettingsBtn').onclick = () => {
        const modal = $('simSettingsModal');
        if (modal) {
          const isShown = modal.style.display === 'block';
          modal.style.display = isShown ? 'none' : 'block';
        }
      };
    }
    if ($('closeSettingsBtn')) {
      $('closeSettingsBtn').onclick = () => {
        const modal = $('simSettingsModal');
        if (modal) modal.style.display = 'none';
      };
    }

    // Simulation Sliders & Controls
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

    // Toggle Telemetry Sources Drawer
    if ($('toggleDetailsBtn')) {
      $('toggleDetailsBtn').onclick = () => {
        this.showDetails = !this.showDetails;
        const panel = $('telemetryDetails');
        if (panel) panel.style.display = this.showDetails ? 'block' : 'none';
        $('toggleDetailsBtn').textContent = this.showDetails ? '▲ Sembunyikan Sumber Data' : '📊 Sumber Data NASA & USGS Geologi ▼';
      };
    }

    // Robot selection tabs (0: Mapper, 1: GeoLab, 2: Transport)
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
      }
      // Update interactive 3D viewer model
      if (this.roverViewer) {
        this.roverViewer.setRover(rover);
      }
    }
  }

  /**
   * Updates History Track statistics and movement log list
   * @param {Object} stats
   */
  updateHistory(stats) {
    if (!stats) return;

    if ($('histTotalDist')) $('histTotalDist').textContent = stats.totalDistanceFormatted;
    if ($('histElapsedTime')) $('histElapsedTime').textContent = stats.elapsedFormatted;

    if ($('histStartCoord')) {
      $('histStartCoord').textContent = stats.startPoint
        ? `${stats.startPoint.lon}°E, ${stats.startPoint.lat}°N (${stats.startPoint.elevation}m)`
        : 'Menunggu Posisi Awal...';
    }

    if ($('histCurrentCoord')) {
      $('histCurrentCoord').textContent = stats.currentPoint
        ? `${stats.currentPoint.lon}°E, ${stats.currentPoint.lat}°N (${stats.currentPoint.elevation}m)`
        : 'Standby';
    }

    if ($('histWaypointCount')) {
      $('histWaypointCount').textContent = `${stats.waypointCount} Titik`;
    }

    // Update log list if drawer is open
    const list = $('histLogList');
    if (list && this.showHistLog && stats.waypoints) {
      const recent = stats.waypoints.slice(-15).reverse();
      list.innerHTML = recent.map(w => `
        <div class="hist-log-row">
          <span>#${w.index}</span>
          <span>${w.timeStr}</span>
          <span>${w.lon.toFixed(4)}°E, ${w.lat.toFixed(4)}°N</span>
          <span>${w.speed.toFixed(1)}m/s</span>
        </div>
      `).join('');
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
      $('act-role-status').style.color = 'var(--data-cyan)';

      mainBtn.textContent = '📍 Tandai Waypoint Sampel (Space)';
      mainBtn.style.display = 'block';
      mainBtn.style.background = '#0b3d91';
      mainBtn.style.borderColor = '#1e4fa3';

      if (secBtn) {
        secBtn.textContent = '🚛 Panggil Hermes Transport (C)';
        secBtn.style.display = hasWaypoint ? 'block' : 'none';
        secBtn.style.background = '#1b382b';
        secBtn.style.borderColor = 'var(--status-green)';
      }
    } else if (activeRover.role === 'geological-investigation') {
      $('act-role-title').textContent = '🔬 Curiosity GeoLab (Riset)';
      $('act-role-status').textContent = hasLab ? 'Stasiun Lab Sains Berdiri' : 'Siap Membangun Stasiun Lab';
      $('act-role-status').style.color = '#ff3b5c';

      mainBtn.textContent = hasLab ? '🔬 Laser Raman & Bor Sampel (Space)' : '🏗️ Bangun Stasiun Lab Sains (Space / B)';
      mainBtn.style.display = 'block';
      mainBtn.style.background = '#8a152e';
      mainBtn.style.borderColor = '#ff3b5c';

      if (secBtn) {
        secBtn.textContent = '🔬 Analisis Batuan Sekitar';
        secBtn.style.display = hasLab ? 'block' : 'none';
        secBtn.style.background = '#241a1a';
        secBtn.style.borderColor = '#4a2d2d';
      }
    } else if (activeRover.role === 'transport-support') {
      $('act-role-title').textContent = '🚛 Hermes Container Hauler (Logistik)';
      const cargoText = hasCargo ? `📦 Kargo: ${missionSystem.transportCargo.name}` : '📡 Radar: Memindai Benda Unik Mars...';
      $('act-role-status').textContent = cargoText;
      $('act-role-status').style.color = hasCargo ? 'var(--status-green)' : 'var(--status-amber)';

      if (hasCargo) {
        mainBtn.textContent = hasLab ? '🚚 Kirim Kontainer ke Stasiun Lab (Space)' : '⚠️ Bangun Lab Dahulu (Pakai GeoLab)!';
        mainBtn.style.background = hasLab ? '#124e2c' : '#3d2b1a';
        mainBtn.style.borderColor = hasLab ? 'var(--status-green)' : '#92602c';
      } else {
        mainBtn.textContent = '📡 Kunci Target Radar / Jemput (Space)';
        mainBtn.style.background = '#124e2c';
        mainBtn.style.borderColor = 'var(--status-green)';
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
          <span style="font-family:monospace;width:12px;">${q.completed ? '✓' : '○'}</span>
          <span>${q.title}</span>
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
    // Flight Dynamics Telemetry Card
    if ($('r-speed')) $('r-speed').textContent = `${s.speed.toFixed(1)} m/s`;
    if ($('r-el')) $('r-el').textContent = `${s.elev.toFixed(0)} m`;
    if ($('r-hd')) $('r-hd').textContent = `${((s.heading * 180 / Math.PI) % 360 + 360) % 360 | 0}°`;
    if ($('r-slope')) $('r-slope').textContent = `${s.slope.toFixed(1)}°`;
    if ($('r-status')) {
      $('r-status').textContent = s.status;
      $('r-status').style.color = s.status.startsWith('blocked') ? 'var(--status-amber)' : 'var(--data-cyan)';
    }

    // Fast top telemetry bar
    if ($('topSpeed')) $('topSpeed').textContent = `${s.speed.toFixed(1)} m/s`;
    if ($('topElev')) $('topElev').textContent = `${s.elev.toFixed(0)} m`;
    if ($('fps')) $('fps').textContent = `${s.fps.toFixed(0)}`;
  }

  setInspect(p) {
    const el = $('inspect');
    if (el) {
      if (p) {
        el.style.display = 'flex';
        el.textContent = `📍 ${p.lon.toFixed(5)}° E, ${p.lat.toFixed(5)}° N · Elev: ${p.elevation.toFixed(1)} m`;
      } else {
        el.style.display = 'none';
      }
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
