require('dotenv').config();

const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

const PORT = Number(process.env.PORT || 3000);

// =====================================================
// LOKASI FILE
// index.html dan style.css berada di ROOT repository
// =====================================================

const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');
const STYLE_FILE = path.join(ROOT_DIR, 'style.css');

// =====================================================
// FOLDER DATA
// =====================================================

const DATA_DIR = path.join(ROOT_DIR, 'data');
const PDF_DIR = path.join(DATA_DIR, 'pdf');
const DB_FILE = path.join(DATA_DIR, 'permits.json');

try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(PDF_DIR, { recursive: true });

    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, '[]', 'utf8');
    }
} catch (error) {
    console.error('Gagal membuat folder data:', error.message);
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({
    extended: true,
    limit: '20mb'
}));

// index.html dan style.css berada di root
app.use(express.static(ROOT_DIR));

// =====================================================
// KONFIGURASI
// =====================================================

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'ganti-password-ini';

const SESSION_SECRET =
    process.env.SESSION_SECRET || 'ganti-secret-ini';

const MAIL_TO =
    process.env.MAIL_TO || 'stasiungombong2026@gmail.com';

const MAIL_FROM_NAME =
    process.env.MAIL_FROM_NAME || 'Form Izin Kerja';

const SMTP_HOST =
    process.env.SMTP_HOST || 'smtp.gmail.com';

const SMTP_PORT =
    Number(process.env.SMTP_PORT || 465);

const SMTP_SECURE =
    String(process.env.SMTP_SECURE || 'true').toLowerCase() === 'true';

const SMTP_USER =
    process.env.SMTP_USER || '';

const SMTP_PASS =
    process.env.SMTP_PASS || '';

// =====================================================
// UPLOAD
// =====================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 15 * 1024 * 1024
    }
});

// =====================================================
// DATABASE SEDERHANA
// =====================================================

function dbRead() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return [];
        }

        const text = fs.readFileSync(DB_FILE, 'utf8');

        if (!text.trim()) {
            return [];
        }

        const data = JSON.parse(text);

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error(
            'Gagal membaca database:',
            error.message
        );

        return [];
    }
}

function dbWrite(rows) {

    try {

        fs.writeFileSync(
            DB_FILE,
            JSON.stringify(rows, null, 2),
            'utf8'
        );

        return true;

    } catch (error) {

        console.error(
            'Gagal menyimpan database:',
            error.message
        );

        return false;
    }
}

// =====================================================
// HELPER
// =====================================================

function safe(value) {

    return String(value ?? '')
        .replace(/[&<>"']/g, function (char) {

            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };

            return map[char];
        });
}

function slug(value) {

    return String(value || 'baru')
        .replace(/[^a-z0-9_-]/gi, '_')
        .slice(0, 80);
}

// =====================================================
// NOMOR IZIN OTOMATIS
// =====================================================

function nextPermit() {

    const year = new Date().getFullYear();

    const rows = dbRead();

    const numbers = rows
        .map(function (row) {

            const match = String(
                row.permitNo || ''
            ).match(/(\d+)$/);

            return match ? Number(match[1]) : 0;
        })
        .filter(function (number) {
            return number > 0;
        });

    const nextNumber =
        (numbers.length
            ? Math.max(...numbers)
            : 0) + 1;

    return (
        'IK-' +
        year +
        '-' +
        String(nextNumber).padStart(4, '0')
    );
}

// =====================================================
// SESSION
// =====================================================

function sign(payload) {

    return crypto
        .createHmac(
            'sha256',
            SESSION_SECRET
        )
        .update(payload)
        .digest('hex');
}

function makeSession() {

    const payload = Buffer
        .from(
            JSON.stringify({
                u: ADMIN_USER,
                exp:
                    Date.now() +
                    8 * 60 * 60 * 1000
            })
        )
        .toString('base64url');

    return (
        payload +
        '.' +
        sign(payload)
    );
}

function getSession(req) {

    const cookieHeader =
        req.headers.cookie || '';

    const cookies =
        cookieHeader
            .split(';')
            .map(function (item) {
                return item.trim();
            });

    const cookie =
        cookies.find(function (item) {
            return item.startsWith(
                'ik_session='
            );
        });

    if (!cookie) {
        return null;
    }

    return cookie.substring(
        'ik_session='.length
    );
}

