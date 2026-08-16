require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");

const app = express();

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: "25mb"
}));

// ======================================================
// KONFIGURASI
// ======================================================

const ADMIN_USER =
  process.env.ADMIN_USER || "admin";

const ADMIN_PASS =
  process.env.ADMIN_PASS || "admin123";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "izin-kerja-secret-2026";

const MAIL_TO =
  process.env.MAIL_TO ||
  "stasiungombong2026@gmail.com";

const SMTP_HOST =
  process.env.SMTP_HOST ||
  "smtp.gmail.com";

const SMTP_PORT =
  Number(process.env.SMTP_PORT || 465);

const SMTP_SECURE =
  String(
    process.env.SMTP_SECURE || "true"
  ).toLowerCase() === "true";

const SMTP_USER =
  process.env.SMTP_USER || "";

const SMTP_PASS =
  process.env.SMTP_PASS || "";

const MAIL_FROM_NAME =
  process.env.MAIL_FROM_NAME ||
  "Form Izin Kerja";

// ======================================================
// STATIC FILE
// ======================================================

app.use(express.static(__dirname));

// ======================================================
// SESSION
// ======================================================

function createSignature(payload) {
  return crypto
    .createHmac(
      "sha256",
      SESSION_SECRET
    )
    .update(payload)
    .digest("hex");
}

function createSession() {

  const payload =
    Buffer.from(
      JSON.stringify({
        username: ADMIN_USER,
        exp:
          Date.now() +
          8 * 60 * 60 * 1000
      })
    ).toString("base64url");

  return (
    payload +
    "." +
    createSignature(payload)
  );
}

function getCookie(req, name) {

  const cookies =
    String(req.headers.cookie || "")
      .split(";")
      .map(v => v.trim());

  const item =
    cookies.find(v =>
      v.startsWith(name + "=")
    );

  if (!item) {
    return null;
  }

  return item.substring(
    name.length + 1
  );
}

function checkSession(req) {

  const token =
    getCookie(
      req,
      "ik_session"
    );

  if (!token) {
    return false;
  }

  try {

    const parts =
      token.split(".");

    if (parts.length !== 2) {
      return false;
    }

    const payload =
      parts[0];

    const signature =
      parts[1];

    const expected =
      createSignature(payload);

    if (
      signature.length !==
      expected.length
    ) {
      return false;
    }

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )
    ) {
      return false;
    }

    const data =
      JSON.parse(
        Buffer.from(
          payload,
          "base64url"
        ).toString()
      );

    if (
      data.username !==
      ADMIN_USER
    ) {
      return false;
    }

    if (
      data.exp < Date.now()
    ) {
      return false;
    }

    return true;

  } catch (error) {

    return false;

  }
}

function requireAdmin(
  req,
  res,
  next
) {

  if (!checkSession(req)) {

    return res.status(401).json({
      ok: false,
      message:
        "Login admin diperlukan."
    });

  }

  next();
}

// ======================================================
// NOMOR PERMIT
// ======================================================

let permitCounter = 0;

function generatePermitNumber() {

  permitCounter++;

  const year =
    new Date().getFullYear();

  return (
    "IK-" +
    year +
    "-" +
    String(permitCounter)
      .padStart(4, "0")
  );
}

// ======================================================
// DATABASE SEMENTARA
// ======================================================
//
// CATATAN:
// Ini hanya penyimpanan sementara.
//
// Pada Vercel, data in-memory tidak permanen.
// Untuk produksi kita akan pindahkan ke database.
// ======================================================

const permits = [];

// ======================================================
// HEALTH CHECK
// ======================================================

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok: true,
      app: "Izin Kerja Web",
      platform: "Vercel",
      time:
        new Date().toISOString()
    });

  }
);

// ======================================================
// NOMOR PERMIT BERIKUTNYA
// ======================================================

app.get(
  "/api/permit/next-number",
  (req, res) => {

    res.json({
      ok: true,
      permitNo:
        generatePermitNumber()
    });

  }
);

// ======================================================
// LOGIN ADMIN
// ======================================================

