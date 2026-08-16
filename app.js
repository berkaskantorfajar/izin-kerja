/* =========================================================
   APP.JS - FORM IZIN KERJA
   ========================================================= */

console.log("APP.JS berhasil dimuat.");

/* =========================================================
   KONFIGURASI
========================================================= */

const API = "";

let currentSignatureTarget = null;
let signatureCanvas = null;
let signatureCtx = null;
let signatureDrawing = false;

/* =========================================================
   DATA CHECKBOX
========================================================= */

const HAZARDS = [
  "Kebakaran",
  "Ledakan",
  "Tersengat listrik",
  "Terjatuh",
  "Tertimpa benda",
  "Terjepit",
  "Terpapar bahan kimia",
  "Gas berbahaya",
  "Asap / debu",
  "Kebisingan",
  "Panas",
  "Benda tajam",
  "Peralatan bergerak",
  "Lalu lintas kereta api",
  "Gangguan operasional",
  "Lain-lain"
];

const PRECAUTIONS = [
  "Memasang rambu keselamatan",
  "Menggunakan APD",
  "Mematikan sumber listrik",
  "Mengamankan area kerja",
  "Menyiapkan alat pemadam",
  "Melakukan pemeriksaan peralatan",
  "Melakukan briefing keselamatan",
  "Menggunakan pengaman jatuh",
  "Menyiapkan ventilasi",
  "Mengisolasi sumber bahaya",
  "Menyiapkan petugas pengawas",
  "Menghentikan pekerjaan apabila kondisi tidak aman",
  "Berkoordinasi dengan petugas terkait",
  "Lain-lain"
];

const PPE = [
  "Helm keselamatan",
  "Sepatu keselamatan",
  "Sarung tangan",
  "Kacamata keselamatan",
  "Pelindung wajah",
  "Pelindung telinga",
  "Masker",
  "Rompi keselamatan",
  "Sabuk pengaman",
  "Full body harness",
  "Pelindung pernapasan",
  "APD khusus lainnya"
];

const APPROVALS = [
  "Pemohon / Pelaksana",
  "Pengawas Pekerjaan",
  "Pemberi Izin",
  "Petugas Keselamatan"
];

const COMPLETION = [
  "Pekerjaan telah selesai.",
  "Area kerja telah dibersihkan.",
  "Peralatan telah dikembalikan.",
  "Tidak terdapat kondisi yang membahayakan.",
  "Izin kerja dinyatakan selesai."
];

/* =========================================================
   HELPER
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(
    document.querySelectorAll(selector)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, duration = 3000) {

  const toast = $("#toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(
    showToast.timer
  );

  showToast.timer =
    setTimeout(() => {
      toast.classList.remove("show");
    }, duration);
}

function openModal(id) {

  const el = document.getElementById(id);

  if (el) {
    el.classList.remove("hidden");
  }
}

function closeModal(id) {

  const el = document.getElementById(id);

  if (el) {
    el.classList.add("hidden");
  }
}

/* =========================================================
   RENDER CHECKBOX
========================================================= */