// =====================================================
// AUTH ADMIN
// =====================================================

function auth(req, res, next) {

    const raw = getSession(req);

    if (!raw) {

        return res
            .status(401)
            .json({
                ok: false,
                message:
                    'Login admin diperlukan.'
            });
    }

    try {

        const parts = raw.split('.');

        if (parts.length !== 2) {
            throw new Error('Session invalid');
        }

        const payload = parts[0];
        const signature = parts[1];

        const expected =
            sign(payload);

        if (
            signature.length !==
            expected.length
        ) {
            throw new Error('Signature invalid');
        }

        if (
            !crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expected)
            )
        ) {
            throw new Error(
                'Signature invalid'
            );
        }

        const session =
            JSON.parse(
                Buffer.from(
                    payload,
                    'base64url'
                ).toString()
            );

        if (
            session.u !== ADMIN_USER
        ) {
            throw new Error(
                'User invalid'
            );
        }

        if (
            session.exp < Date.now()
        ) {
            throw new Error(
                'Session expired'
            );
        }

        next();

    } catch (error) {

        return res
            .status(401)
            .json({
                ok: false,
                message:
                    'Sesi admin tidak valid atau sudah berakhir.'
            });
    }
}

// =====================================================
// MAILER
// =====================================================

function createMailer() {

    if (
        !SMTP_USER ||
        !SMTP_PASS
    ) {
        return null;
    }

    return nodemailer.createTransport({

        host: SMTP_HOST,

        port: SMTP_PORT,

        secure: SMTP_SECURE,

        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        }
    });
}

// =====================================================
// HEALTH CHECK
// =====================================================

app.get(
    '/api/health',
    function (req, res) {

        res.json({
            ok: true,
            app: 'Izin Kerja Web',
            time:
                new Date().toISOString()
        });
    }
);

// =====================================================
// LOGIN
// =====================================================

app.post(
    '/api/auth/login',
    function (req, res) {

        const body =
            req.body || {};

        const username =
            String(
                body.username || ''
            );

        const password =
            String(
                body.password || ''
            );

        if (
            username === ADMIN_USER &&
            password === ADMIN_PASS
        ) {

            const session =
                makeSession();

            res.setHeader(
                'Set-Cookie',
                'ik_session=' +
                    session +
                    '; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800'
            );

            return res.json({
                ok: true,
                message:
                    'Login berhasil.'
            });
        }

        return res
            .status(401)
            .json({
                ok: false,
                message:
                    'Username atau password salah.'
            });
    }
);

// =====================================================
// CEK LOGIN
// =====================================================

app.get(
    '/api/auth/me',
    function (req, res) {

        auth(
            req,
            res,
            function () {

                res.json({
                    ok: true,
                    user: ADMIN_USER
                });

            }
        );
    }
);

// =====================================================
// LOGOUT
// =====================================================

app.post(
    '/api/auth/logout',
    function (req, res) {

        res.setHeader(
            'Set-Cookie',
            'ik_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
        );

        res.json({
            ok: true
        });
    }
);

// =====================================================
// NOMOR IZIN
// =====================================================

app.get(
    '/api/permit/next-number',
    function (req, res) {

        res.json({
            ok: true,
            permitNo:
                nextPermit()
        });
    }
);

// =====================================================
// DAFTAR DATA IZIN
// =====================================================

app.get(
    '/api/permits',
    auth,
    function (req, res) {

        const query =
            String(
                req.query.q || ''
            ).toLowerCase();

        const status =
            String(
                req.query.status || ''
            );

        let rows = dbRead();

        rows.sort(
            function (a, b) {

                return (
                    new Date(
                        b.createdAt || 0
                    ) -
                    new Date(
                        a.createdAt || 0
                    )
                );
            }
        );

        if (query) {

            rows =
                rows.filter(
                    function (row) {

                        const text = [

                            row.permitNo,

                            row.applicantName,

                            row.region,

                            row.location

                        ]
                            .join(' ')
                            .toLowerCase();

                        return text.includes(
                            query
                        );
                    }
                );
        }

        if (status) {

            rows =
                rows.filter(
                    function (row) {

                        return (
                            row.status ===
                            status
                        );
                    }
                );
        }

        res.json({
            ok: true,
            rows:
                rows.slice(0, 500)
        });
    }
);