app.post(
  "/api/auth/login",
  (req, res) => {

    const username =
      String(
        req.body?.username || ""
      ).trim();

    const password =
      String(
        req.body?.password || ""
      );

    if (
      username === ADMIN_USER &&
      password === ADMIN_PASS
    ) {

      const session =
        createSession();

      res.setHeader(
        "Set-Cookie",
        "ik_session=" +
          session +
          "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800"
      );

      return res.json({
        ok: true,
        message:
          "Login berhasil."
      });

    }

    return res.status(401).json({
      ok: false,
      message:
        "Username atau password salah."
    });

  }
);

// ======================================================
// CEK LOGIN ADMIN
// ======================================================

app.get(
  "/api/auth/me",
  requireAdmin,
  (req, res) => {

    res.json({
      ok: true,
      user: ADMIN_USER
    });

  }
);

// ======================================================
// LOGOUT
// ======================================================

app.post(
  "/api/auth/logout",
  (req, res) => {

    res.setHeader(
      "Set-Cookie",
      "ik_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
    );

    res.json({
      ok: true,
      message:
        "Logout berhasil."
    });

  }
);

// ======================================================
// SIMPAN PERMOHONAN
// ======================================================
//
// PENTING:
// Tidak ada field yang diwajibkan.
//
// Form boleh:
// - kosong sebagian
// - baru diisi nama
// - baru diisi lokasi
// - baru pilih jenis pekerjaan
// - atau hampir lengkap
//
// Semuanya tetap bisa disimpan.
// Status awal otomatis DRAFT.
// ======================================================

app.post(
  "/api/permits",
  (req, res) => {

    try {

      let data =
        req.body?.data || {};

      // --------------------------------------------------
      // Jika data dikirim sebagai JSON string
      // --------------------------------------------------

      if (
        typeof data === "string"
      ) {

        try {

          data =
            JSON.parse(data);

        } catch (error) {

          data = {};

        }

      }

      // --------------------------------------------------
      // Pastikan data adalah object
      // --------------------------------------------------

      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {

        data = {};

      }

      // --------------------------------------------------
      // Nomor permit
      // --------------------------------------------------

      const existingPermit =
        String(
          data.permitNo || ""
        ).trim();

      const permitNo =
        existingPermit ||
        generatePermitNumber();

      // Masukkan nomor permit
      // kembali ke data form.

      data.permitNo =
        permitNo;

      // --------------------------------------------------
      // Waktu
      // --------------------------------------------------

      const now =
        new Date().toISOString();

      // --------------------------------------------------
      // Status
      // --------------------------------------------------

      const requestedStatus =
        String(
          data.status || "DRAFT"
        ).toUpperCase();

      const allowedStatuses = [
        "DRAFT",
        "DIAJUKAN",
        "DISETUJUI",
        "DITOLAK",
        "SELESAI"
      ];

      const status =
        allowedStatuses.includes(
          requestedStatus
        )
          ? requestedStatus
          : "DRAFT";

      // --------------------------------------------------
      // Buat row
      // --------------------------------------------------

      const row = {

        id:
          crypto.randomUUID(),

        permitNo,

        applicantName:
          String(
            data.applicantName || ""
          ),

        region:
          String(
            data.region || ""
          ),

        location:
          String(
            data.location || ""
          ),

        workTypes:
          Array.isArray(
            data.workTypes
          )
            ? data.workTypes
            : [],

        status,

        createdAt: now,

        updatedAt: now,

        data

      };

      // --------------------------------------------------
      // Simpan
      // --------------------------------------------------

      permits.push(row);

      console.log(
        "================================="
      );

      console.log(
        "PERMIT TERSIMPAN"
      );

      console.log(
        "ID:",
        row.id
      );

      console.log(
        "PERMIT:",
        row.permitNo
      );

      console.log(
        "STATUS:",
        row.status
      );

      console.log(
        "PEMOHON:",
        row.applicantName
      );

      console.log(
        "================================="
      );

      return res.status(201).json({

        ok: true,

        message:
          "Data berhasil disimpan.",

        row

      });

    } catch (error) {

      console.error(
        "ERROR /api/permits:",
        error
      );

      return res.status(500).json({

        ok: false,

        message:
          "Gagal menyimpan data.",

        detail:
          error.message

      });

    }

  }
);

// ======================================================
// DAFTAR PERMIT
// ======================================================

