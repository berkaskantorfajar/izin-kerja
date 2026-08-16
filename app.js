const hazards = [
  'Lantai Licin',
  'Pekerjaan di atas kepala',
  'Orang Masuk Tanpa Izin',
  'Terhantam Benda',
  'Bahaya Kebakaran',
  'Gas',
  'Gelap (Malam)',
  'Lantai yang berlubang',
  'Percikan Palu',
  'Jepit/Perangkap',
  'Cuaca Buruk',
  'Tepian bangunan',
  'Jalan darurat',
  'Bahaya Cedera Tulang Belakang',
  'Ergonomik',
  'Percikan/Leburan Besi panas',
  'Polusi Alam',
  'Tersandung/Jatuh',
  'Kejatuhan Benda atau Material',
  'Asap',
  'Debu',
  'Salah Penyetelan',
  'Lingkungan yang sesak',
  'Benda Tajam',
  'Kegagalan Peralatan',
  'Keseleo',
  'Beban Berat',
  'Bising',
  'Kegagalan Struktur/Alat Bantu',
  'Ketinggian',
  'Tangga yang tidak Kokoh',
  'Vibrasi/Getaran',
  'Bahan Alat Listrik',
  'Pekerjaan lain yang terdekat',
  'Berangin',
  'Tindakan dari pihak ketiga',
  'Obyek Ayunan',
  'Sambungan sedang (Gas/Tekanan)',
  'Tabrakan/Benturan Benda yang Bergerak',
  'Salah komunikasi',
  'Kereta Melintas',
  'Lain-lain 1',
  'Lain-lain 2',
  'Lain-lain 3'
];

const precautions = [
  'Proteksi/Perlindungan Dari Jauh',
  'Rambu-rambu',
  'Pemadam Api/Kebakaran',
  'Body System',
  'Selimut Penghambat Api/Percikan',
  'Penyinaran yang Memadai',
  'Pintu Masuk/Pintu Keluar',
  'Sertifikat Kompetensi',
  'Penyangga',
  'Wajib Mengikuti Penjelasan JSA',
  'Pagar/Barikade/police line',
  'Lain-Lain…..',
  'Handy talkie'
];

const ppe = [
  'Helm Keselamatan',
  'Sarung Tangan Kulit',
  'Sepatu Keselamatan',
  'Baju Kulit',
  'Kacamata Keselamatan',
  'Rompi Keselamatan',
  'Perlindungan Muka/Las',
  'Tali Keselamatan',
  'Kacamata Debu',
  'Masker',
  'Sarung Tangan Katun',
  'Pelindung Pendengaran',
  'Sarung Tangan Karet',
  'Lain-lain'
];

const completion = [
  'Selesai & diperiksa ,tindakan pencegahan khusus (isolasi,…) telah diambil kembali ,lokasi kerja ditinggalkan dalam keadaaanaman dan bahwa operasional dapat kembali normal',
  'Belum selesai dan akan dilanjutkan dengan izin kerja No….',
  'Tidak terselesaikan dan secara tegas dihentikan',
  'Beberapa langkah harus diambil sebelum operasional dapat berlangsung kembali'
];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

function renderChecks(selector, items, name) {
  const el = $(selector);
  if (!el) return;

  el.innerHTML = items.map(x => `
    <label class="check-item">
      <input type="checkbox" name="${name}" value="${escapeHtml(x)}">
      <span>${escapeHtml(x)}</span>
    </label>
  `).join('');
}

function renderApprovals() {
  const el = $('#approvals');
  if (!el) return;

  el.innerHTML = Array.from({ length: 3 }, (_, i) => `
    <div class="approval-row">
      <div class="field-title">Baris persetujuan ${i + 1}</div>

      <div class="grid two">
        <label>
          Penanggung Jawab Izin Kerja
          <input name="approval${i}Responsible">
        </label>

        <label>
          Nama
          <input name="approval${i}Name">
        </label>

        <label>
          Instansi
          <input name="approval${i}Institution">
        </label>

        <label>
          Tanggal
          <input name="approval${i}Date" type="date">
        </label>

        <label>
          Jam
          <input name="approval${i}Time" type="time">
        </label>

        <label>
          Tanda tangan
          <button
            type="button"
            class="signature-open"
            data-target="approval${i}Signature">
            Buka kolom tanda tangan
          </button>
          <input
            type="hidden"
            name="approval${i}Signature"
            id="approval${i}Signature">
        </label>
      </div>
    </div>
  `).join('');
}

