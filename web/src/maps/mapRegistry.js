/**
 * MARS GEOLOGICAL MAP REGISTRY
 *
 * PANDUAN UNTUK MENAMBAHKAN MAP BARU (UNTUK TIM / TEMAN):
 * -------------------------------------------------------------
 * Untuk menambahkan peta baru, cukup tambahkan objek peta baru ke dalam array `MARS_MAPS` di bawah ini.
 * Setiap objek peta memiliki struktur berikut:
 * - id: String unik (contoh: 'usgs-i-1802-b', 'usgs-i-2766-gale')
 * - code: Kode resmi katalog (misal: 'USGS I-1802-B')
 * - title: Judul lengkap peta
 * - author: Penyusun / peneliti (misal: 'Ronald Greeley dan J. E. Guest')
 * - year: Tahun rilis
 * - scale: Skala peta (misal: '1:15.000.000')
 * - coverage: Cakupan geografis (misal: '57° LU hingga 57° LS')
 * - description: Deskripsi ringkas geologi wilayah
 * - keyRegions: Array daftar lokasi/fitur geologi penting
 * - materialGroups: Kelompok material pada legenda peta
 * - epochs: Kronologi era geologi (Noachian, Hesperian, Amazonian)
 * - phenomena: 6 topik fenomena geologi utama
 * - has3DSimulation: Boolean (true jika terhubung ke simulator 3D medan)
 * - simulationConfig: Konfigurasi start simulator jika has3DSimulation = true
 */