function renderCheckboxes() {

  const hazards =
    $("#hazards");

  if (hazards) {

    hazards.innerHTML =
      HAZARDS.map(
        (item, index) => `
          <label class="check">
            <input
              type="checkbox"
              name="hazards"
              value="${escapeHtml(item)}"
            >
            <span>
              ${escapeHtml(item)}
            </span>
          </label>
        `
      ).join("");

  }

  const precautions =
    $("#precautions");

  if (precautions) {

    precautions.innerHTML =
      PRECAUTIONS.map(
        (item, index) => `
          <label class="check">
            <input
              type="checkbox"
              name="precautions"
              value="${escapeHtml(item)}"
            >
            <span>
              ${escapeHtml(item)}
            </span>
          </label>
        `
      ).join("");

  }

  const ppe =
    $("#ppe");

  if (ppe) {

    ppe.innerHTML =
      PPE.map(
        item => `
          <label class="check">
            <input
              type="checkbox"
              name="ppe"
              value="${escapeHtml(item)}"
            >
            <span>
              ${escapeHtml(item)}
            </span>
          </label>
        `
      ).join("");

  }

  const approvals =
    $("#approvals");

  if (approvals) {

    approvals.innerHTML =
      APPROVALS.map(
        (item, index) => `
          <div class="approval-item">

            <div class="approval-title">
              ${escapeHtml(item)}
            </div>

            <label>
              Nama
              <input
                name="approvalName${index + 1}"
              >
            </label>

            <label>
              Tanggal
              <input
                name="approvalDate${index + 1}"
                type="date"
              >
            </label>

            <button
              type="button"
              class="signature-open"
              data-target="approvalSignature${index + 1}"
            >
              Buka kolom tanda tangan
            </button>

            <input
              type="hidden"
              name="approvalSignature${index + 1}"
              id="approvalSignature${index + 1}"
            >

          </div>
        `
      ).join("");

  }

  const completion =
    $("#completion");

  if (completion) {

    completion.innerHTML =
      COMPLETION.map(
        item => `
          <label class="check">
            <input
              type="checkbox"
              name="completion"
              value="${escapeHtml(item)}"
            >
            <span>
              ${escapeHtml(item)}
            </span>
          </label>
        `
      ).join("");

  }
}

/* =========================================================
   FORM DATA
========================================================= */

function getFormData() {

  const form =
    $("#permitForm");

  if (!form) {
    return {};
  }

  const data = {};

  const elements =
    Array.from(
      form.elements
    );

  elements.forEach(
    element => {

      if (!element.name) {
        return;
      }

      if (
        element.type === "checkbox"
      ) {
        return;
      }

      if (
        element.type === "button"
      ) {
        return;
      }

      data[element.name] =
        element.value || "";

    }
  );

  /* -----------------------------------------
     CHECKBOX ARRAY
  ----------------------------------------- */

  const checkboxNames = [
    "workTypes",
    "equipment",
    "hazards",
    "precautions",
    "ppe",
    "completion"
  ];

  checkboxNames.forEach(
    name => {

      data[name] =
        $all(
          `input[name="${name}"]:checked`
        ).map(
          input => input.value
        );

    }
  );

  /* -----------------------------------------
     STATUS
  ----------------------------------------- */

  data.status = "DRAFT";

  return data;
}

/* =========================================================
   SET FORM DATA
========================================================= */

function setFormData(data) {

  if (!data) {
    return;
  }

  const form =
    $("#permitForm");

  if (!form) {
    return;
  }

  Object.keys(data)
    .forEach(name => {

      const value =
        data[name];

      const checkbox =
        form.querySelectorAll(
          `input[name="${name}"]`
        );

      if (
        checkbox.length &&
        Array.isArray(value)
      ) {

        checkbox.forEach(
          input => {

            input.checked =
              value.includes(
                input.value
              );

          }
        );

        return;
      }

      const element =
        form.querySelector(
          `[name="${name}"]`
        );

      if (element) {

        element.value =
          value ?? "";

      }

    });

}

/* =========================================================
   NOMOR PERMIT
========================================================= */