function renderCompletion() {
  const el = $('#completion');
  if (!el) return;

  el.innerHTML = completion.map((x, i) => `
    <label class="check-item">
      <input type="radio" name="completion" value="${i}">
      <span>${escapeHtml(x)}</span>
    </label>
  `).join('');
}

renderChecks('#hazards', hazards, 'hazards');
renderChecks('#precautions', precautions, 'precautions');
renderChecks('#ppe', ppe, 'ppe');
renderApprovals();
renderCompletion();

/* =========================================================
   TOAST
========================================================= */

function toast(message) {
  const t = $('#toast');
  if (!t) {
    alert(message);
    return;
  }

  t.textContent = message;
  t.classList.add('show');

  setTimeout(() => {
    t.classList.remove('show');
  }, 3500);
}

/* =========================================================
   SIGNATURE
========================================================= */

let activeSig = null;

const modal = $('#sigModal');
const canvas = $('#sigCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let drawing = false;

function getPointerPosition(e) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (e.clientX - rect.left) * canvas.width / rect.width,
    y: (e.clientY - rect.top) * canvas.height / rect.height
  };
}

function startDrawing(e) {
  if (!ctx) return;

  drawing = true;

  const p = getPointerPosition(e);

  ctx.beginPath();
  ctx.moveTo(p.x, p.y);

  e.preventDefault();
}

function draw(e) {
  if (!drawing || !ctx) return;

  const p = getPointerPosition(e);

  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  e.preventDefault();
}

function stopDrawing() {
  drawing = false;
}

if (canvas && ctx) {
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  canvas.addEventListener('pointerdown', startDrawing);
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointercancel', stopDrawing);
  canvas.addEventListener('pointerleave', stopDrawing);
}

document.addEventListener('click', e => {
  const button = e.target.closest('.signature-open');

  if (!button || !canvas || !ctx || !modal) return;

  activeSig = button.dataset.target;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const target = $('#' + activeSig);

  if (target && target.value) {
    const image = new Image();

    image.onload = () => {
      ctx.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      );
    };

    image.src = target.value;
  }

  modal.classList.remove('hidden');
});