export const MARS_MAPS = [
  {
    id: 'usgs-i-1802-b',
    code: 'USGS I-1802-B',
    title: 'Geologic Map of the Eastern Equatorial Region of Mars',
    author: 'Ronald Greeley dan J. E. Guest',
    year: '1987',
    publisher: 'U.S. Geological Survey (USGS)',
    scale: '1:15.000.000',
    coverage: '57° LU hingga 57° LS (Wilayah Ekuator Timur Mars)',
    has3DSimulation: true,
    activeSectorId: 'jezero',
    description:
      'Peta geologi Mars fundamental yang menggambarkan sejarah pembentukan permukaan Mars, aktivitas vulkanik, tumbukan asteroid, erosi, serta jejak aktivitas air pada masa lampau di belahan ekuator timur Mars.',

    // 1. Bagian-Bagian Utama yang Dieksplorasi
    keyRegions: [
      {
        id: 'jezero',
        name: 'Jezero Crater (Target Misi 3D Swarm)',
        coords: '18.44° LU, 77.45° BT',
        lat: 18.44,
        lon: 77.45,
        type: 'Danau Paleolake & Delta Kawah',
        epoch: 'Noachian – Hesperian',
        epochColor: '#e07a5f',
        materialGroup: 'Sedimentary Deposits & Delta Silts',
        description:
          'Kawah danau purba dengan sistem delta sungai terestrial yang mengawetkan endapan lempung smectite dan karbonat. Lokasi eksplorasi aktif swarm 3 robot.',
        phenomena: ['Fluvial Processes', 'Sedimentary Deposits', 'Impact Craters'],
        hasSimulation: true,
      },
      {
        id: 'acidalia',
        name: 'Acidalia Planitia',
        coords: '49.8° LU, 339.3° BT (-20.7° BB)',
        lat: 49.8,
        lon: 339.3,
        type: 'Dataran Rendah Utara',
        epoch: 'Hesperian – Amazonian',
        epochColor: '#81b29a',
        materialGroup: 'Lowland terrain materials',
        description:
          'Dataran rendah di belahan utara Mars. Sangat menarik untuk mempelajari endapan permukaan, material sedimen, dan kemungkinan proses purba yang berkaitan dengan air.',
        phenomena: ['Sedimentary Deposits', 'Fluvial Processes', 'Aeolian Processes'],
        hasSimulation: false,
      },
      {
        id: 'arabia',
        name: 'Arabia Terra',
        coords: '19.8° LU, 30.0° BT',
        lat: 19.8,
        lon: 30.0,
        type: 'Dataran Tinggi Tua Kawah',
        epoch: 'Noachian (Periode Tertua)',
        epochColor: '#e07a5f',
        materialGroup: 'Highland terrain materials',
        description:
          'Wilayah dataran tinggi tua yang dipenuhi kawah tumbukan. Sangat cocok untuk mempelajari sejarah awal pembentukan kerak Mars, erosi, dan stratifikasi lapisan permukaan.',
        phenomena: ['Impact Craters', 'Aeolian Processes', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'isidis',
        name: 'Isidis Planitia',
        coords: '12.9° LU, 87.0° BT',
        lat: 12.9,
        lon: 87.0,
        type: 'Cekungan Tumbukan Raksasa (Impact Basin)',
        epoch: 'Noachian – Hesperian',
        epochColor: '#f2cc8f',
        materialGroup: 'Lowland terrain materials & Ejecta',
        description:
          'Cekungan tumbukan asteroid berdiameter ~1.500 km. Menarik untuk mempelajari dinamika benturan kosmik, material ejecta, dan evolusi struktural setelah tumbukan.',
        phenomena: ['Impact Craters', 'Sedimentary Deposits', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'syrtis-major',
        name: 'Syrtis Major Planum',
        coords: '8.4° LU, 69.5° BT',
        lat: 8.4,
        lon: 69.5,
        type: 'Perisai Vulkanik Basaltik',
        epoch: 'Hesperian',
        epochColor: '#f2cc8f',
        materialGroup: 'Lowland & Volcanic plains',
        description:
          'Daerah vulkanik ber-albedo gelap yang memiliki jejak aktivitas aliran lava basaltik masif. Kunci untuk memahami evolusi mantel dan gunung api Mars.',
        phenomena: ['Volcanism', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'elysium',
        name: 'Elysium',
        coords: '3.0° LU, 154.7° BT',
        lat: 3.0,
        lon: 154.7,
        type: 'Provinsi Vulkanik & Kaldera',
        epoch: 'Hesperian – Amazonian',
        epochColor: '#81b29a',
        materialGroup: 'Volcanic constructs & flood lava',
        description:
          'Kawasan vulkanik terbesar kedua di Mars yang memiliki dataran lava luas dan struktur gunung api raksasa (Elysium Mons).',
        phenomena: ['Volcanism', 'Tectonic Structures'],
        hasSimulation: false,
      },
      {
        id: 'hesperia',
        name: 'Hesperia Planum',
        coords: '22.3° LS, 110.0° BT',
        lat: -22.3,
        lon: 110.0,
        type: 'Dataran Berpematang (Wrinkle-ridged plains)',
        epoch: 'Hesperian',
        epochColor: '#f2cc8f',
        materialGroup: 'Materials occurring throughout map area',
        description:
          'Dataran lava luas yang menjadi acuan stratigrafi periode Hesperian. Kritis untuk memahami transisi geologi dari masa awal ke pertengahan sejarah Mars.',
        phenomena: ['Volcanism', 'Tectonic Structures'],
        hasSimulation: false,
      },
    ],

    // 2. Jenis Material Geologi (Description of Map Units)
    materialGroups: [
      {
        name: 'Surficial deposits',
        focus: 'Debu, pasir aeolian, bukit pasir, dan endapan permukaan muda.',
        color: '#f4a261',
      },
      {
        name: 'Lowland terrain materials',
        focus: 'Material dataran rendah Mars, sedimen cekungan, dan aliran lava halus.',
        color: '#2a9d8f',
      },
      {
        name: 'Highland terrain materials',
        focus: 'Material dataran tinggi kuno, kerak Noachian tebal, dan sisa benturan kawah purba.',
        color: '#e76f51',
      },
      {
        name: 'Materials throughout map area',
        focus: 'Material transisi yang ditemukan melintasi berbagai wilayah dan batas geologi.',
        color: '#e9c46a',
      },
    ],

    // 3. Pembagian Berdasarkan Umur Geologi (Kronologi)
    epochs: [
      {
        name: 'Noachian',
        period: 'Periode Tertua',
        age: 'Sekitar 4,1 – 3,7 miliar tahun lalu',
        characteristics:
          'Ditandai oleh intensitas tumbukan asteroid tertinggi (Late Heavy Bombardment), iklim yang lebih basah, dan aktivitas air purba.',
        badgeColor: '#e07a5f',
      },
      {
        name: 'Hesperian',
        period: 'Periode Menengah',
        age: 'Sekitar 3,7 – 3,0 miliar tahun lalu',
        characteristics:
          'Banyak berkaitan dengan aktivitas vulkanik global masif, pembentukan dataran lava, dan pelepasan banjir bandang (*catastrophic floods*).',
        badgeColor: '#f2cc8f',
      },
      {
        name: 'Amazonian',
        period: 'Periode Termuda',
        age: 'Sekitar 3,0 miliar tahun lalu hingga sekarang',
        characteristics:
          'Mencakup proses geologi dingin, kering, erosi angin (*aeolian*), akumulasi es kutub, dan vulkanisme sporadis.',
        badgeColor: '#81b29a',
      },
    ],

    // 4. Enam Fenomena Geologi yang Diteliti
    phenomena: [
      {
        id: 'impact',
        title: 'Impact Craters',
        icon: '💥',
        summary: 'Bagaimana asteroid membentuk kawah dan melontarkan material ejecta ke permukaan.',
      },
      {
        id: 'volcanism',
        title: 'Volcanism',
        icon: '🌋',
        summary: 'Bagaimana lava dan aktivitas gunung api membentuk dataran serta kaldera raksasa.',
      },
      {
        id: 'fluvial',
        title: 'Fluvial Processes',
        icon: '🌊',
        summary: 'Jejak aliran air purba, lembah sungai masuk (*inflow valleys*), dan danau kawah.',
      },
      {
        id: 'aeolian',
        title: 'Aeolian Processes',
        icon: '💨',
        summary: 'Bagaimana angin Mars memindahkan debu, pasir, dan membentuk pola gundukan bukit.',
      },
      {
        id: 'sedimentary',
        title: 'Sedimentary Deposits',
        icon: '🧱',
        summary: 'Bagaimana material sedimen mengendap membentuk stratifikasi lapisan batuan delta.',
      },
      {
        id: 'tectonic',
        title: 'Tectonic Structures',
        icon: '⚡',
        summary: 'Retakan graben, patahan sesar, dan pematang kerut (*wrinkle ridges*) pada kerak Mars.',
      },
    ],
  },

  /* --------------------------------------------------------------------------
   * CONTOH SLOT MAP BERIKUTNYA (TEMPLATE UNTUK DITAMBAHKAN OLEH TEMAN TIM):
   * Cukup ubah status 'coming_soon' menjadi peta geologi baru lainnya!
   * -------------------------------------------------------------------------- */
  {
    id: 'usgs-i-2766-gale',
    code: 'USGS I-2766 (Upcoming)',
    title: 'Geologic Map of the Gale Crater Region (Mt. Sharp / Aeolis Mons)',
    author: 'Slot Tambahan untuk Tim',
    year: '2024+',
    publisher: 'USGS / NASA Mars Exploration Program',
    scale: '1:500.000',
    coverage: '5.4° LS, 137.8° BT',
    has3DSimulation: false,
    isPlaceholder: true,
    description:
      'Slot peta geologi selanjutnya untuk ditambahkan oleh rekan tim. Menampilkan stratifikasi sedimentologi kawah Gale dan Aeolis Mons.',
    keyRegions: [
      {
        id: 'gale-floor',
        name: 'Gale Crater Floor (Aeolis Palus)',
        coords: '5.4° LS, 137.8° BT',
        type: 'Danau Sedimen Purba',
        epoch: 'Hesperian',
        description: 'Endapan mudstone dan danau dangkal purba.',
      },
    ],
  },
];

export function getMapById(id) {
  return MARS_MAPS.find(m => m.id === id) || MARS_MAPS[0];
}