async function loadPermitNumber() {

  const input =
    document.querySelector(
      '[name="permitNo"]'
    );

  if (!input) {
    return;
  }

  if (input.value.trim()) {
    return;
  }

  try {

    const response =
      await fetch(
        API +
        "/api/permit/next-number",
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const result =
      await response.json();

    if (
      result.ok &&
      result.permitNo
    ) {

      input.value =
        result.permitNo;

    }

  } catch (error) {

    console.error(
      "Gagal mengambil nomor permit:",
      error
    );

  }
}

/* =========================================================
   SIGNATURE
========================================================= */

function setupSignature() {

  signatureCanvas =
    $("#sigCanvas");

  if (!signatureCanvas) {
    return;
  }

  signatureCtx =
    signatureCanvas.getContext(
      "2d"
    );

  signatureCtx.lineWidth = 3;
  signatureCtx.lineCap = "round";
  signatureCtx.lineJoin = "round";

  function getPosition(event) {

    const rect =
      signatureCanvas.getBoundingClientRect();

    let clientX;
    let clientY;

    if (
      event.touches &&
      event.touches.length
    ) {

      clientX =
        event.touches[0].clientX;

      clientY =
        event.touches[0].clientY;

    } else {

      clientX =
        event.clientX;

      clientY =
        event.clientY;

    }

    return {

      x:
        (
          clientX -
          rect.left
        ) *
        (
          signatureCanvas.width /
          rect.width
        ),

      y:
        (
          clientY -
          rect.top
        ) *
        (
          signatureCanvas.height /
          rect.height
        )

    };

  }

  function start(event) {

    event.preventDefault();

    signatureDrawing = true;

    const p =
      getPosition(event);

    signatureCtx.beginPath();

    signatureCtx.moveTo(
      p.x,
      p.y
    );

  }

  function move(event) {

    if (!signatureDrawing) {
      return;
    }

    event.preventDefault();

    const p =
      getPosition(event);

    signatureCtx.lineTo(
      p.x,
      p.y
    );

    signatureCtx.stroke();

  }

  function end(event) {

    if (event) {
      event.preventDefault();
    }

    signatureDrawing = false;

  }

  signatureCanvas.addEventListener(
    "mousedown",
    start
  );

  signatureCanvas.addEventListener(
    "mousemove",
    move
  );

  signatureCanvas.addEventListener(
    "mouseup",
    end
  );

  signatureCanvas.addEventListener(
    "mouseleave",
    end
  );

  signatureCanvas.addEventListener(
    "touchstart",
    start,
    { passive: false }
  );

  signatureCanvas.addEventListener(
    "touchmove",
    move,
    { passive: false }
  );

  signatureCanvas.addEventListener(
    "touchend",
    end,
    { passive: false }
  );
}

function clearSignature() {

  if (
    !signatureCanvas ||
    !signatureCtx
  ) {
    return;
  }

  signatureCtx.clearRect(
    0,
    0,
    signatureCanvas.width,
    signatureCanvas.height
  );
}

function openSignature(target) {

  currentSignatureTarget =
    target;

  clearSignature();

  const hidden =
    document.getElementById(
      target
    );

  if (
    hidden &&
    hidden.value
  ) {

    const image =
      new Image();

    image.onload =
      () => {

        signatureCtx.drawImage(
          image,
          0,
          0,
          signatureCanvas.width,
          signatureCanvas.height
        );

      };

    image.src =
      hidden.value;

  }

  openModal(
    "sigModal"
  );
}

function useSignature() {

  if (
    !currentSignatureTarget ||
    !signatureCanvas
  ) {
    return;
  }

  const dataUrl =
    signatureCanvas.toDataURL(
      "image/png"
    );

  const target =
    document.getElementById(
      currentSignatureTarget
    );

  if (target) {

    target.value =
      dataUrl;

  }

  closeModal(
    "sigModal"
  );

  showToast(
    "Tanda tangan digunakan."
  );
}

/* =========================================================
   SIGNATURE BUTTON EVENT
========================================================= */

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".signature-open"
      );

    if (!button) {
      return;
    }

    const target =
      button.dataset.target;

    if (target) {

      openSignature(
        target
      );

    }

  }
);

/* =========================================================
   SAVE DATA
========================================================= */

async function savePermit() {

  const data =
    getFormData();

  // ------------------------------------------------------
  // TIDAK ADA VALIDASI FIELD WAJIB
  // ------------------------------------------------------

  data.status = "DRAFT";

  try {

    showToast(
      "Menyimpan data..."
    );

    const response =
      await fetch(
        API +
        "/api/permits",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              data
            })

        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Gagal menyimpan data."
      );

    }

    if (
      result.row &&
      result.row.permitNo
    ) {

      const permitInput =
        document.querySelector(
          '[name="permitNo"]'
        );

      if (permitInput) {

        permitInput.value =
          result.row.permitNo;

      }

    }

    showToast(
      "Data berhasil disimpan sebagai DRAFT."
    );

    return result;

  } catch (error) {

    console.error(
      "SAVE ERROR:",
      error
    );

    showToast(
      error.message ||
      "Gagal menyimpan data."
    );

    throw error;

  }
}