app.get(
  "/api/permits",
  requireAdmin,
  (req, res) => {

    try {

      const q =
        String(
          req.query.q || ""
        )
        .trim()
        .toLowerCase();

      const status =
        String(
          req.query.status || ""
        )
        .trim()
        .toUpperCase();

      let rows =
        [...permits];

      // --------------------------------------------------
      // PENCARIAN
      // --------------------------------------------------

      if (q) {

        rows =
          rows.filter(
            row => {

              const text = [

                row.permitNo,

                row.applicantName,

                row.region,

                row.location,

                row.status

              ]
                .join(" ")
                .toLowerCase();

              return text.includes(q);

            }
          );

      }

      // --------------------------------------------------
      // FILTER STATUS
      // --------------------------------------------------

      if (status) {

        rows =
          rows.filter(
            row =>
              row.status === status
          );

      }

      // --------------------------------------------------
      // URUTKAN TERBARU
      // --------------------------------------------------

      rows.sort(
        (a, b) =>
          new Date(
            b.createdAt
          ) -
          new Date(
            a.createdAt
          )
      );

      return res.json({

        ok: true,

        count:
          rows.length,

        rows:
          rows.slice(0, 500)

      });

    } catch (error) {

      console.error(
        "ERROR GET /api/permits:",
        error
      );

      return res.status(500).json({

        ok: false,

        message:
          "Gagal mengambil data."

      });

    }

  }
);

// ======================================================
// DETAIL PERMIT
// ======================================================

app.get(
  "/api/permits/:id",
  requireAdmin,
  (req, res) => {

    try {

      const id =
        String(
          req.params.id || ""
        );

      const row =
        permits.find(
          item =>
            item.id === id
        );

      if (!row) {

        return res.status(404).json({

          ok: false,

          message:
            "Data tidak ditemukan.",

          id

        });

      }

      return res.json({

        ok: true,

        row

      });

    } catch (error) {

      console.error(
        "ERROR GET DETAIL:",
        error
      );

      return res.status(500).json({

        ok: false,

        message:
          "Gagal mengambil detail data."

      });

    }

  }
);

// ======================================================
// UBAH STATUS
// ======================================================

app.patch(
  "/api/permits/:id/status",
  requireAdmin,
  (req, res) => {

    try {

      const allowed = [

        "DRAFT",

        "DIAJUKAN",

        "DISETUJUI",

        "DITOLAK",

        "SELESAI"

      ];

      const status =
        String(
          req.body?.status || ""
        ).toUpperCase();

      if (
        !allowed.includes(status)
      ) {

        return res.status(400).json({

          ok: false,

          message:
            "Status tidak valid."

        });

      }

      const row =
        permits.find(
          item =>
            item.id ===
            req.params.id
        );

      if (!row) {

        return res.status(404).json({

          ok: false,

          message:
            "Data tidak ditemukan."

        });

      }

      row.status =
        status;

      row.data.status =
        status;

      row.updatedAt =
        new Date().toISOString();

      console.log(
        "STATUS DIUBAH:",
        row.permitNo,
        status
      );

      return res.json({

        ok: true,

        message:
          "Status berhasil diubah.",

        row

      });

    } catch (error) {

      console.error(
        "ERROR PATCH STATUS:",
        error
      );

      return res.status(500).json({

        ok: false,

        message:
          "Gagal mengubah status."

      });

    }

  }
);

// ======================================================
// SMTP
// ======================================================

function createTransporter() {

  if (
    !SMTP_USER ||
    !SMTP_PASS
  ) {

    return null;

  }

  return nodemailer.createTransport({

    host:
      SMTP_HOST,

    port:
      SMTP_PORT,

    secure:
      SMTP_SECURE,

    auth: {

      user:
        SMTP_USER,

      pass:
        SMTP_PASS

    }

  });

}

// ======================================================
// KIRIM EMAIL
// ======================================================

