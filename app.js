/* =========================================================
   IZIN KERJA - APP.JS
   KODE BROWSER / FRONTEND
   ========================================================= */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const toast = $("#toast");

  function showToast(message, type = "info") {
    if (!toast) {
      alert(message);
      return;
    }

    toast.textContent = message;
    toast.className = "toast " + type;

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
      toast.className = "toast";
      toast.textContent = "";
    }, 5000);
  }

  /* =======================================================
     DATA CHECKBOX DINAMIS
     ======================================================= */

  const HAZARDS = [
    "Kebakaran",
    "Ledakan",
    "Tersengat listrik",
    "Terjatuh",
    "Tertimpa benda",
    "Terjepit",
    "Terpotong",
    "Terpapar panas",
    "Terpapar bahan kimia",
    "Debu / asap",
    "Kebisingan",
    "Getaran",
    "Ruang terbatas",
    "Kurang penerangan",
    "Pergerakan kereta api",
    "Lalu lintas kendaraan",
    "Lingkungan kerja licin",
    "Lain-lain"
  ];

  const PRECAUTIONS = [
    "Area kerja sudah diamankan",
    "Izin kerja telah diperiksa",
    "Sumber listrik telah diputus",
    "Peralatan telah diperiksa",
    "APAR tersedia",
    "Rambu keselamatan dipasang",
    "Barikade dipasang",
    "Penerangan cukup",
    "Ventilasi cukup",
    "Pengawasan pekerjaan tersedia",
    "Komunikasi tersedia",
    "Jalur evakuasi tersedia",
    "Pekerja telah diberi pengarahan",
    "Kondisi lingkungan telah diperiksa",
    "Peralatan kerja layak digunakan",
    "Lain-lain"
  ];

  const PPE = [
    "Helm keselamatan",
    "Sepatu keselamatan",
    "Sarung tangan",
    "Kacamata keselamatan",
    "Pelindung wajah",
    "Masker",
    "Pelindung telinga",
    "Rompi keselamatan",
    "Full body harness",
    "Respirator",
    "Pakaian kerja",
    "APD khusus sesuai pekerjaan"
  ];

  const APPROVALS = [
    "Pemohon / Pelaksana",
    "Pengawas Pekerjaan",
    "Pemberi Izin",
    "Penanggung Jawab"
  ];

  const COMPLETION = [
    "Pekerjaan telah selesai",
    "Area kerja telah dibersihkan",
    "Peralatan telah dikembalikan",
    "Tidak ada bahaya yang tersisa",
    "Izin kerja dinyatakan selesai"
  ];

  function createCheckbox(containerId, name, values) {
    const container = document.getElementById(containerId);

    if (!container) return;

    container.innerHTML = "";

    values.forEach((value, index) => {
      const label = document.createElement("label");
      label.className = "check";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = name;
      input.value = value;
      input.id = `${name}_${index}`;

      const span = document.createElement("span");
      span.textContent = value;

      label.appendChild(input);
      label.appendChild(span);

      container.appendChild(label);
    });
  }

  function createApprovals() {
    const container = $("#approvals");

    if (!container) return;

    container.innerHTML = "";

    APPROVALS.forEach((name, index) => {
      const box = document.createElement("div");
      box.className = "approval-box";

      box.innerHTML = `
        <div class="field-title">${escapeHtml(name)}</div>

        <label>
          Nama
          <input name="approvalName${index + 1}">
        </label>

        <label>
          Jabatan
          <input name="approvalPosition${index + 1}">
        </label>

        <button
          type="button"
          class="signature-open"
          data-target="approvalSignature${index + 1}">
          Buka kolom tanda tangan
        </button>

        <input
          type="hidden"
          name="approvalSignature${index + 1}"
          id="approvalSignature${index + 1}">
      `;

      container.appendChild(box);
    });
  }

  function createCompletion() {
    const container = $("#completion");

    if (!container) return;

    container.innerHTML = "";

    COMPLETION.forEach((value, index) => {
      const label = document.createElement("label");
      label.className = "check";

      label.innerHTML = `
        <input
          type="checkbox"
          name="completion"
          value="${escapeAttribute(value)}"
          id="completion_${index}">
        <span>${escapeHtml(value)}</span>
      `;

      container.appendChild(label);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  /* =======================================================
     FORM DATA
     ======================================================= */

  function getFormData() {
    const form = $("#permitForm");

    if (!form) {
      throw new Error("Form izin kerja tidak ditemukan.");
    }

    const data = {};

    const elements = $$(
      "input, textarea, select",
      form
    );

    elements.forEach(element => {
      if (!element.name) return;

      if (element.type === "checkbox") {
        return;
      }

      if (element.type === "radio") {
        if (element.checked) {
          data[element.name] = element.value;
        }
        return;
      }

      data[element.name] = element.value;
    });

    [
      "workTypes",
      "equipment",
      "hazards",
      "precautions",
      "ppe",
      "completion"
    ].forEach(name => {
      data[name] = $$(
        `input[name="${name}"]:checked`,
        form
      ).map(input => input.value);
    });

    return data;
  }

  /* =======================================================
     NOMOR PERMIT
     ======================================================= */

  async function loadPermitNumber() {
    const input = $('input[name="permitNo"]');

    if (!input || input.value.trim()) return;

    try {
      const response = await fetch(
        "/api/permit/next-number",
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Gagal mengambil nomor permit.");
      }

      const result = await response.json();

      if (result.ok && result.permitNo) {
        input.value = result.permitNo;
      }

    } catch (error) {
      console.error(error);
      showToast(
        "Nomor permit otomatis belum dapat diambil. Anda masih dapat mengisi form.",
        "warning"
      );
    }
  }

  /* =======================================================
     TANDA TANGAN
     ======================================================= */

  let currentSignatureTarget = null;

  const sigModal = $("#sigModal");
  const sigCanvas = $("#sigCanvas");
  const sigCtx = sigCanvas
    ? sigCanvas.getContext("2d")
    : null;

  let drawing = false;

  function prepareCanvas() {
    if (!sigCanvas || !sigCtx) return;

    sigCtx.clearRect(
      0,
      0,
      sigCanvas.width,
      sigCanvas.height
    );

    sigCtx.lineWidth = 3;
    sigCtx.lineCap = "round";
    sigCtx.lineJoin = "round";
    sigCtx.strokeStyle = "#111827";
  }

  function canvasPosition(event) {
    const rect = sigCanvas.getBoundingClientRect();

    let clientX;
    let clientY;

    if (event.touches && event.touches.length) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return {
      x:
        (clientX - rect.left) *
        (sigCanvas.width / rect.width),

      y:
        (clientY - rect.top) *
        (sigCanvas.height / rect.height)
    };
  }

  function startDrawing(event) {
    if (!sigCtx) return;

    event.preventDefault();

    drawing = true;

    const position =
      canvasPosition(event);

    sigCtx.beginPath();

    sigCtx.moveTo(
      position.x,
      position.y
    );
  }

  function draw(event) {
    if (!drawing || !sigCtx) return;

    event.preventDefault();

    const position =
      canvasPosition(event);

    sigCtx.lineTo(
      position.x,
      position.y
    );

    sigCtx.stroke();
  }

  function stopDrawing() {
    drawing = false;
  }

  function openSignature(target) {
    currentSignatureTarget = target;

    if (!sigModal) return;

    prepareCanvas();

    sigModal.classList.remove("hidden");
  }

  function closeSignature() {
    currentSignatureTarget = null;

    if (sigModal) {
      sigModal.classList.add("hidden");
    }
  }

  function useSignature() {
    if (!currentSignatureTarget || !sigCanvas) {
      showToast(
        "Kolom tanda tangan belum dipilih.",
        "warning"
      );
      return;
    }

    const blankCanvas =
      document.createElement("canvas");

    blankCanvas.width =
      sigCanvas.width;

    blankCanvas.height =
      sigCanvas.height;

    if (
      sigCanvas.toDataURL() ===
      blankCanvas.toDataURL()
    ) {
      showToast(
        "Silakan bubuhkan tanda tangan terlebih dahulu.",
        "warning"
      );
      return;
    }

    const target =
      document.getElementById(
        currentSignatureTarget
      );

    if (!target) {
      showToast(
        "Kolom tanda tangan tidak ditemukan.",
        "error"
      );
      return;
    }

    target.value =
      sigCanvas.toDataURL("image/png");

    closeSignature();

    showToast(
      "Tanda tangan berhasil digunakan.",
      "success"
    );
  }

  /* =======================================================
     EVENT TANDA TANGAN
     ======================================================= */

  document.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          ".signature-open"
        );

      if (!button) return;

      const target =
        button.dataset.target;

      if (target) {
        openSignature(target);
      }
    }
  );

  if (sigCanvas) {
    sigCanvas.addEventListener(
      "mousedown",
      startDrawing
    );

    sigCanvas.addEventListener(
      "mousemove",
      draw
    );

    sigCanvas.addEventListener(
      "mouseup",
      stopDrawing
    );

    sigCanvas.addEventListener(
      "mouseleave",
      stopDrawing
    );

    sigCanvas.addEventListener(
      "touchstart",
      startDrawing,
      { passive: false }
    );

    sigCanvas.addEventListener(
      "touchmove",
      draw,
      { passive: false }
    );

    sigCanvas.addEventListener(
      "touchend",
      stopDrawing
    );
  }

  $("#sigClear")?.addEventListener(
    "click",
    prepareCanvas
  );

  $("#sigCancel")?.addEventListener(
    "click",
    closeSignature
  );

  $("#sigUse")?.addEventListener(
    "click",
    useSignature
  );

  /* =======================================================
     PDF
     ======================================================= */

  async function createPdfBlob() {
    if (
      !window.PDFLib ||
      !window.PDFLib.PDFDocument
    ) {
      throw new Error(
        "Library PDF belum berhasil dimuat."
      );
    }

    const {
      PDFDocument,
      StandardFonts,
      rgb
    } = window.PDFLib;

    const data = getFormData();

    /*
     * Untuk sementara membuat PDF hasil pengisian
     * yang berisi data form secara lengkap.
     *
     * Template PDF asli akan kita integrasikan
     * setelah fungsi kirim dasar sudah terbukti bekerja.
     */

    const pdfDoc =
      await PDFDocument.create();

    const page =
      pdfDoc.addPage([
        595.28,
        841.89
      ]);

    const font =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    let y = 800;

    function text(
      value,
      size = 10
    ) {
      if (y < 40) {
        page = pdfDoc.addPage([
          595.28,
          841.89
        ]);
        y = 800;
      }

      page.drawText(
        String(value ?? ""),
        {
          x: 40,
          y,
          size,
          font,
          color: rgb(
            0,
            0,
            0
          ),
          maxWidth: 510
        }
      );

      y -=
        size + 7;
    }

    text(
      "FORM IZIN KERJA",
      18
    );

    text(
      "Permit No: " +
      (data.permitNo || "-"),
      12
    );

    text(
      "Pemohon: " +
      (data.applicantName || "-")
    );

    text(
      "Wilayah: " +
      (data.region || "-")
    );

    text(
      "Lokasi: " +
      (data.location || "-")
    );

    text(
      "Jenis Izin: " +
      (
        data.workTypes || []
      ).join(", ")
    );

    text("");

    text(
      "DESKRIPSI PEKERJAAN",
      13
    );

    text(
      data.jobDescription ||
      "-"
    );

    text("");

    text(
      "JENIS PERALATAN",
      13
    );

    text(
      (
        data.equipment || []
      ).join(", ") ||
      "-"
    );

    text("");

    text(
      "BAHAYA",
      13
    );

    text(
      (
        data.hazards || []
      ).join(", ") ||
      "-"
    );

    text("");

    text(
      "TINDAKAN PENCEGAHAN",
      13
    );

    text(
      (
        data.precautions || []
      ).join(", ") ||
      "-"
    );

    text("");

    text(
      "APD",
      13
    );

    text(
      (
        data.ppe || []
      ).join(", ") ||
      "-"
    );

    text("");

    text(
      "Pemberi Izin: " +
      (data.issuerName || "-")
    );

    text(
      "Pengawas: " +
      (data.supervisorName || "-")
    );

    text(
      "Tanggal dibuat: " +
      new Date().toLocaleString(
        "id-ID"
      )
    );

    const bytes =
      await pdfDoc.save();

    return new Blob(
      [bytes],
      {
        type: "application/pdf"
      }
    );
  }

  /* =======================================================
     DOWNLOAD PDF
     ======================================================= */

  async function savePdf() {
    try {
      showToast(
        "Sedang membuat PDF...",
        "info"
      );

      const blob =
        await createPdfBlob();

      const data =
        getFormData();

      const permit =
        data.permitNo ||
        "izin-kerja";

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        `izin-kerja-${permit}.pdf`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(
        () =>
          URL.revokeObjectURL(url),
        1000
      );

      showToast(
        "PDF berhasil dibuat.",
        "success"
      );

    } catch (error) {
      console.error(error);

      showToast(
        "Gagal membuat PDF: " +
        error.message,
        "error"
      );
    }
  }

  $("#saveBtn")?.addEventListener(
    "click",
    savePdf
  );

  /* =======================================================
     KIRIM EMAIL
     ======================================================= */

  async function sendForm() {
    const button =
      $("#sendBtn");

    try {
      if (button) {
        button.disabled = true;
        button.textContent =
          "Mengirim...";
      }

      showToast(
        "Sedang membuat PDF dan mengirim email...",
        "info"
      );

      const data =
        getFormData();

      if (!data.applicantName) {
        throw new Error(
          "Nama pemohon belum diisi."
        );
      }

      if (!data.location) {
        throw new Error(
          "Lokasi pekerjaan belum diisi."
        );
      }

      const pdfBlob =
        await createPdfBlob();

      const formData =
        new FormData();

      formData.append(
        "pdf",
        pdfBlob,
        `izin-kerja-${data.permitNo || "baru"}.pdf`
      );

      formData.append(
        "data",
        JSON.stringify(data)
      );

      const response =
        await fetch(
          "/api/send-email",
          {
            method: "POST",
            body: formData
          }
        );

      let result;

      try {
        result =
          await response.json();
      } catch {
        throw new Error(
          "Server memberikan respons yang tidak valid."
        );
      }

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
          `Gagal mengirim email (${response.status}).`
        );
      }

      showToast(
        result.message ||
        "Form berhasil dikirim.",
        "success"
      );

    } catch (error) {
      console.error(
        "KIRIM ERROR:",
        error
      );

      showToast(
        error.message ||
        "Gagal mengirim form.",
        "error"
      );

    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML =
          "Kirim<small>Email</small>";
      }
    }
  }

  $("#sendBtn")?.addEventListener(
    "click",
    event => {
      event.preventDefault();
      sendForm();
    }
  );

  /* =======================================================
     PREVIEW PDF
     ======================================================= */

  $("#previewBtn")?.addEventListener(
    "click",
    async event => {
      event.preventDefault();

      try {
        showToast(
          "Membuka pratinjau PDF...",
          "info"
        );

        const blob =
          await createPdfBlob();

        const url =
          URL.createObjectURL(blob);

        window.open(
          url,
          "_blank"
        );

        setTimeout(
          () =>
            URL.revokeObjectURL(url),
          60000
        );

      } catch (error) {
        console.error(error);

        showToast(
          "Gagal membuka PDF: " +
          error.message,
          "error"
        );
      }
    }
  );

  /* =======================================================
     ATAS
     ======================================================= */

  $("#topBtn")?.addEventListener(
    "click",
    () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );

  /* =======================================================
     ADMIN
     ======================================================= */

  const adminModal =
    $("#adminModal");

  const loginBox =
    $("#loginBox");

  const dashboardBox =
    $("#dashboardBox");

  function openAdmin() {
    adminModal?.classList.remove(
      "hidden"
    );

    checkAdmin();
  }

  function closeAdmin() {
    adminModal?.classList.add(
      "hidden"
    );
  }

  async function checkAdmin() {
    try {
      const response =
        await fetch(
          "/api/auth/me",
          {
            credentials: "same-origin"
          }
        );

      if (!response.ok) {
        showLogin();
        return;
      }

      const result =
        await response.json();

      if (result.ok) {
        showDashboard();
        loadPermits();
      } else {
        showLogin();
      }

    } catch {
      showLogin();
    }
  }

  function showLogin() {
    loginBox?.classList.remove(
      "hidden"
    );

    dashboardBox?.classList.add(
      "hidden"
    );
  }

  function showDashboard() {
    loginBox?.classList.add(
      "hidden"
    );

    dashboardBox?.classList.remove(
      "hidden"
    );
  }

  async function loginAdmin() {
    const username =
      $("#adminUser")?.value ||
      "";

    const password =
      $("#adminPass")?.value ||
      "";

    if (!username || !password) {
      showToast(
        "Username dan password wajib diisi.",
        "warning"
      );
      return;
    }

    try {
      const response =
        await fetch(
          "/api/auth/login",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              username,
              password
            })
          }
        );

      const result =
        await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
          "Login gagal."
        );
      }

      showToast(
        "Login admin berhasil.",
        "success"
      );

      showDashboard();

      loadPermits();

    } catch (error) {
      showToast(
        error.message,
        "error"
      );
    }
  }

  async function logoutAdmin() {
    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          credentials:
            "same-origin"
        }
      );
    } finally {
      showLogin();

      showToast(
        "Anda telah keluar.",
        "success"
      );
    }
  }

  async function loadPermits() {
    const table =
      $("#permitTable");

    if (!table) return;

    table.innerHTML =
      "<p>Memuat data...</p>";

    const q =
      $("#searchPermit")?.value ||
      "";

    const status =
      $("#statusFilter")?.value ||
      "";

    try {
      const params =
        new URLSearchParams();

      if (q) {
        params.set(
          "q",
          q
        );
      }

      if (status) {
        params.set(
          "status",
          status
        );
      }

      const response =
        await fetch(
          "/api/permits?" +
          params.toString(),
          {
            credentials:
              "same-origin"
          }
        );

      if (!response.ok) {
        throw new Error(
          "Tidak dapat mengambil data."
        );
      }

      const result =
        await response.json();

      if (!result.ok) {
        throw new Error(
          result.message ||
          "Gagal mengambil data."
        );
      }

      renderPermits(
        result.rows || []
      );

    } catch (error) {
      table.innerHTML =
        `<p>${escapeHtml(
          error.message
        )}</p>`;
    }
  }

  function renderPermits(rows) {
    const table =
      $("#permitTable");

    if (!table) return;

    if (!rows.length) {
      table.innerHTML =
        "<p>Belum ada data izin.</p>";
      return;
    }

    let html = `
      <div style="overflow:auto">
      <table>
        <thead>
          <tr>
            <th>Permit</th>
            <th>Pemohon</th>
            <th>Wilayah</th>
            <th>Lokasi</th>
            <th>Status</th>
            <th>Tanggal</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach(row => {
      html += `
        <tr>
          <td>${escapeHtml(
            row.permitNo
          )}</td>

          <td>${escapeHtml(
            row.applicantName
          )}</td>

          <td>${escapeHtml(
            row.region
          )}</td>

          <td>${escapeHtml(
            row.location
          )}</td>

          <td>
            <select
              class="status-change"
              data-id="${escapeAttribute(
                row.id
              )}">
              ${[
                "DRAFT",
                "DIAJUKAN",
                "DISETUJUI",
                "DITOLAK",
                "SELESAI"
              ].map(status => `
                <option
                  value="${status}"
                  ${row.status === status ? "selected" : ""}>
                  ${status}
                </option>
              `).join("")}
            </select>
          </td>

          <td>${escapeHtml(
            new Date(
              row.createdAt
            ).toLocaleString(
              "id-ID"
            )
          )}</td>

          <td>
            <button
              type="button"
              class="download-admin-pdf"
              data-id="${escapeAttribute(
                row.id
              )}">
              PDF
            </button>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      </div>
    `;

    table.innerHTML =
      html;
  }

  async function changeStatus(
    id,
    status
  ) {
    try {
      const response =
        await fetch(
          `/api/permits/${encodeURIComponent(
            id
          )}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json"
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              status
            })
          }
        );

      const result =
        await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.message ||
          "Gagal mengubah status."
        );
      }

      showToast(
        "Status berhasil diubah.",
        "success"
      );

    } catch (error) {
      showToast(
        error.message,
        "error"
      );
    }
  }

  $("#adminBtn")?.addEventListener(
    "click",
    openAdmin
  );

  $("#loginCancel")?.addEventListener(
    "click",
    closeAdmin
  );

  $("#loginBtn")?.addEventListener(
    "click",
    loginAdmin
  );

  $("#logoutBtn")?.addEventListener(
    "click",
    logoutAdmin
  );

  $("#searchPermit")?.addEventListener(
    "input",
    () => {
      clearTimeout(
        window.__searchTimer
      );

      window.__searchTimer =
        setTimeout(
          loadPermits,
          400
        );
    }
  );

  $("#statusFilter")?.addEventListener(
    "change",
    loadPermits
  );

  $("#permitTable")?.addEventListener(
    "change",
    event => {
      const select =
        event.target.closest(
          ".status-change"
        );

      if (!select) return;

      changeStatus(
        select.dataset.id,
        select.value
      );
    }
  );

  $("#permitTable")?.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          ".download-admin-pdf"
        );

      if (!button) return;

      const id =
        button.dataset.id;

      window.open(
        `/api/permits/${encodeURIComponent(
          id
        )}/pdf`,
        "_blank"
      );
    }
  );

  /* =======================================================
     TUTUP MODAL KETIKA KLIK AREA LUAR
     ======================================================= */

  [sigModal, adminModal].forEach(
    modal => {
      modal?.addEventListener(
        "click",
        event => {
          if (
            event.target === modal
          ) {
            modal.classList.add(
              "hidden"
            );
          }
        }
      );
    }
  );

  /* =======================================================
     INISIALISASI
     ======================================================= */

  function initialize() {
    createCheckbox(
      "hazards",
      "hazards",
      HAZARDS
    );

    createCheckbox(
      "precautions",
      "precautions",
      PRECAUTIONS
    );

    createCheckbox(
      "ppe",
      "ppe",
      PPE
    );

    createApprovals();

    createCompletion();

    loadPermitNumber();

    console.log(
      "IZIN KERJA APP.JS berhasil dimuat."
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize
    );
  } else {
    initialize();
  }

})();