/* =========================================================
   GENERATE PDF
========================================================= */

async function generatePdf() {

  if (
    typeof PDFLib ===
    "undefined"
  ) {

    throw new Error(
      "Library PDF belum termuat."
    );

  }

  /*
   * Versi ini membuat PDF dari data form.
   *
   * Jika app.js lama Anda sudah memiliki
   * fungsi PDF berdasarkan TEMPLATE PDF asli,
   * fungsi ini dapat diganti dengan fungsi
   * template tersebut.
   */

  const {
    PDFDocument,
    StandardFonts,
    rgb
  } = PDFLib;

  const pdfDoc =
    await PDFDocument.create();

  const page =
    pdfDoc.addPage([
      595,
      842
    ]);

  const font =
    await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

  const bold =
    await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

  const data =
    getFormData();

  let y = 810;

  function text(
    value,
    size = 9,
    isBold = false
  ) {

    if (y < 40) {

      const newPage =
        pdfDoc.addPage([
          595,
          842
        ]);

      y = 810;

      newPage.drawText(
        String(value || ""),
        {
          x: 35,
          y,
          size,
          font:
            isBold
              ? bold
              : font
        }
      );

      y -=
        size + 7;

      return newPage;

    }

    page.drawText(
      String(value || ""),
      {
        x: 35,
        y,
        size,
        font:
          isBold
            ? bold
            : font
      }
    );

    y -=
      size + 7;

    return page;
  }

  text(
    "FORM IZIN KERJA",
    16,
    true
  );

  y -= 8;

  text(
    "Permit No : " +
      (data.permitNo || "-"),
    10,
    true
  );

  text(
    "Kode Dokumen : " +
      (data.docCode || "-")
  );

  text(
    "Level Dokumen : " +
      (data.docLevel || "-")
  );

  text(
    "Revisi : " +
      (data.revision || "-")
  );

  y -= 8;

  text(
    "A. APLIKASI",
    12,
    true
  );

  text(
    "Jenis pekerjaan : " +
      (
        data.workTypes || []
      ).join(", ")
  );

  text(
    "Wilayah : " +
      (data.region || "-")
  );

  text(
    "Pemohon : " +
      (
        data.applicantName ||
        "-"
      )
  );

  text(
    "Lokasi : " +
      (
        data.location ||
        "-"
      )
  );

  y -= 8;

  text(
    "B. DESKRIPSI KERJA",
    12,
    true
  );

  text(
    "Deskripsi : " +
      (
        data.jobDescription ||
        "-"
      )
  );

  text(
    "Peralatan : " +
      (
        data.equipment || []
      ).join(", ")
  );

  y -= 8;

  text(
    "C. BAHAYA",
    12,
    true
  );

  text(
    (
      data.hazards || []
    ).join(", ") || "-"
  );

  y -= 8;

  text(
    "D. TINDAKAN PENCEGAHAN",
    12,
    true
  );

  text(
    (
      data.precautions || []
    ).join(", ") || "-"
  );

  text(
    "Tindakan lain : " +
      (
        data.otherSafety ||
        "-"
      )
  );

  y -= 8;

  text(
    "E. ALAT PELINDUNG DIRI",
    12,
    true
  );

  text(
    (
      data.ppe || []
    ).join(", ") || "-"
  );

  y -= 8;

  text(
    "F. PENGELUARAN SURAT IZIN",
    12,
    true
  );

  text(
    "Catatan izin : " +
      (
        data.permissionNote ||
        "-"
      )
  );

  text(
    "Dari : " +
      (
        data.fromDate || "-"
      ) +
      " " +
      (
        data.fromTime || "-"
      )
  );

  text(
    "Sampai : " +
      (
        data.toDate || "-"
      ) +
      " " +
      (
        data.toTime || "-"
      )
  );

  text(
    "Pemberi Izin : " +
      (
        data.issuerName ||
        "-"
      )
  );

  text(
    "Pengawas : " +
      (
        data.supervisorName ||
        "-"
      )
  );

  y -= 8;

  text(
    "H. PEMBATALAN",
    12,
    true
  );

  text(
    "Alasan : " +
      (
        data.cancelReason ||
        "-"
      )
  );

  text(
    "Pernyataan dapat dimulai kembali : " +
      (
        data.resumeStatement ||
        "-"
      )
  );

  y -= 8;

  text(
    "PENYELESAIAN IZIN KERJA",
    12,
    true
  );

  text(
    (
      data.completion || []
    ).join(", ") || "-"
  );

  text(
    "Penanggung Jawab : " +
      (
        data.finalResponsible ||
        "-"
      )
  );

  text(
    "Nama : " +
      (
        data.finalName ||
        "-"
      )
  );

  text(
    "Instansi : " +
      (
        data.finalInstitution ||
        "-"
      )
  );

  text(
    "Tanggal : " +
      (
        data.finalDate ||
        "-"
      )
  );

  text(
    "Jam : " +
      (
        data.finalTime ||
        "-"
      )
  );

  const bytes =
    await pdfDoc.save();

  return new Blob(
    [bytes],
    {
      type:
        "application/pdf"
    }
  );
}