if ($('#sigClear')) {
  $('#sigClear').onclick = () => {
    if (ctx) {
      ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
  };
}

if ($('#sigCancel')) {
  $('#sigCancel').onclick = () => {
    modal.classList.add('hidden');
  };
}

if ($('#sigUse')) {
  $('#sigUse').onclick = () => {
    if (!activeSig || !canvas) return;

    const target = $('#' + activeSig);

    if (target) {
      target.value = canvas.toDataURL('image/png');
    }

    modal.classList.add('hidden');

    toast('Tanda tangan disimpan');
  };
}

/* =========================================================
   COLLECT FORM
========================================================= */

function collect() {
  const form = $('#permitForm');

  if (!form) {
    throw new Error('Form tidak ditemukan.');
  }

  const fd = new FormData(form);
  const data = {};

  for (const [key, value] of fd.entries()) {
    if (
      key === 'workTypes' ||
      key === 'equipment' ||
      key === 'hazards' ||
      key === 'precautions' ||
      key === 'ppe'
    ) {
      if (!data[key]) data[key] = [];
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  return data;
}

/* =========================================================
   PDF HELPER
========================================================= */

async function loadPdf(path) {
  const response = await fetch(path, {
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(
      `Template PDF tidak ditemukan: ${path} (${response.status})`
    );
  }

  return response.arrayBuffer();
}

async function buildPdf() {
  if (typeof PDFLib === 'undefined') {
    throw new Error('Library PDF belum berhasil dimuat.');
  }

  const data = collect();

  const {
    PDFDocument,
    StandardFonts,
    rgb
  } = PDFLib;

  /*
   * FILE PDF BERADA DI ROOT REPOSITORY
   * BUKAN DI /templates/
   */

  const template1Bytes = await loadPdf('/izin-kerja-1.pdf');
  const template2Bytes = await loadPdf('/izin-kerja-2.pdf');

  const template1 = await PDFDocument.load(template1Bytes);
  const template2 = await PDFDocument.load(template2Bytes);

  const output = await PDFDocument.create();

  const [page1] = await output.copyPages(template1, [0]);
  const [page2] = await output.copyPages(template2, [0]);

  output.addPage(page1);
  output.addPage(page2);

  const font = await output.embedFont(
    StandardFonts.Helvetica
  );

  const bold = await output.embedFont(
    StandardFonts.HelveticaBold
  );

  const black = rgb(
    0.05,
    0.05,
    0.05
  );

  function text(
    page,
    value,
    x,
    y,
    size = 7,
    options = {}
  ) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return;
    }

    page.drawText(
      String(value),
      {
        x,
        y,
        size,
        font: options.bold ? bold : font,
        color: black,
        maxWidth: options.maxWidth,
        lineHeight: size + 1
      }
    );
  }

  function box(page, x, y, checked) {
    if (!checked) return;

    page.drawRectangle({
      x,
      y,
      width: 20,
      height: 9,
      borderColor: rgb(
        0.15,
        0.4,
        1
      ),
      borderWidth: 1.4,
      color: rgb(
        1,
        1,
        1
      )
    });

    page.drawText(
      '✓',
      {
        x: x + 4,
        y: y + 1,
        size: 8,
        font: bold,
        color: rgb(
          0.05,
          0.25,
          0.9
        )
      }
    );
  }

  async function drawImage(
    page,
    dataUrl,
    x,
    y,
    width,
    height
  ) {
    if (!dataUrl) return;

    if (!dataUrl.startsWith('data:image/')) {
      return;
    }

    const base64 = dataUrl.split(',')[1];

    if (!base64) return;

    const bytes = Uint8Array.from(
      atob(base64),
      c => c.charCodeAt(0)
    );

    const image = await output.embedPng(bytes);

    page.drawImage(
      image,
      {
        x,
        y,
        width,
        height
      }
    );
  }

  /* =======================================================
     HALAMAN 1
  ======================================================= */

  text(page1, data.docCode, 520, 785, 7);
  text(page1, data.docLevel, 520, 772, 7);
  text(page1, data.revision, 520, 759, 7);
  text(page1, data.effectiveStart, 520, 746, 7);
  text(page1, data.effectiveDate, 80, 733, 7);
  text(page1, data.permitNo, 410, 720, 7);

  const workTypes = data.workTypes || [];

  box(
    page1,
    203,
    708,
    workTypes.includes('Kerja Panas')
  );

  box(
    page1,
    411,
    708,
    workTypes.includes('Ruang Terbatas')
  );

  box(
    page1,
    550,
    708,
    workTypes.includes('Lain-lain')
  );

  text(page1, data.region, 82, 696, 7);
  text(page1, data.applicantName, 420, 696, 7);
  text(page1, data.location, 82, 682, 7);

  await drawImage(
    page1,
    data.applicantSignature,
    420,
    680,
    90,
    22
  );

  text(
    page1,
    data.jobDescription,
    40,
    645,
    7,
    {
      maxWidth: 305
    }
  );

  const equipment = data.equipment || [];

  box(
    page1,
    347,
    648,
    equipment.includes('Mesin')
  );

  box(
    page1,
    347,
    635,
    equipment.includes('Listrik')
  );

  box(
    page1,
    347,
    622,
    equipment.includes('Peralatan Tangan')
  );

  const hazardY = [
    597,
    584,
    571,
    558,
    545,
    532,
    519,
    506,
    493,
    480,
    467
  ];

  const hazardX = [
    39,
    160,
    300,
    448
  ];

  (data.hazards || []).forEach(value => {
    const index = hazards.indexOf(value);

    if (index >= 0) {
      box(
        page1,
        hazardX[index % 4],
        hazardY[Math.floor(index / 4)],
        true
      );
    }
  });

  const precautionY = [
    454,
    441,
    428,
    415,
    402,
    389,
    376
  ];

  const precautionX = [
    39,
    299
  ];

  (data.precautions || []).forEach(value => {
    const index = precautions.indexOf(value);

    if (index >= 0) {
      box(
        page1,
        precautionX[index % 2],
        precautionY[Math.floor(index / 2)],
        true
      );
    }
  });

  text(
    page1,
    data.otherSafety,
    150,
    323,
    7,
    {
      maxWidth: 350
    }
  );

  const ppeY = [
    348,
    335,
    322,
    309,
    296,
    283,
    270
  ];

  (data.ppe || []).forEach(value => {
    const index = ppe.indexOf(value);

    if (index >= 0) {
      box(
        page1,
        [39, 299][index % 2],
        ppeY[Math.floor(index / 2)],
        true
      );
    }
  });

  text(
    page1,
    data.permissionNote,
    40,
    194,
    7,
    {
      maxWidth: 500
    }
  );

  text(page1, data.fromDate, 150, 180, 7);
  text(page1, data.fromTime, 300, 180, 7);
  text(page1, data.issuerName, 390, 180, 7);

  text(page1, data.toDate, 150, 167, 7);
  text(page1, data.toTime, 300, 167, 7);
  text(page1, data.supervisorName, 390, 167, 7);

  /* =======================================================
     HALAMAN 2
  ======================================================= */

  text(page2, data.docCode, 495, 785, 7);
  text(page2, data.docLevel, 495, 772, 7);
  text(page2, data.revision, 495, 759, 7);
  text(page2, data.effectiveStart, 495, 746, 7);
  text(page2, data.effectiveDate, 55, 733, 7);

  for (let i = 0; i < 3; i++) {
    const y = 670 - i * 32;

    text(
      page2,
      data[`approval${i}Responsible`],
      15,
      y,
      6
    );

    text(
      page2,
      data[`approval${i}Name`],
      132,
      y,
      6
    );

    text(
      page2,
      data[`approval${i}Institution`],
      275,
      y,
      6
    );

    text(
      page2,
      data[`approval${i}Date`],
      385,
      y,
      6
    );

    text(
      page2,
      data[`approval${i}Time`],
      468,
      y,
      6
    );

    await drawImage(
      page2,
      data[`approval${i}Signature`],
      520,
      y - 3,
      45,
      16
    );
  }

  text(
    page2,
    data.cancelReason,
    15,
    566,
    7,
    {
      maxWidth: 245
    }
  );

  text(
    page2,
    data.resumeStatement,
    275,
    566,
    7,
    {
      maxWidth: 255
    }
  );

  text(page2, data.cancelDate1, 25, 532, 6);
  text(page2, data.cancelTime1, 115, 532, 6);
  text(page2, data.cancelName1, 210, 532, 6);

  await drawImage(
    page2,
    data.cancelSignature1,
    310,
    525,
    65,
    18
  );

  text(page2, data.cancelDate2, 405, 532, 6);
  text(page2, data.cancelTime2, 470, 532, 6);
  text(page2, data.cancelName2, 520, 532, 6);

  await drawImage(
    page2,
    data.cancelSignature2,
    535,
    525,
    45,
    18
  );

  const comp = Number(data.completion);

  if (Number.isInteger(comp)) {
    box(
      page2,
      20,
      478 - comp * 13,
      true
    );
  }

  text(
    page2,
    data.finalResponsible,
    45,
    425,
    6
  );

  text(
    page2,
    data.finalName,
    200,
    425,
    6
  );

  text(
    page2,
    data.finalInstitution,
    340,
    425,
    6
  );

  text(
    page2,
    data.finalDate,
    415,
    425,
    6
  );

  text(
    page2,
    data.finalTime,
    505,
    425,
    6
  );

  await drawImage(
    page2,
    data.finalSignature,
    520,
    400,
    55,
    18
  );

  const bytes = await output.save();

  return {
    bytes,
    data
  };
}

/* =========================================================
   DOWNLOAD PDF
========================================================= */

async function downloadPdf() {
  try {
    toast('Membuat PDF…');

    const result = await buildPdf();

    const blob = new Blob(
      [result.bytes],
      {
        type: 'application/pdf'
      }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;
    a.download =
      `izin-kerja-${result.data.permitNo || 'baru'}.pdf`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 2000);

    toast('PDF berhasil dibuat');
  } catch (error) {
    console.error('DOWNLOAD PDF ERROR:', error);

    toast(
      error.message ||
      'Gagal membuat PDF'
    );
  }
}

/* =========================================================
   SEND EMAIL
========================================================= */

async function sendEmail() {
  try {
    toast('Membuat PDF…');

    const result = await buildPdf();

    toast('Mengirim email…');

    const formData = new FormData();

    const pdfBlob = new Blob(
      [result.bytes],
      {
        type: 'application/pdf'
      }
    );

    formData.append(
      'pdf',
      pdfBlob,
      `izin-kerja-${result.data.permitNo || 'baru'}.pdf`
    );

    formData.append(
      'data',
      JSON.stringify(result.data)
    );

    console.log(
      'Mengirim PDF ke /api/send-email...'
    );

    const response = await fetch(
      '/api/send-email',
      {
        method: 'POST',
        body: formData
      }
    );

    const contentType =
      response.headers.get('content-type') || '';

    let resultData;

    if (contentType.includes('application/json')) {
      resultData = await response.json();
    } else {
      const text = await response.text();

      resultData = {
        message: text
      };
    }

    console.log(
      'Response API:',
      response.status,
      resultData
    );

    if (!response.ok) {
      throw new Error(
        resultData.message ||
        `Server error ${response.status}`
      );
    }

    toast(
      resultData.message ||
      'Email berhasil dikirim.'
    );

    /*
     * SIMPAN RIWAYAT ADMIN
     */

    try {
      const saveHistory =
        confirm(
          'Email berhasil dikirim.\n\nSimpan juga data ke riwayat Admin?'
        );

      if (!saveHistory) {
        return;
      }

      const historyForm = new FormData();

      historyForm.append(
        'pdf',
        pdfBlob,
        `izin-kerja-${result.data.permitNo || 'baru'}.pdf`
      );

      historyForm.append(
        'data',
        JSON.stringify(result.data)
      );

      const historyResponse =
        await fetch(
          '/api/permits',
          {
            method: 'POST',
            body: historyForm
          }
        );

      const historyContentType =
        historyResponse.headers.get(
          'content-type'
        ) || '';

      let historyResult;

      if (
        historyContentType.includes(
          'application/json'
        )
      ) {
        historyResult =
          await historyResponse.json();
      } else {
        historyResult = {
          message:
            await historyResponse.text()
        };
      }

      if (!historyResponse.ok) {
        if (
          historyResult.message &&
          historyResult.message
            .toLowerCase()
            .includes('login')
        ) {
          toast(
            'Email terkirim, tetapi riwayat Admin belum disimpan karena login Admin diperlukan.'
          );
        } else {
          toast(
            'Email terkirim, tetapi riwayat Admin gagal disimpan.'
          );
        }

        console.error(
          'SAVE HISTORY ERROR:',
          historyResult
        );
      } else {
        toast(
          'Email terkirim dan data tersimpan di riwayat Admin.'
        );
      }
    } catch (historyError) {
      console.error(
        'HISTORY ERROR:',
        historyError
      );

      toast(
        'Email terkirim, tetapi riwayat Admin tidak dapat disimpan.'
      );
    }

  } catch (error) {
    console.error(
      'SEND EMAIL ERROR:',
      error
    );

    toast(
      error.message ||
      'Gagal mengirim email.'
    );
  }
}

/* =========================================================
   BUTTONS
========================================================= */

if ($('#saveBtn')) {
  $('#saveBtn').onclick = downloadPdf;
}

if ($('#sendBtn')) {
  $('#sendBtn').onclick = sendEmail;
}

if ($('#previewBtn')) {
  $('#previewBtn').onclick = async () => {
    try {
      toast('Membuat pratinjau PDF…');

      const result = await buildPdf();

      const blob = new Blob(
        [result.bytes],
        {
          type: 'application/pdf'
        }
      );

      const url =
        URL.createObjectURL(blob);

      window.open(
        url,
        '_blank'
      );

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);

    } catch (error) {
      console.error(
        'PREVIEW PDF ERROR:',
        error
      );

      toast(
        error.message ||
        'Gagal membuat pratinjau PDF.'
      );
    }
  };
}

if ($('#topBtn')) {
  $('#topBtn').onclick = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

const adminModal = $('#adminModal');
const loginBox = $('#loginBox');
const dashboardBox = $('#dashboardBox');

function openAdmin() {
  if (!adminModal) return;

  adminModal.classList.remove('hidden');

  checkAdmin();
}

async function checkAdmin() {
  try {
    const response =
      await fetch('/api/auth/me', {
        cache: 'no-store'
      });

    const result =
      await response.json();

    if (result.ok) {
      loginBox?.classList.add('hidden');
      dashboardBox?.classList.remove('hidden');

      loadPermits();
    } else {
      loginBox?.classList.remove('hidden');
      dashboardBox?.classList.add('hidden');
    }

  } catch (error) {
    console.error(
      'ADMIN CHECK ERROR:',
      error
    );

    loginBox?.classList.remove('hidden');
    dashboardBox?.classList.add('hidden');
  }
}

if ($('#adminBtn')) {
  $('#adminBtn').onclick = openAdmin;
}

if ($('#loginCancel')) {
  $('#loginCancel').onclick = () => {
    adminModal.classList.add('hidden');
  };
}

if ($('#loginBtn')) {
  $('#loginBtn').onclick = async () => {
    try {
      const response =
        await fetch(
          '/api/auth/login',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json'
            },
            body: JSON.stringify({
              username:
                $('#adminUser')?.value || '',
              password:
                $('#adminPass')?.value || ''
            })
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
          'Login Admin gagal.'
        );
      }

      toast(
        'Login Admin berhasil'
      );

      checkAdmin();

    } catch (error) {
      console.error(
        'LOGIN ERROR:',
        error
      );

      toast(
        error.message ||
        'Login Admin gagal.'
      );
    }
  };
}