// =====================================================
// DETAIL IZIN
// =====================================================

app.get(
    '/api/permits/:id',
    auth,
    function (req, res) {

        const rows = dbRead();

        const row =
            rows.find(
                function (item) {

                    return (
                        item.id ===
                        req.params.id
                    );
                }
            );

        if (!row) {

            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'Data tidak ditemukan.'
                });
        }

        res.json({
            ok: true,
            row: row
        });
    }
);

// =====================================================
// SIMPAN PERMOHONAN
// =====================================================

app.post(
    '/api/permits',
    upload.single('pdf'),
    function (req, res) {

        try {

            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        ok: false,
                        message:
                            'PDF wajib dilampirkan.'
                    });
            }

            let data = {};

            try {

                data =
                    JSON.parse(
                        req.body.data ||
                        '{}'
                    );

            } catch (error) {

                return res
                    .status(400)
                    .json({
                        ok: false,
                        message:
                            'Data form tidak valid.'
                    });
            }

            const rows =
                dbRead();

            const id =
                crypto.randomUUID();

            const permitNo =
                data.permitNo ||
                nextPermit();

            const pdfName =
                id +
                '-' +
                slug(permitNo) +
                '.pdf';

            const pdfPath =
                path.join(
                    PDF_DIR,
                    pdfName
                );

            fs.writeFileSync(
                pdfPath,
                req.file.buffer
            );

            const now =
                new Date().toISOString();

            const row = {

                id: id,

                permitNo: permitNo,

                applicantName:
                    data.applicantName ||
                    '',

                region:
                    data.region || '',

                location:
                    data.location || '',

                workTypes:
                    data.workTypes ||
                    [],

                status:
                    'DRAFT',

                createdAt:
                    now,

                updatedAt:
                    now,

                pdfName:
                    pdfName,

                data:
                    data
            };

            rows.push(row);

            dbWrite(rows);

            res.json({
                ok: true,
                row: row
            });

        } catch (error) {

            console.error(
                'Gagal menyimpan izin:',
                error
            );

            res
                .status(500)
                .json({
                    ok: false,
                    message:
                        'Gagal menyimpan data.'
                });
        }
    }
);

// =====================================================
// UBAH STATUS
// =====================================================

app.patch(
    '/api/permits/:id/status',
    auth,
    function (req, res) {

        const allowed = [

            'DRAFT',

            'DIAJUKAN',

            'DISETUJUI',

            'DITOLAK',

            'SELESAI'

        ];

        const status =
            req.body &&
            req.body.status;

        if (
            !allowed.includes(
                status
            )
        ) {

            return res
                .status(400)
                .json({
                    ok: false,
                    message:
                        'Status tidak valid.'
                });
        }

        const rows =
            dbRead();

        const row =
            rows.find(
                function (item) {

                    return (
                        item.id ===
                        req.params.id
                    );
                }
            );

        if (!row) {

            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'Data tidak ditemukan.'
                });
        }

        row.status =
            status;

        row.updatedAt =
            new Date().toISOString();

        dbWrite(rows);

        res.json({
            ok: true,
            row: row
        });
    }
);

// =====================================================
// PDF
// =====================================================

app.get(
    '/api/permits/:id/pdf',
    auth,
    function (req, res) {

        const rows =
            dbRead();

        const row =
            rows.find(
                function (item) {

                    return (
                        item.id ===
                        req.params.id
                    );
                }
            );

        if (!row) {
            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'Data tidak ditemukan.'
                });
        }

        const pdfPath =
            path.join(
                PDF_DIR,
                row.pdfName
            );

        if (
            !fs.existsSync(
                pdfPath
            )
        ) {

            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'File PDF tidak ditemukan.'
                });
        }

        res.type(
            'application/pdf'
        );

        res.sendFile(
            pdfPath
        );
    }
);

// =====================================================
// KIRIM EMAIL
// =====================================================