/* =========================================================
   DOWNLOAD PDF
========================================================= */

async function downloadPdf() {

  try {

    showToast(
      "Membuat PDF..."
    );

    const blob =
      await generatePdf();

    const data =
      getFormData();

    const permit =
      data.permitNo ||
      "izin-kerja";

    const url =
      URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      "izin-kerja-" +
      permit +
      ".pdf";

    document.body.appendChild(
      a
    );

    a.click();

    a.remove();

    setTimeout(
      () => {
        URL.revokeObjectURL(
          url
        );
      },
      1000
    );

    showToast(
      "PDF berhasil dibuat."
    );

  } catch (error) {

    console.error(
      "PDF ERROR:",
      error
    );

    showToast(
      error.message ||
      "Gagal membuat PDF."
    );

  }

}

/* =========================================================
   BLOB TO BASE64
========================================================= */

function blobToBase64(blob) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            reader.result
          );

      reader.onerror =
        reject;

      reader.readAsDataURL(
        blob
      );

    }
  );

}

/* =========================================================
   KIRIM EMAIL
========================================================= */

async function sendPermit() {

  try {

    showToast(
      "Menyimpan data..."
    );

    const data =
      getFormData();

    /*
     * Form boleh belum lengkap.
     * Tetap simpan dan kirim.
     */

    data.status =
      "DIAJUKAN";

    // ----------------------------------------------------
    // SIMPAN KE SERVER
    // ----------------------------------------------------

    const saveResponse =
      await fetch(
        API +
        "/api/permits",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              data
            })

        }
      );

    const saved =
      await saveResponse.json();

    if (!saveResponse.ok) {

      throw new Error(
        saved.message ||
        "Gagal menyimpan data."
      );

    }

    // ----------------------------------------------------
    // PERBARUI NOMOR PERMIT
    // ----------------------------------------------------

    if (
      saved.row &&
      saved.row.permitNo
    ) {

      data.permitNo =
        saved.row.permitNo;

      const input =
        document.querySelector(
          '[name="permitNo"]'
        );

      if (input) {

        input.value =
          saved.row.permitNo;

      }

    }

    // ----------------------------------------------------
    // PDF
    // ----------------------------------------------------

    showToast(
      "Membuat PDF..."
    );

    const pdfBlob =
      await generatePdf();

    const pdfBase64 =
      await blobToBase64(
        pdfBlob
      );

    // ----------------------------------------------------
    // KIRIM EMAIL
    // ----------------------------------------------------

    showToast(
      "Mengirim email..."
    );

    const response =
      await fetch(
        API +
        "/api/send-email",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              data,

              pdfBase64

            })

        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Gagal mengirim email."
      );

    }

    showToast(
      "Berhasil! Form telah dikirim."
    );

  } catch (error) {

    console.error(
      "SEND ERROR:",
      error
    );

    showToast(
      error.message ||
      "Gagal mengirim form."
    );

  }

}

