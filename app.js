/* =========================================================
   APP.JS - FORM IZIN KERJA
   ========================================================= */

(() => {
    'use strict';

    /* =====================================================
       KONFIGURASI
       ===================================================== */

    const API = '';

    let currentSignatureTarget = null;
    let signatureDrawing = false;

    /* =====================================================
       HELPER
       ===================================================== */

    const $ = (selector) => document.querySelector(selector);

    const $$ = (selector) =>
        Array.from(document.querySelectorAll(selector));

    function toast(message, type = 'info') {
        const el = $('#toast');

        if (!el) {
            alert(message);
            return;
        }

        el.textContent = message;
        el.className = 'toast show ' + type;

        clearTimeout(window.__toastTimer);

        window.__toastTimer = setTimeout(() => {
            el.className = 'toast';
        }, 4000);
    }

    function formDataObject() {
        const form = $('#permitForm');

        if (!form) {
            throw new Error('Form tidak ditemukan.');
        }

        const fd = new FormData(form);
        const data = {};

        for (const [key, value] of fd.entries()) {

            if (key === 'workTypes' ||
                key === 'equipment' ||
                key === 'hazards' ||
                key === 'precautions' ||
                key === 'ppe') {

                if (!Array.isArray(data[key])) {
                    data[key] = [];
                }

                data[key].push(value);

            } else {

                data[key] = value;
            }
        }

        /* Pastikan checkbox yang tidak dicentang tetap menjadi array */

        const arrayFields = [
            'workTypes',
            'equipment',
            'hazards',
            'precautions',
            'ppe'
        ];

        arrayFields.forEach(key => {
            if (!Array.isArray(data[key])) {
                data[key] = [];
            }
        });

        return data;
    }

    function setField(name, value) {
        const el = document.querySelector(`[name="${name}"]`);

        if (el) {
            el.value = value ?? '';
        }
    }

    /* =====================================================
       DATA CHECKBOX
       ===================================================== */

    const HAZARDS = [
        'Kebakaran',
        'Ledakan',
        'Tersengat listrik',
        'Jatuh dari ketinggian',
        'Tertimpa benda',
        'Terjepit',
        'Terpeleset',
        'Paparan panas',
        'Paparan debu',
        'Paparan bahan kimia',
        'Kebisingan',
        'Getaran',
        'Asap / gas berbahaya',
        'Ruang terbatas',
        'Alat berat',
        'Lalu lintas kendaraan',
        'Pergerakan kereta api',
        'Bahaya lainnya'
    ];

    const PRECAUTIONS = [
        'Area kerja sudah diamankan',
        'Memasang rambu keselamatan',
        'Memasang pembatas area',
        'Melakukan pemeriksaan peralatan',
        'Memastikan peralatan laik digunakan',
        'Memastikan sumber listrik aman',
        'Memastikan APAR tersedia',
        'Memastikan ventilasi cukup',
        'Menggunakan alat pelindung diri',
        'Menunjuk pengawas pekerjaan',
        'Melakukan briefing keselamatan',
        'Memastikan komunikasi tersedia',
        'Mengamankan material dan peralatan',
        'Membersihkan area kerja setelah selesai',
        'Menghentikan pekerjaan apabila kondisi tidak aman'
    ];

    const PPE = [
        'Helm keselamatan',
        'Sepatu keselamatan',
        'Sarung tangan',
        'Kacamata keselamatan',
        'Pelindung wajah',
        'Pelindung telinga',
        'Masker',
        'Respirator',
        'Rompi keselamatan',
        'Full body harness',
        'Safety belt',
        'Pakaian kerja',
        'APD lainnya'
    ];

    const APPROVALS = [
        'Pemohon / Pelaksana Pekerjaan',
        'Pengawas Pekerjaan',
        'Pemberi Izin',
        'Penanggung Jawab'
    ];

    const COMPLETION = [
        'Pekerjaan telah selesai',
        'Area kerja telah dibersihkan',
        'Peralatan telah dikembalikan',
        'Kondisi area telah aman',
        'Izin kerja dinyatakan selesai'
    ];

    /* =====================================================
       RENDER CHECKBOX
       ===================================================== */

    function renderCheckboxes(containerId, items, name) {

        const container = document.getElementById(containerId);

        if (!container) {
            return;
        }

        container.innerHTML = '';

        items.forEach((item, index) => {

            const id =
                name +
                '_' +
                index;

            const label =
                document.createElement('label');

            label.className = 'check';

            label.innerHTML =
                `
                <input
                    type="checkbox"
                    id="${id}"
                    name="${name}"
                    value="${escapeHtml(item)}"
                >
                <span>${escapeHtml(item)}</span>
                `;

            container.appendChild(label);
        });
    }

    function renderApprovals() {

        const container = $('#approvals');

        if (!container) {
            return;
        }

        container.innerHTML = '';

        APPROVALS.forEach((item, index) => {

            const wrapper =
                document.createElement('div');

            wrapper.className = 'approval-item';

            wrapper.innerHTML = `
                <div class="approval-title">
                    ${escapeHtml(item)}
                </div>

                <label>
                    Nama
                    <input
                        name="approvalName${index + 1}"
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
            `;

            container.appendChild(wrapper);
        });
    }

    function renderCompletion() {

        const container = $('#completion');

        if (!container) {
            return;
        }

        container.innerHTML = '';

        COMPLETION.forEach((item, index) => {

            const label =
                document.createElement('label');

            label.className = 'check';

            label.innerHTML = `
                <input
                    type="checkbox"
                    name="completion"
                    value="${escapeHtml(item)}"
                >
                <span>${escapeHtml(item)}</span>
            `;

            container.appendChild(label);
        });
    }

    function escapeHtml(value) {

        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /* =====================================================
       NOMOR PERMIT
       ===================================================== */

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
                    '/api/permit/next-number'
                );

            const result =
                await response.json();

            if (
                result &&
                result.ok &&
                result.permitNo
            ) {

                input.value =
                    result.permitNo;
            }

        } catch (error) {

            console.error(
                'Gagal mengambil nomor permit:',
                error
            );
        }
    }

    /* =====================================================
       SIGNATURE
       ===================================================== */

    function setupSignature() {

        const modal = $('#sigModal');
        const canvas = $('#sigCanvas');

        if (!modal || !canvas) {
            return;
        }

        const ctx =
            canvas.getContext('2d');

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        function position(event) {

            const rect =
                canvas.getBoundingClientRect();

            const source =
                event.touches
                    ? event.touches[0]
                    : event;

            return {
                x:
                    (source.clientX - rect.left) *
                    (canvas.width / rect.width),

                y:
                    (source.clientY - rect.top) *
                    (canvas.height / rect.height)
            };
        }

        function start(event) {

            event.preventDefault();

            signatureDrawing = true;

            const p = position(event);

            ctx.beginPath();

            ctx.moveTo(
                p.x,
                p.y
            );
        }

        function draw(event) {

            if (!signatureDrawing) {
                return;
            }

            event.preventDefault();

            const p = position(event);

            ctx.lineTo(
                p.x,
                p.y
            );

            ctx.stroke();
        }

        function stop(event) {

            if (event) {
                event.preventDefault();
            }

            signatureDrawing = false;
        }

        canvas.addEventListener(
            'mousedown',
            start
        );

        canvas.addEventListener(
            'mousemove',
            draw
        );

        canvas.addEventListener(
            'mouseup',
            stop
        );

        canvas.addEventListener(
            'mouseleave',
            stop
        );

        canvas.addEventListener(
            'touchstart',
            start,
            { passive: false }
        );

        canvas.addEventListener(
            'touchmove',
            draw,
            { passive: false }
        );

        canvas.addEventListener(
            'touchend',
            stop,
            { passive: false }
        );

        $('#sigClear')?.addEventListener(
            'click',
            () => {
                ctx.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
            }
        );

        $('#sigCancel')?.addEventListener(
            'click',
            () => {
                modal.classList.add('hidden');
                currentSignatureTarget = null;
            }
        );

        $('#sigUse')?.addEventListener(
            'click',
            () => {

                if (!currentSignatureTarget) {
                    return;
                }

                const target =
                    document.getElementById(
                        currentSignatureTarget
                    );

                if (target) {

                    target.value =
                        canvas.toDataURL(
                            'image/png'
                        );
                }

                modal.classList.add(
                    'hidden'
                );

                currentSignatureTarget = null;

                toast(
                    'Tanda tangan berhasil digunakan.',
                    'success'
                );
            }
        );

        document.addEventListener(
            'click',
            event => {

                const button =
                    event.target.closest(
                        '.signature-open'
                    );

                if (!button) {
                    return;
                }

                currentSignatureTarget =
                    button.dataset.target;

                ctx.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                const existing =
                    document.getElementById(
                        currentSignatureTarget
                    );

                if (
                    existing &&
                    existing.value &&
                    existing.value.startsWith(
                        'data:image'
                    )
                ) {

                    const img =
                        new Image();

                    img.onload = () => {

                        ctx.drawImage(
                            img,
                            0,
                            0,
                            canvas.width,
                            canvas.height
                        );
                    };

                    img.src =
                        existing.value;
                }

                modal.classList.remove(
                    'hidden'
                );
            }
        );
    }

    /* =====================================================
       PDF
       ===================================================== */

    async function createPDF() {

        if (
            typeof PDFLib ===
            'undefined'
        ) {

            throw new Error(
                'Library PDF belum dimuat. Periksa koneksi internet.'
            );
        }

        const {
            PDFDocument
        } = PDFLib;

        /*
         * PDF dibuat dari tampilan form.
         * Versi ini memastikan tombol bekerja.
         */

        const pdfDoc =
            await PDFDocument.create();

        const page =
            pdfDoc.addPage([
                595.28,
                841.89
            ]);

        const {
            width,
            height
        } = page.getSize();

        const font =
            await pdfDoc.embedFont(
                PDFLib.StandardFonts.Helvetica
            );

        const bold =
            await pdfDoc.embedFont(
                PDFLib.StandardFonts.HelveticaBold
            );

        const data =
            formDataObject();

        let y =
            height - 40;

        function text(
            value,
            size = 9,
            fontUsed = font
        ) {

            const str =
                String(value ?? '');

            const maxWidth =
                width - 60;

            let current = '';

            const words =
                str.split(/\s+/);

            for (const word of words) {

                const test =
                    current
                        ? current + ' ' + word
                        : word;

                if (
                    fontUsed.widthOfTextAtSize(
                        test,
                        size
                    ) > maxWidth
                ) {

                    page.drawText(
                        current,
                        {
                            x: 30,
                            y,
                            size,
                            font: fontUsed
                        }
                    );

                    y -= size + 4;

                    current = word;

                } else {

                    current = test;
                }
            }

            if (current) {

                page.drawText(
                    current,
                    {
                        x: 30,
                        y,
                        size,
                        font: fontUsed
                    }
                );

                y -= size + 4;
            }
        }

        text(
            'FORM IZIN KERJA',
            16,
            bold
        );

        y -= 10;

        const fields = [
            ['Permit No', data.permitNo],
            ['Kode Dokumen', data.docCode],
            ['Level Dokumen', data.docLevel],
            ['Revisi', data.revision],
            ['Tanggal Berlaku', data.effectiveDate],
            ['Wilayah', data.region],
            ['Pemohon / Nama', data.applicantName],
            ['Lokasi', data.location],
            ['Jenis Izin', data.workTypes.join(', ')],
            ['Deskripsi Pekerjaan', data.jobDescription],
            ['Jenis Peralatan', data.equipment.join(', ')],
            ['Bahaya', data.hazards.join(', ')],
            ['Tindakan Pencegahan', data.precautions.join(', ')],
            ['APD', data.ppe.join(', ')],
            ['Tindakan Keselamatan Lain', data.otherSafety],
            ['Catatan Izin', data.permissionNote],
            ['Dari Tanggal', data.fromDate],
            ['Dari Jam', data.fromTime],
            ['Sampai Tanggal', data.toDate],
            ['Sampai Jam', data.toTime],
            ['Pemberi Izin', data.issuerName],
            ['Pengawas Pekerjaan', data.supervisorName],
            ['Alasan Pembatalan', data.cancelReason],
            ['Pernyataan Dapat Dimulai Kembali', data.resumeStatement],
            ['Penanggung Jawab', data.finalResponsible],
            ['Nama Akhir', data.finalName],
            ['Instansi', data.finalInstitution],
            ['Tanggal Penyelesaian', data.finalDate],
            ['Jam Penyelesaian', data.finalTime]
        ];

        for (const [label, value] of fields) {

            if (
                y < 50
            ) {

                const newPage =
                    pdfDoc.addPage([
                        595.28,
                        841.89
                    ]);

                y =
                    newPage.getSize().height -
                    40;
            }

            text(
                label + ': ' + (value || '-'),
                8
            );
        }

        return await pdfDoc.save();
    }

    /* =====================================================
       DOWNLOAD PDF
       ===================================================== */

    async function savePDF() {

        try {

            toast(
                'Sedang membuat PDF...',
                'info'
            );

            const bytes =
                await createPDF();

            const blob =
                new Blob(
                    [bytes],
                    {
                        type:
                            'application/pdf'
                    }
                );

            const url =
                URL.createObjectURL(
                    blob
                );

            const a =
                document.createElement(
                    'a'
                );

            const data =
                formDataObject();

            a.href = url;

            a.download =
                'izin-kerja-' +
                (data.permitNo ||
                    'baru') +
                '.pdf';

            document.body.appendChild(a);

            a.click();

            a.remove();

            URL.revokeObjectURL(
                url
            );

            toast(
                'PDF berhasil dibuat.',
                'success'
            );

        } catch (error) {

            console.error(
                'PDF ERROR:',
                error
            );

            toast(
                error.message ||
                'Gagal membuat PDF.',
                'error'
            );
        }
    }

    /* =====================================================
       KIRIM KE SERVER
       ===================================================== */

    async function submitPermit() {

        try {

            const form =
                $('#permitForm');

            if (!form) {
                throw new Error(
                    'Form tidak ditemukan.'
                );
            }

            /* Validasi sederhana */

            const data =
                formDataObject();

            if (
                !data.applicantName ||
                !data.applicantName.trim()
            ) {

                toast(
                    'Nama pemohon belum diisi.',
                    'error'
                );

                document
                    .querySelector(
                        '[name="applicantName"]'
                    )
                    ?.focus();

                return;
            }

            if (
                !data.location ||
                !data.location.trim()
            ) {

                toast(
                    'Lokasi pekerjaan belum diisi.',
                    'error'
                );

                document
                    .querySelector(
                        '[name="location"]'
                    )
                    ?.focus();

                return;
            }

            toast(
                'Membuat PDF dan mengirim...',
                'info'
            );

            /* Buat PDF */

            const pdfBytes =
                await createPDF();

            /* Simpan data + PDF */

            const uploadData =
                new FormData();

            uploadData.append(
                'data',
                JSON.stringify(data)
            );

            uploadData.append(
                'pdf',
                new Blob(
                    [pdfBytes],
                    {
                        type:
                            'application/pdf'
                    }
                ),
                'izin-kerja-' +
                (data.permitNo ||
                    'baru') +
                '.pdf'
            );

            const saveResponse =
                await fetch(
                    API +
                    '/api/permits',
                    {
                        method: 'POST',
                        body: uploadData
                    }
                );

            const saveResult =
                await readJson(
                    saveResponse
                );

            if (
                !saveResponse.ok ||
                !saveResult.ok
            ) {

                throw new Error(
                    saveResult.message ||
                    'Gagal menyimpan data.'
                );
            }

            /* Kirim email */

            const emailData =
                new FormData();

            emailData.append(
                'data',
                JSON.stringify(data)
            );

            emailData.append(
                'pdf',
                new Blob(
                    [pdfBytes],
                    {
                        type:
                            'application/pdf'
                    }
                ),
                'izin-kerja-' +
                (data.permitNo ||
                    'baru') +
                '.pdf'
            );

            const emailResponse =
                await fetch(
                    API +
                    '/api/send-email',
                    {
                        method: 'POST',
                        body: emailData
                    }
                );

            const emailResult =
                await readJson(
                    emailResponse
                );

            if (
                !emailResponse.ok ||
                !emailResult.ok
            ) {

                throw new Error(
                    emailResult.message ||
                    'Data tersimpan, tetapi email gagal dikirim.'
                );
            }

            toast(
                'Berhasil! Data tersimpan dan PDF telah dikirim ke email.',
                'success'
            );

        } catch (error) {

            console.error(
                'KIRIM ERROR:',
                error
            );

            toast(
                error.message ||
                'Terjadi kesalahan saat mengirim.',
                'error'
            );
        }
    }

    async function readJson(response) {

        const text =
            await response.text();

        try {

            return JSON.parse(
                text
            );

        } catch {

            return {
                ok: false,
                message:
                    text ||
                    'Server memberikan respons yang tidak valid.'
            };
        }
    }

    /* =====================================================
       PREVIEW
       ===================================================== */

    async function previewPDF() {

        try {

            toast(
                'Membuat pratinjau PDF...',
                'info'
            );

            const bytes =
                await createPDF();

            const blob =
                new Blob(
                    [bytes],
                    {
                        type:
                            'application/pdf'
                    }
                );

            const url =
                URL.createObjectURL(
                    blob
                );

            window.open(
                url,
                '_blank'
            );

        } catch (error) {

            console.error(error);

            toast(
                error.message ||
                'Gagal membuat pratinjau PDF.',
                'error'
            );
        }
    }

    /* =====================================================
       ADMIN
       ===================================================== */

    function setupAdmin() {

        const adminBtn =
            $('#adminBtn');

        const modal =
            $('#adminModal');

        if (!adminBtn || !modal) {
            return;
        }

        adminBtn.addEventListener(
            'click',
            async () => {

                modal.classList.remove(
                    'hidden'
                );

                await checkAdmin();
            }
        );

        $('#loginCancel')
            ?.addEventListener(
                'click',
                () => {
                    modal.classList.add(
                        'hidden'
                    );
                }
            );

        $('#loginBtn')
            ?.addEventListener(
                'click',
                loginAdmin
            );

        $('#logoutBtn')
            ?.addEventListener(
                'click',
                logoutAdmin
            );

        $('#searchPermit')
            ?.addEventListener(
                'input',
                loadAdminData
            );

        $('#statusFilter')
            ?.addEventListener(
                'change',
                loadAdminData
            );
    }

    async function checkAdmin() {

        try {

            const response =
                await fetch(
                    API +
                    '/api/auth/me'
                );

            if (!response.ok) {

                showLogin();

                return;
            }

            const result =
                await response.json();

            if (result.ok) {

                showDashboard();

                loadAdminData();

            } else {

                showLogin();
            }

        } catch {

            showLogin();
        }
    }

    function showLogin() {

        $('#loginBox')
            ?.classList.remove(
                'hidden'
            );

        $('#dashboardBox')
            ?.classList.add(
                'hidden'
            );
    }

    function showDashboard() {

        $('#loginBox')
            ?.classList.add(
                'hidden'
            );

        $('#dashboardBox')
            ?.classList.remove(
                'hidden'
            );
    }

    async function loginAdmin() {

        const username =
            $('#adminUser')?.value ||
            '';

        const password =
            $('#adminPass')?.value ||
            '';

        if (!username || !password) {

            toast(
                'Username dan password wajib diisi.',
                'error'
            );

            return;
        }

        try {

            const response =
                await fetch(
                    API +
                    '/api/auth/login',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type':
                                'application/json'
                        },
                        credentials:
                            'same-origin',
                        body:
                            JSON.stringify({
                                username,
                                password
                            })
                    }
                );

            const result =
                await response.json();

            if (!response.ok ||
                !result.ok) {

                throw new Error(
                    result.message ||
                    'Login gagal.'
                );
            }

            showDashboard();

            loadAdminData();

            toast(
                'Login admin berhasil.',
                'success'
            );

        } catch (error) {

            toast(
                error.message ||
                'Login gagal.',
                'error'
            );
        }
    }

    async function logoutAdmin() {

        try {

            await fetch(
                API +
                '/api/auth/logout',
                {
                    method: 'POST'
                }
            );

            showLogin();

            toast(
                'Logout berhasil.',
                'success'
            );

        } catch (error) {

            console.error(error);
        }
    }

    async function loadAdminData() {

        const table =
            $('#permitTable');

        if (!table) {
            return;
        }

        const q =
            $('#searchPermit')?.value ||
            '';

        const status =
            $('#statusFilter')?.value ||
            '';

        try {

            const params =
                new URLSearchParams();

            if (q) {
                params.set('q', q);
            }

            if (status) {
                params.set(
                    'status',
                    status
                );
            }

            const response =
                await fetch(
                    API +
                    '/api/permits?' +
                    params.toString()
                );

            if (
                response.status === 401
            ) {

                showLogin();

                return;
            }

            const result =
                await response.json();

            if (!result.ok) {

                throw new Error(
                    result.message ||
                    'Gagal mengambil data.'
                );
            }

            renderAdminTable(
                result.rows || []
            );

        } catch (error) {

            console.error(error);

            table.innerHTML =
                '<p>Gagal memuat data.</p>';
        }
    }

    function renderAdminTable(rows) {

        const table =
            $('#permitTable');

        if (!table) {
            return;
        }

        if (!rows.length) {

            table.innerHTML =
                '<p>Belum ada data.</p>';

            return;
        }

        table.innerHTML = `
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
                        ${rows.map(row => `
                            <tr>
                                <td>${escapeHtml(row.permitNo)}</td>
                                <td>${escapeHtml(row.applicantName)}</td>
                                <td>${escapeHtml(row.region)}</td>
                                <td>${escapeHtml(row.location)}</td>
                                <td>
                                    <select
                                        data-status-id="${escapeHtml(row.id)}"
                                    >
                                        ${[
                                            'DRAFT',
                                            'DIAJUKAN',
                                            'DISETUJUI',
                                            'DITOLAK',
                                            'SELESAI'
                                        ].map(status => `
                                            <option
                                                value="${status}"
                                                ${row.status === status ? 'selected' : ''}
                                            >
                                                ${status}
                                            </option>
                                        `).join('')}
                                    </select>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        data-pdf-id="${escapeHtml(row.id)}"
                                    >
                                        PDF
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        table
            .querySelectorAll(
                '[data-status-id]'
            )
            .forEach(select => {

                select.addEventListener(
                    'change',
                    async () => {

                        await updateStatus(
                            select.dataset.statusId,
                            select.value
                        );
                    }
                );
            });

        table
            .querySelectorAll(
                '[data-pdf-id]'
            )
            .forEach(button => {

                button.addEventListener(
                    'click',
                    () => {

                        window.open(
                            '/api/permits/' +
                            button.dataset.pdfId +
                            '/pdf',
                            '_blank'
                        );
                    }
                );
            });
    }

    async function updateStatus(
        id,
        status
    ) {

        try {

            const response =
                await fetch(
                    '/api/permits/' +
                    encodeURIComponent(id) +
                    '/status',
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type':
                                'application/json'
                        },
                        credentials:
                            'same-origin',
                        body:
                            JSON.stringify({
                                status
                            })
                    }
                );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.ok
            ) {

                throw new Error(
                    result.message ||
                    'Gagal mengubah status.'
                );
            }

            toast(
                'Status berhasil diubah.',
                'success'
            );

        } catch (error) {

            toast(
                error.message ||
                'Gagal mengubah status.',
                'error'
            );

            loadAdminData();
        }
    }

    /* =====================================================
       EVENT UTAMA
       ===================================================== */

    function setupEvents() {

        $('#permitForm')
            ?.addEventListener(
                'submit',
                event => {

                    event.preventDefault();

                    submitPermit();
                }
            );

        $('#sendBtn')
            ?.addEventListener(
                'click',
                event => {

                    event.preventDefault();

                    submitPermit();
                }
            );

        $('#saveBtn')
            ?.addEventListener(
                'click',
                event => {

                    event.preventDefault();

                    savePDF();
                }
            );

        $('#previewBtn')
            ?.addEventListener(
                'click',
                event => {

                    event.preventDefault();

                    previewPDF();
                }
            );

        $('#topBtn')
            ?.addEventListener(
                'click',
                () => {

                    window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                    });
                }
            );
    }

    /* =====================================================
       INIT
       ===================================================== */

    async function init() {

        console.log(
            'APP.JS berhasil dimuat.'
        );

        renderCheckboxes(
            'hazards',
            HAZARDS,
            'hazards'
        );

        renderCheckboxes(
            'precautions',
            PRECAUTIONS,
            'precautions'
        );

        renderCheckboxes(
            'ppe',
            PPE,
            'ppe'
        );

        renderApprovals();

        renderCompletion();

        setupSignature();

        setupAdmin();

        setupEvents();

        await loadPermitNumber();

        console.log(
            'Form Izin Kerja siap digunakan.'
        );
    }

    /* Jalankan setelah HTML siap */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init
        );

    } else {

        init();
    }

})();
