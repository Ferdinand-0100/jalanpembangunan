import { MARS_MAPS, getMapById } from '../maps/mapRegistry.js';

export class MapPortal {
  /**
   * @param {Object} options
   * @param {Function} options.onLaunchSimulation Callback when entering 3D simulation
   */
  constructor(options = {}) {
    this.onLaunchSimulation = options.onLaunchSimulation || (() => {});
    this.currentMap = MARS_MAPS[0];
    this.selectedRegion = this.currentMap.keyRegions[0]; // Jezero Crater default
    this.activeTab = 'regions'; // 'regions' | 'materials' | 'epochs' | 'phenomena'

    this.container = null;
    this.#initDOM();
  }

  #initDOM() {
    this.container = document.createElement('div');
    this.container.id = 'mapPortal';
    this.container.className = 'map-portal-overlay';
    document.body.appendChild(this.container);
    this.render();
  }

  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  render() {
    const map = this.currentMap;
    const region = this.selectedRegion;

    this.container.innerHTML = `
      <div class="map-portal-container">
        <!-- TOP HEADER & MAP SELECTOR TABS -->
        <header class="portal-header">
          <div class="header-left">
            <div class="mission-badge">NASA Space Apps & USGS Astrogeology</div>
            <h1 class="portal-title">USGS Mars Geologic Map Explorer</h1>
            <p class="portal-subtitle">Eksplorasi geologi, sejarah air, vulkanisme, dan kronologi pembentukan permukaan Mars</p>
          </div>
          <div class="header-right">
            <div class="map-selector-pills">
              ${MARS_MAPS.map(m => `
                <button class="map-pill ${m.id === map.id ? 'active' : ''} ${m.isPlaceholder ? 'placeholder' : ''}" data-map-id="${m.id}">
                  <span class="pill-code">${m.code}</span>
                  <span class="pill-name">${m.isPlaceholder ? '+ Tambah Map (Slot Tim)' : m.title.split('of the ')[1] || m.title}</span>
                </button>
              `).join('')}
            </div>
          </div>
        </header>

        <!-- MAIN TWO-COLUMN CONTENT -->
        <div class="portal-body">
          <!-- LEFT COLUMN: MAP RADAR & INTERACTIVE SURFACE VISUAL -->
          <div class="portal-map-col">
            <div class="map-card-canvas">
              <div class="map-radar-header">
                <div>
                  <span class="badge-code">${map.code}</span>
                  <b style="color:#ffb98a">${map.title}</b>
                </div>
                <div class="meta-tag">${map.scale} · ${map.coverage}</div>
              </div>

              <!-- Interactive Equirectangular Coordinate Visualizer -->
              <div class="mars-grid-viewport" id="marsGrid">
                <!-- Lat/Lon grid background lines -->
                <div class="grid-line lat-line" style="top:20%"><span>+45° LU</span></div>
                <div class="grid-line lat-line equator" style="top:50%"><span>0° Ekuator</span></div>
                <div class="grid-line lat-line" style="top:80%"><span>-45° LS</span></div>

                <div class="grid-line lon-line" style="left:20%"><span>30° BT</span></div>
                <div class="grid-line lon-line" style="left:50%"><span>90° BT</span></div>
                <div class="grid-line lon-line" style="left:80%"><span>150° BT</span></div>

                <!-- Region Pins plotted on the projection -->
                ${map.keyRegions ? map.keyRegions.map(r => {
                  // Coordinate mapping: Lon 0..180 -> left: 10%..90%, Lat +60..-60 -> top: 10%..90%
                  let leftPercent = ((r.lon % 360) / 180) * 80 + 10;
                  if (r.lon > 300) leftPercent = 5; // Acidalia at 339°
                  const topPercent = ((60 - r.lat) / 120) * 80 + 10;
                  const isSelected = r.id === region.id;

                  return `
                    <div class="region-pin ${isSelected ? 'selected' : ''} ${r.hasSimulation ? 'sim-target' : ''}" 
                         style="left:${Math.max(4, Math.min(94, leftPercent))}%; top:${Math.max(8, Math.min(90, topPercent))}%;"
                         data-region-id="${r.id}">
                      <div class="pin-pulse"></div>
                      <div class="pin-dot"></div>
                      <div class="pin-label">
                        <b>${r.name}</b>
                        <span>${r.coords}</span>
                        ${r.hasSimulation ? '<span class="target-tag">🚀 3D Ready</span>' : ''}
                      </div>
                    </div>
                  `;
                }).join('') : ''}
              </div>

              <div class="map-legend-bar">
                <span>Skala Kartografi: <b>${map.scale}</b></span>
                <span>Penyusun: <b>${map.author} (${map.year})</b></span>
                <span>Penerbit: <b>${map.publisher}</b></span>
              </div>
            </div>

            <!-- REGION CARDS SELECTOR -->
            <div class="sector-cards-list">
              <h3 style="margin:8px 0 6px;font-size:12px;color:#ffb98a">PILIH WILAYAH UNTUK INSPEKSI GEOLOGI:</h3>
              <div class="cards-scroller">
                ${map.keyRegions ? map.keyRegions.map(r => `
                  <div class="sector-card ${r.id === region.id ? 'active' : ''}" data-region-id="${r.id}">
                    <div class="sector-header">
                      <b>${r.name}</b>
                      ${r.hasSimulation ? '<span class="ready-badge">3D ACTIVE</span>' : ''}
                    </div>
                    <div class="sector-meta">${r.type} · ${r.coords}</div>
                    <div class="sector-epoch" style="color:${r.epochColor || '#ffb98a'}">Era: ${r.epoch}</div>
                  </div>
                `).join('') : ''}
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: DETAILED GEOLOGY INSPECTOR & LAUNCH CTA -->
          <div class="portal-info-col">
            <!-- TABS -->
            <div class="info-tabs">
              <button class="info-tab ${this.activeTab === 'regions' ? 'active' : ''}" data-tab="regions">Wilayah &amp; Detail</button>
              <button class="info-tab ${this.activeTab === 'materials' ? 'active' : ''}" data-tab="materials">Legenda Material</button>
              <button class="info-tab ${this.activeTab === 'epochs' ? 'active' : ''}" data-tab="epochs">Kronologi Umur</button>
              <button class="info-tab ${this.activeTab === 'phenomena' ? 'active' : ''}" data-tab="phenomena">6 Fenomena</button>
            </div>

            <!-- TAB CONTENT -->
            <div class="tab-pane-content">
              ${this.#renderTabContent(map, region)}
            </div>

            <!-- LAUNCH CTA BOX -->
            <div class="launch-box">
              <div class="launch-desc">
                <b>Target Simulasi 3D: Jezero Crater Swarm Mission</b>
                <p>Jelajahi danau purba Jezero Crater dalam visualisasi Three.js dengan 3 robot spesialis (Mapper, GeoLab, Transport)!</p>
              </div>
              <button id="btnLaunch3D" class="btn-launch">
                <span>🚀 Luncurkan Ekspedisi 3D Jezero Crater</span>
                <span style="font-size:11px;opacity:0.85">Masuk ke Simulasi Permukaan Mars &amp; 3 Robot Swarm ➔</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.#attachListeners();
  }

  #renderTabContent(map, region) {
    if (this.activeTab === 'regions') {
      return `
        <div class="panel-section">
          <div class="region-hero">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <h2 class="region-title">${region.name}</h2>
                <div class="region-coords">📍 ${region.coords} · ${region.type}</div>
              </div>
              <span class="epoch-badge" style="background:${region.epochColor || '#e07a5f'}22;color:${region.epochColor || '#e07a5f'};border:1px solid ${region.epochColor || '#e07a5f'}">
                ${region.epoch}
              </span>
            </div>
            <p class="region-desc">${region.description}</p>
          </div>

          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Kelompok Material:</span>
              <span class="spec-val">${region.materialGroup || 'Lowland / Sedimentary'}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Fenomena Utama:</span>
              <span class="spec-val">${region.phenomena ? region.phenomena.join(', ') : 'Impact & Volcanism'}</span>
            </div>
          </div>

          <div style="margin-top:12px;background:#241610;border:1px solid #5a3824;border-radius:6px;padding:8px 10px">
            <b style="color:#ffb98a;font-size:11px">Tentang Peta USGS I-1802-B:</b>
            <p style="margin:4px 0 0;font-size:11px;color:#cbb5a2;line-height:1.45">${map.description}</p>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'materials') {
      return `
        <div class="panel-section">
          <h3 style="margin:0 0 6px;color:#ffb98a;font-size:13px">Description of Map Units (Kelompok Material Geologi)</h3>
          <p style="font-size:11px;color:#bba28f;margin-bottom:10px">
            Peta USGS I-1802-B membagi material batuan dan tanah Mars ke dalam 4 kelompok strata:
          </p>
          <div class="materials-list">
            ${map.materialGroups ? map.materialGroups.map(m => `
              <div class="material-card" style="border-left-color:${m.color}">
                <div class="material-name" style="color:${m.color}">${m.name}</div>
                <div class="material-focus">${m.focus}</div>
              </div>
            `).join('') : ''}
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'epochs') {
      return `
        <div class="panel-section">
          <h3 style="margin:0 0 6px;color:#ffb98a;font-size:13px">Kronologi Umur Geologi Mars</h3>
          <p style="font-size:11px;color:#bba28f;margin-bottom:10px">
            Tiga pembagian era geologis Mars yang digunakan sebagai kerangka waktu stratigrafi:
          </p>
          <div class="epochs-timeline">
            ${map.epochs ? map.epochs.map(e => `
              <div class="epoch-card" style="border-left-color:${e.badgeColor}">
                <div class="epoch-header">
                  <span class="epoch-name">${e.name}</span>
                  <span class="epoch-period" style="background:${e.badgeColor}22;color:${e.badgeColor}">${e.period} (${e.age})</span>
                </div>
                <p class="epoch-desc">${e.characteristics}</p>
              </div>
            `).join('') : ''}
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'phenomena') {
      return `
        <div class="panel-section">
          <h3 style="margin:0 0 6px;color:#ffb98a;font-size:13px">6 Fenomena Geologi Utama Mars</h3>
          <p style="font-size:11px;color:#bba28f;margin-bottom:10px">
            Enam topik fenomena geologis yang dapat diteliti pada cakupan peta ekuator timur ini:
          </p>
          <div class="phenomena-grid">
            ${map.phenomena ? map.phenomena.map(p => `
              <div class="phenomenon-card">
                <div class="phenomenon-icon">${p.icon}</div>
                <div>
                  <div class="phenomenon-title">${p.title}</div>
                  <div class="phenomenon-summary">${p.summary}</div>
                </div>
              </div>
            `).join('') : ''}
          </div>
        </div>
      `;
    }

    return '';
  }

  #attachListeners() {
    // Map switching pills
    this.container.querySelectorAll('.map-pill').forEach(btn => {
      btn.onclick = () => {
        const mapId = btn.dataset.mapId;
        const targetMap = getMapById(mapId);
        if (targetMap && !targetMap.isPlaceholder) {
          this.currentMap = targetMap;
          this.selectedRegion = targetMap.keyRegions[0];
          this.render();
        } else if (targetMap && targetMap.isPlaceholder) {
          alert('Slot ini disiapkan sebagai template untuk ditambahkan peta baru oleh rekan tim Anda di web/src/maps/mapRegistry.js!');
        }
      };
    });

    // Region selection clicks (from grid pins or cards)
    this.container.querySelectorAll('[data-region-id]').forEach(el => {
      el.onclick = () => {
        const rId = el.dataset.regionId;
        const found = this.currentMap.keyRegions.find(r => r.id === rId);
        if (found) {
          this.selectedRegion = found;
          this.render();
        }
      };
    });

    // Info tab navigation
    this.container.querySelectorAll('.info-tab').forEach(tabBtn => {
      tabBtn.onclick = () => {
        this.activeTab = tabBtn.dataset.tab;
        this.render();
      };
    });

    // Launch button
    const btnLaunch = this.container.querySelector('#btnLaunch3D');
    if (btnLaunch) {
      btnLaunch.onclick = () => {
        this.hide();
        this.onLaunchSimulation(this.selectedRegion);
      };
    }
  }
}