/* =========================================================
   ADMIN
========================================================= */

async function loginAdmin() {

  const username =
    $("#adminUser")?.value
      ?.trim() || "";

  const password =
    $("#adminPass")?.value || "";

  if (!username) {

    showToast(
      "Username belum diisi."
    );

    return;

  }

  if (!password) {

    showToast(
      "Password belum diisi."
    );

    return;

  }

  try {

    const response =
      await fetch(
        API +
        "/api/auth/login",
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              username,
              password
            })

        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Login gagal."
      );

    }

    showToast(
      "Login berhasil."
    );

    $("#loginBox")
      ?.classList
      .add("hidden");

    $("#dashboardBox")
      ?.classList
      .remove("hidden");

    await loadAdminData();

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    showToast(
      error.message ||
      "Login gagal."
    );

  }

}

/* =========================================================
   CEK LOGIN
========================================================= */

async function checkAdminLogin() {

  try {

    const response =
      await fetch(
        API +
        "/api/auth/me",
        {
          method: "GET",
          cache: "no-store"
        }
      );

    if (!response.ok) {
      return false;
    }

    const result =
      await response.json();

    if (result.ok) {

      $("#loginBox")
        ?.classList
        .add("hidden");

      $("#dashboardBox")
        ?.classList
        .remove("hidden");

      await loadAdminData();

      return true;

    }

  } catch (error) {

    console.error(
      "CHECK LOGIN ERROR:",
      error
    );

  }

  return false;
}

/* =========================================================
   LOAD ADMIN DATA
========================================================= */

async function loadAdminData() {

  const q =
    $("#searchPermit")
      ?.value
      ?.trim() || "";

  const status =
    $("#statusFilter")
      ?.value || "";

  try {

    const params =
      new URLSearchParams();

    if (q) {
      params.set("q", q);
    }

    if (status) {
      params.set(
        "status",
        status
      );
    }

    const url =
      API +
      "/api/permits" +
      (
        params.toString()
          ? "?" +
            params.toString()
          : ""
      );

    const response =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const result =
      await response.json();

    if (
      response.status === 401
    ) {

      $("#loginBox")
        ?.classList
        .remove("hidden");

      $("#dashboardBox")
        ?.classList
        .add("hidden");

      return;

    }

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Gagal mengambil data."
      );

    }

    renderAdminTable(
      result.rows || []
    );

  } catch (error) {

    console.error(
      "ADMIN DATA ERROR:",
      error
    );

    const table =
      $("#permitTable");

    if (table) {

      table.innerHTML =
        `
        <div class="note">
          ${escapeHtml(
            error.message ||
            "Gagal mengambil data."
          )}
        </div>
        `;

    }

  }

}

/* =========================================================
   ADMIN TABLE
========================================================= */