app.post(
    '/api/send-email',
    upload.single('pdf'),
    async function (req, res) {

        try {

            const transporter =
                createMailer();

            if (!transporter) {

                return res
                    .status(503)
                    .json({
                        ok: false,
                        message:
                            'SMTP belum dikonfigurasi di Environment Variables.'
                    });
            }

            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        ok: false,
                        message:
                            'PDF tidak ditemukan.'
                    });
            }

            let data = {};

            try {

                data =
                    JSON.parse(
                        req.body.data ||
                        '{}'
                    );

            } catch (error) {

                return res
                    .status(400)
                    .json({
                        ok: false,
                        message:
                            'Data form tidak valid.'
                    });
            }

            const permit =
                data.permitNo ||
                '-';

            const applicant =
                data.applicantName ||
                '-';

            const region =
                data.region ||
                '-';

            const location =
                data.location ||
                '-';

            const workTypes =
                Array.isArray(
                    data.workTypes
                )
                    ? data.workTypes.join(
                        ', '
                    )
                    : String(
                        data.workTypes ||
                        '-'
                    );

            await transporter.sendMail({

                from:
                    '"' +
                    MAIL_FROM_NAME +
                    '" <' +
                    SMTP_USER +
                    '>',

                to:
                    MAIL_TO,

                subject:
                    'Pengisian Form Izin Kerja - Permit ' +
                    permit,

                html:

                    '<div style="font-family:Arial,sans-serif">' +

                    '<h2>Notifikasi Pengisian Form Izin Kerja</h2>' +

                    '<p>Form telah diisi melalui aplikasi web.</p>' +

                    '<table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse">' +

                    '<tr>' +
                    '<td><b>Permit No</b></td>' +
                    '<td>' +
                    safe(permit) +
                    '</td>' +
                    '</tr>' +

                    '<tr>' +
                    '<td><b>Pemohon</b></td>' +
                    '<td>' +
                    safe(applicant) +
                    '</td>' +
                    '</tr>' +

                    '<tr>' +
                    '<td><b>Wilayah</b></td>' +
                    '<td>' +
                    safe(region) +
                    '</td>' +
                    '</tr>' +

                    '<tr>' +
                    '<td><b>Lokasi</b></td>' +
                    '<td>' +
                    safe(location) +
                    '</td>' +
                    '</tr>' +

                    '<tr>' +
                    '<td><b>Jenis izin</b></td>' +
                    '<td>' +
                    safe(workTypes) +
                    '</td>' +
                    '</tr>' +

                    '</table>' +

                    '<p>PDF hasil pengisian terlampir.</p>' +

                    '</div>',

                attachments: [

                    {
                        filename:
                            'izin-kerja-' +
                            slug(permit) +
                            '.pdf',

                        content:
                            req.file.buffer,

                        contentType:
                            'application/pdf'
                    }

                ]
            });

            res.json({

                ok: true,

                message:
                    'Notifikasi berhasil dikirim ke ' +
                    MAIL_TO +
                    '.'
            });

        } catch (error) {

            console.error(
                'Gagal mengirim email:',
                error
            );

            res
                .status(500)
                .json({

                    ok: false,

                    message:
                        'Gagal mengirim email. Periksa konfigurasi SMTP.'
                });
        }
    }
);

// =====================================================
// HALAMAN UTAMA
// =====================================================

app.get(
    '/',
    function (req, res) {

        if (
            fs.existsSync(
                INDEX_FILE
            )
        ) {

            return res.sendFile(
                INDEX_FILE
            );
        }

        res
            .status(404)
            .send(
                'index.html tidak ditemukan.'
            );
    }
);

// =====================================================
// FALLBACK UNTUK ROUTE LAIN
// =====================================================

app.use(
    function (req, res) {

        if (
            req.path.startsWith(
                '/api/'
            )
        ) {

            return res
                .status(404)
                .json({
                    ok: false,
                    message:
                        'API endpoint tidak ditemukan.'
                });
        }

        if (
            fs.existsSync(
                INDEX_FILE
            )
        ) {

            return res.sendFile(
                INDEX_FILE
            );
        }

        res
            .status(404)
            .send(
                'Halaman tidak ditemukan.'
            );
    }
);

// =====================================================
// START SERVER
// =====================================================

if (require.main === module) {

    app.listen(
        PORT,
        function () {

            console.log(
                'Izin Kerja Web aktif di port ' +
                PORT
            );
        }
    );
}

// =====================================================
// EXPORT UNTUK VERCEL
// =====================================================

module.exports = app;