app.post(
  "/api/send-email",
  async (req, res) => {

    try {

      const transporter =
        createTransporter();

      if (!transporter) {

        return res.status(503).json({

          ok: false,

          message:
            "SMTP belum dikonfigurasi. Isi SMTP_USER dan SMTP_PASS di Vercel Environment Variables."

        });

      }

      let data =
        req.body?.data || {};

      if (
        typeof data === "string"
      ) {

        try {

          data =
            JSON.parse(data);

        } catch (error) {

          data = {};

        }

      }

      if (
        !data ||
        typeof data !== "object"
      ) {

        data = {};

      }

      const permit =
        data.permitNo || "-";

      const applicant =
        data.applicantName || "-";

      const region =
        data.region || "-";

      const location =
        data.location || "-";

      const workTypes =
        Array.isArray(
          data.workTypes
        )
          ? data.workTypes.join(", ")
          : String(
              data.workTypes || "-"
            );

      // --------------------------------------------------
      // PDF BASE64
      // --------------------------------------------------

      let pdfBuffer = null;

      if (
        req.body?.pdfBase64
      ) {

        const base64 =
          String(
            req.body.pdfBase64
          )
          .replace(
            /^data:application\/pdf;base64,/,
            ""
          );

        try {

          pdfBuffer =
            Buffer.from(
              base64,
              "base64"
            );

        } catch (error) {

          pdfBuffer = null;

        }

      }

      // --------------------------------------------------
      // EMAIL
      // --------------------------------------------------

      const mail = {

        from:
          `"${MAIL_FROM_NAME}" <${SMTP_USER}>`,

        to:
          MAIL_TO,

        subject:
          "Pengisian Form Izin Kerja - Permit " +
          permit,

        html:
          `
          <div style="
            font-family:Arial,sans-serif;
            color:#18202a;
          ">

            <h2>
              Notifikasi Pengisian Form Izin Kerja
            </h2>

            <p>
              Form telah diisi melalui aplikasi web.
            </p>

            <table
              cellpadding="8"
              cellspacing="0"
              border="1"
              style="
                border-collapse:collapse;
              "
            >

              <tr>
                <td><b>Permit No</b></td>
                <td>${permit}</td>
              </tr>

              <tr>
                <td><b>Pemohon</b></td>
                <td>${applicant}</td>
              </tr>

              <tr>
                <td><b>Wilayah</b></td>
                <td>${region}</td>
              </tr>

              <tr>
                <td><b>Lokasi</b></td>
                <td>${location}</td>
              </tr>

              <tr>
                <td><b>Jenis izin</b></td>
                <td>${workTypes}</td>
              </tr>

            </table>

            <p>
              PDF hasil pengisian terlampir.
            </p>

          </div>
          `

      };

      // --------------------------------------------------
      // ATTACHMENT PDF
      // --------------------------------------------------

      if (pdfBuffer) {

        mail.attachments = [

          {

            filename:
              "izin-kerja-" +
              permit +
              ".pdf",

            content:
              pdfBuffer,

            contentType:
              "application/pdf"

          }

        ];

      }

      // --------------------------------------------------
      // KIRIM
      // --------------------------------------------------

      await transporter.sendMail(
        mail
      );

      return res.json({

        ok: true,

        message:
          "Notifikasi berhasil dikirim ke " +
          MAIL_TO

      });

    } catch (error) {

      console.error(
        "ERROR SEND EMAIL:",
        error
      );

      return res.status(500).json({

        ok: false,

        message:
          "Gagal mengirim email.",

        detail:
          error.message

      });

    }

  }
);

// ======================================================
// HALAMAN UTAMA
// ======================================================

app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);

// ======================================================
// API 404
// ======================================================

app.use(
  (req, res, next) => {

    if (
      req.path.startsWith(
        "/api/"
      )
    ) {

      return res.status(404).json({

        ok: false,

        message:
          "API endpoint tidak ditemukan."

      });

    }

    next();

  }
);

// ======================================================
// FALLBACK
// ======================================================

app.use(
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);

// ======================================================
// LOCAL SERVER
// ======================================================

if (
  require.main === module
) {

  const port =
    Number(
      process.env.PORT || 3000
    );

  app.listen(
    port,
    () => {

      console.log(
        "================================="
      );

      console.log(
        "IZIN KERJA WEB"
      );

      console.log(
        "Server aktif di port:",
        port
      );

      console.log(
        "Admin:",
        ADMIN_USER
      );

      console.log(
        "Email tujuan:",
        MAIL_TO
      );

      console.log(
        "================================="
      );

    }
  );

}

// ======================================================
// VERCEL
// ======================================================

module.exports = app;