function renderAdminTable(
  rows
) {

  const container =
    $("#permitTable");

  if (!container) {
    return;
  }

  if (!rows.length) {

    container.innerHTML =
      `
      <div class="note">
        Belum ada data permit.
      </div>
      `;

    return;

  }

  container.innerHTML =
    `
    <div class="admin-table-wrap">

      <table class="admin-table">

        <thead>

          <tr>
            <th>Permit</th>
            <th>Pemohon</th>
            <th>Wilayah</th>
            <th>Lokasi</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>

        </thead>

        <tbody>

          ${rows.map(
            row => `

              <tr>

                <td>
                  ${escapeHtml(
                    row.permitNo
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    row.applicantName ||
                    "-"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    row.region ||
                    "-"
                  )}
                </td>

                <td>
                  ${escapeHtml(
                    row.location ||
                    "-"
                  )}
                </td>

                <td>

                  <select
                    class="status-select"
                    data-id="${escapeHtml(
                      row.id
                    )}"
                  >

                    ${[
                      "DRAFT",
                      "DIAJUKAN",
                      "DISETUJUI",
                      "DITOLAK",
                      "SELESAI"
                    ]
                      .map(
                        status => `
                          <option
                            value="${status}"
                            ${
                              row.status ===
                              status
                                ? "selected"
                                : ""
                            }
                          >
                            ${status}
                          </option>
                        `
                      )
                      .join("")}

                  </select>

                </td>

                <td>

                  <button
                    type="button"
                    class="admin-detail-btn"
                    data-id="${escapeHtml(
                      row.id
                    )}"
                  >
                    Detail
                  </button>

                </td>

              </tr>

            `
          ).join("")}

        </tbody>

      </table>

    </div>
    `;

}

/* =========================================================
   UPDATE STATUS
========================================================= */

async function updateStatus(
  id,
  status
) {

  try {

    const response =
      await fetch(
        API +
        "/api/permits/" +
        encodeURIComponent(id) +
        "/status",
        {

          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({
              status
            })

        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Gagal mengubah status."
      );

    }

    showToast(
      "Status berhasil diubah."
    );

    await loadAdminData();

  } catch (error) {

    console.error(
      "STATUS ERROR:",
      error
    );

    showToast(
      error.message ||
      "Gagal mengubah status."
    );

    await loadAdminData();

  }

}

/* =========================================================
   DETAIL ADMIN
========================================================= */

async function showPermitDetail(
  id
) {

  try {

    const response =
      await fetch(
        API +
        "/api/permits/" +
        encodeURIComponent(id),
        {
          method: "GET",
          cache: "no-store"
        }
      );

    const result =
      await response.json();

    if (!response.ok) {

      throw new Error(
        result.message ||
        "Data tidak ditemukan."
      );

    }

    const row =
      result.row;

    const data =
      row.data || {};

    let message =
      "Permit: " +
      (
        row.permitNo ||
        "-"
      ) +
      "\n\n";

    message +=
      "Status: " +
      (
        row.status ||
        "-"
      ) +
      "\n";

    message +=
      "Pemohon: " +
      (
        row.applicantName ||
        "-"
      ) +
      "\n";

    message +=
      "Wilayah: " +
      (
        row.region ||
        "-"
      ) +
      "\n";

    message +=
      "Lokasi: " +
      (
        row.location ||
        "-"
      ) +
      "\n\n";

    message +=
      "Data lengkap tersedia di form.";

    alert(message);

  } catch (error) {

    console.error(
      "DETAIL ERROR:",
      error
    );

    showToast(
      error.message ||
      "Data tidak ditemukan."
    );

  }

}

/* =========================================================
   LOGOUT
========================================================= */

async function logoutAdmin() {

  try {

    await fetch(
      API +
      "/api/auth/logout",
      {
        method: "POST"
      }
    );

  } catch (error) {

    console.error(
      "LOGOUT ERROR:",
      error
    );

  }

  $("#loginBox")
    ?.classList
    .remove("hidden");

  $("#dashboardBox")
    ?.classList
    .add("hidden");

  if ($("#adminUser")) {
    $("#adminUser").value = "";
  }

  if ($("#adminPass")) {
    $("#adminPass").value = "";
  }

  showToast(
    "Logout berhasil."
  );

}

/* =========================================================
   EVENT ADMIN TABLE
========================================================= */

document.addEventListener(
  "change",
  event => {

    if (
      event.target.classList.contains(
        "status-select"
      )
    ) {

      const id =
        event.target.dataset.id;

      const status =
        event.target.value;

      if (id && status) {

        updateStatus(
          id,
          status
        );

      }

    }

  }
);

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        ".admin-detail-btn"
      );

    if (!button) {
      return;
    }

    const id =
      button.dataset.id;

    if (id) {

      showPermitDetail(
        id
      );

    }

  }
);