if ($('#logoutBtn')) {
  $('#logoutBtn').onclick = async () => {
    try {
      await fetch(
        '/api/auth/logout',
        {
          method: 'POST'
        }
      );

      toast(
        'Logout berhasil'
      );

      checkAdmin();

    } catch (error) {
      console.error(
        'LOGOUT ERROR:',
        error
      );
    }
  };
}

if ($('#searchPermit')) {
  $('#searchPermit').oninput =
    () => loadPermits();
}

if ($('#statusFilter')) {
  $('#statusFilter').onchange =
    () => loadPermits();
}

/* =========================================================
   LOAD ADMIN PERMITS
========================================================= */

async function loadPermits() {
  try {
    const search =
      encodeURIComponent(
        $('#searchPermit')?.value || ''
      );

    const status =
      encodeURIComponent(
        $('#statusFilter')?.value || ''
      );

    const response =
      await fetch(
        `/api/permits?q=${search}&status=${status}`,
        {
          cache: 'no-store'
        }
      );

    if (response.status === 401) {
      checkAdmin();
      return;
    }

    const result =
      await response.json();

    const table =
      $('#permitTable');

    if (!table) return;

    if (!result.rows?.length) {
      table.innerHTML =
        '<p class="small">Belum ada data tersimpan.</p>';

      return;
    }

    table.innerHTML = `
      <div class="permit-table">

        <div class="permit-row">
          <b>Permit</b>
          <b>Pemohon</b>
          <b>Wilayah</b>
          <b>Lokasi</b>
          <b>Status</b>
          <b>Aksi</b>
        </div>

        ${result.rows.map(row => `
          <div class="permit-row">

            <span>
              ${escapeHtml(row.permitNo)}
            </span>

            <span>
              ${escapeHtml(row.applicantName)}
            </span>

            <span>
              ${escapeHtml(row.region)}
            </span>

            <span>
              ${escapeHtml(row.location)}
            </span>

            <span>

              <select
                data-id="${escapeHtml(row.id)}"
                class="statusSelect">

                <option
                  ${row.status === 'DRAFT' ? 'selected' : ''}>
                  DRAFT
                </option>

                <option
                  ${row.status === 'DIAJUKAN' ? 'selected' : ''}>
                  DIAJUKAN
                </option>

                <option
                  ${row.status === 'DISETUJUI' ? 'selected' : ''}>
                  DISETUJUI
                </option>

                <option
                  ${row.status === 'DITOLAK' ? 'selected' : ''}>
                  DITOLAK
                </option>

                <option
                  ${row.status === 'SELESAI' ? 'selected' : ''}>
                  SELESAI
                </option>

              </select>

            </span>

            <button
              data-pdf="${escapeHtml(row.id)}">
              PDF
            </button>

          </div>
        `).join('')}

      </div>
    `;

    table
      .querySelectorAll('.statusSelect')
      .forEach(select => {

        select.onchange =
          async () => {

            try {
              const response =
                await fetch(
                  `/api/permits/${select.dataset.id}/status`,
                  {
                    method: 'PATCH',
                    headers: {
                      'Content-Type':
                        'application/json'
                    },
                    body: JSON.stringify({
                      status:
                        select.value
                    })
                  }
                );

              if (!response.ok) {
                throw new Error(
                  'Status gagal diperbarui.'
                );
              }

              toast(
                'Status diperbarui'
              );

            } catch (error) {
              console.error(
                'STATUS ERROR:',
                error
              );

              toast(
                error.message
              );
            }
          };
      });

    table
      .querySelectorAll('[data-pdf]')
      .forEach(button => {

        button.onclick = () => {

          window.open(
            `/api/permits/${button.dataset.pdf}/pdf`,
            '_blank'
          );

        };

      });

  } catch (error) {
    console.error(
      'LOAD PERMITS ERROR:',
      error
    );

    toast(
      'Gagal memuat data Admin.'
    );
  }
}

/* =========================================================
   INITIAL CHECK
========================================================= */

console.log(
  'IZIN KERJA app.js berhasil dimuat.'
);

console.log(
  'PDF template:',
  '/izin-kerja-1.pdf',
  '/izin-kerja-2.pdf'
);