/* =========================================================
   SETUP EVENT
========================================================= */

function setupEvents() {

  /* -------------------------------------------------------
     ADMIN BUTTON
  ------------------------------------------------------- */

  $("#adminBtn")
    ?.addEventListener(
      "click",
      async () => {

        openModal(
          "adminModal"
        );

        await checkAdminLogin();

      }
    );

  /* -------------------------------------------------------
     ADMIN LOGIN
  ------------------------------------------------------- */

  $("#loginBtn")
    ?.addEventListener(
      "click",
      loginAdmin
    );

  $("#loginCancel")
    ?.addEventListener(
      "click",
      () => {
        closeModal(
          "adminModal"
        );
      }
    );

  /* -------------------------------------------------------
     LOGOUT
  ------------------------------------------------------- */

  $("#logoutBtn")
    ?.addEventListener(
      "click",
      logoutAdmin
    );

  /* -------------------------------------------------------
     SEARCH
  ------------------------------------------------------- */

  $("#searchPermit")
    ?.addEventListener(
      "input",
      () => {

        clearTimeout(
          setupEvents.searchTimer
        );

        setupEvents.searchTimer =
          setTimeout(
            loadAdminData,
            300
          );

      }
    );

  $("#statusFilter")
    ?.addEventListener(
      "change",
      loadAdminData
    );

  /* -------------------------------------------------------
     SIGNATURE
  ------------------------------------------------------- */

  $("#sigClear")
    ?.addEventListener(
      "click",
      clearSignature
    );

  $("#sigCancel")
    ?.addEventListener(
      "click",
      () => {

        currentSignatureTarget =
          null;

        closeModal(
          "sigModal"
        );

      }
    );

  $("#sigUse")
    ?.addEventListener(
      "click",
      useSignature
    );

  /* -------------------------------------------------------
     SAVE PDF
  ------------------------------------------------------- */

  $("#saveBtn")
    ?.addEventListener(
      "click",
      async () => {

        /*
         * Simpan boleh dilakukan
         * walaupun form belum lengkap.
         */

        try {

          await savePermit();

          await downloadPdf();

        } catch (error) {

          console.error(
            error
          );

        }

      }
    );

  /* -------------------------------------------------------
     SEND
  ------------------------------------------------------- */

  $("#sendBtn")
    ?.addEventListener(
      "click",
      async () => {

        await sendPermit();

      }
    );

  /* -------------------------------------------------------
     PREVIEW
  ------------------------------------------------------- */

  $("#previewBtn")
    ?.addEventListener(
      "click",
      async () => {

        try {

          const blob =
            await generatePdf();

          const url =
            URL.createObjectURL(
              blob
            );

          window.open(
            url,
            "_blank"
          );

        } catch (error) {

          console.error(
            error
          );

          showToast(
            error.message ||
            "Gagal membuat pratinjau PDF."
          );

        }

      }
    );

  /* -------------------------------------------------------
     TOP
  ------------------------------------------------------- */

  $("#topBtn")
    ?.addEventListener(
      "click",
      () => {

        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

      }
    );

  /* -------------------------------------------------------
     ESC
  ------------------------------------------------------- */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeModal(
          "sigModal"
        );

        closeModal(
          "adminModal"
        );

      }

    }
  );

}

/* =========================================================
   FORM SUBMIT
========================================================= */

function setupForm() {

  const form =
    $("#permitForm");

  if (!form) {
    return;
  }

  form.addEventListener(
    "submit",
    event => {

      event.preventDefault();

      savePermit();

    }
  );

}

/* =========================================================
   START APP
========================================================= */

async function initApp() {

  renderCheckboxes();

  setupSignature();

  setupEvents();

  setupForm();

  await loadPermitNumber();

  console.log(
    "Form Izin Kerja siap digunakan."
  );

}

/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initApp
  );

} else {

  initApp();

}
