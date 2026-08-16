require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ======================================================
// KONFIGURASI
// ======================================================

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "admin123";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "izin-kerja-secret-2026";

const MAIL_TO =
  process.env.MAIL_TO || "stasiungombong2026@gmail.com";

const SMTP_HOST =
  process.env.SMTP_HOST || "smtp.gmail.com";

const SMTP_PORT =
  Number(process.env.SMTP_PORT || 465);

const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";

const SMTP_USER =
  process.env.SMTP_USER || "";

const SMTP_PASS =
  process.env.SMTP_PASS || "";

const MAIL_FROM_NAME =
  process.env.MAIL_FROM_NAME || "Form Izin Kerja";

// ======================================================
// STATIC FILE
// ======================================================

const PUBLIC_DIR = process.cwd();

app.use(
  express.static(PUBLIC_DIR, {
    index: false,
    fallthrough: true
  })
);

// Pastikan file JavaScript dikirim sebagai JavaScript
app.get("/app.js", (req, res) => {
  res.type("application/javascript");
  res.sendFile(
    path.join(PUBLIC_DIR, "app.js")
  );
});

// Pastikan CSS dikirim sebagai CSS
app.get("/style.css", (req, res) => {
  res.type("text/css");
  res.sendFile(
    path.join(PUBLIC_DIR, "style.css")
  );
});

// Halaman utama
app.get("/", (req, res) => {
  res.sendFile(
    path.join(PUBLIC_DIR, "index.html")
  );
});

// ======================================================
// SESSION
// ======================================================

function createSignature(payload) {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
}

function createSession() {
  const payload = Buffer.from(
    JSON.stringify({
      username: ADMIN_USER,
      exp: Date.now() + 8 * 60 * 60 * 1000
    })
  ).toString("base64url");

  return payload + "." + createSignature(payload);
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "")
    .split(";")
    .map(v => v.trim());

  const item = cookies.find(v =>
    v.startsWith(name + "=")
  );

  if (!item) return null;

  return item.substring(name.length + 1);
}

function checkSession(req) {
  const token = getCookie(req, "ik_session");

  if (!token) {
    return false;
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return false;
    }

    const payload = parts[0];
    const signature = parts[1];

    const expected = createSignature(payload);

    if (signature.length !== expected.length) {
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

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    if (data.username !== ADMIN_USER) {
      return false;
    }

    if (data.exp < Date.now()) {
      return false;
    }

    return true;

  } catch (error) {
    return false;
  }
}

function requireAdmin(req, res, next) {
  if (!checkSession(req)) {
    return res.status(401).json({
      ok: false,
      message: "Login admin diperlukan."
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

  const year = new Date().getFullYear();

  return (
    "IK-" +
    year +
    "-" +
    String(permitCounter).padStart(4, "0")
  );
}

// ======================================================
// DATA SEMENTARA
// ======================================================
//
// PENTING:
// Vercel Function tidak cocok untuk database lokal.
// Data ini hanya digunakan selama instance Function hidup.
//
// Untuk tahap awal ini kita fokus membuat:
// - tombol Kirim bekerja
// - email bekerja
// - login admin bekerja
// - PDF bisa dikirim sebagai attachment
//
// ======================================================

const permits = [];

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Izin Kerja Web",
    platform: "Vercel",
    time: new Date().toISOString()
  });
});

// ======================================================
// NOMOR PERMIT
// ======================================================

app.get("/api/permit/next-number", (req, res) => {
  res.json({
    ok: true,
    permitNo: generatePermitNumber()
  });
});

// ======================================================
// LOGIN ADMIN
// ======================================================

app.post("/api/auth/login", (req, res) => {

  const username = String(
    req.body?.username || ""
  );

  const password = String(
    req.body?.password || ""
  );

  if (
    username === ADMIN_USER &&
    password === ADMIN_PASS
  ) {

    const session = createSession();

    res.setHeader(
      "Set-Cookie",
      "ik_session=" +
        session +
        "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800"
    );

    return res.json({
      ok: true,
      message: "Login berhasil."
    });
  }

  return res.status(401).json({
    ok: false,
    message: "Username atau password salah."
  });
});

// ======================================================
// CEK LOGIN
// ======================================================

app.get("/api/auth/me", requireAdmin, (req, res) => {

  res.json({
    ok: true,
    user: ADMIN_USER
  });

});

// ======================================================
// LOGOUT
// ======================================================

app.post("/api/auth/logout", (req, res) => {

  res.setHeader(
    "Set-Cookie",
    "ik_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0"
  );

  res.json({
    ok: true
  });

});

// ======================================================
// SIMPAN PERMOHONAN
// ======================================================

app.post("/api/permits", (req, res) => {

  try {

    const data = req.body?.data;

    if (!data) {

      return res.status(400).json({
        ok: false,
        message: "Data form tidak ditemukan."
      });

    }

    let formData = data;

    if (typeof data === "string") {

      try {
        formData = JSON.parse(data);
      } catch (error) {

        return res.status(400).json({
          ok: false,
          message: "Data form tidak valid."
        });

      }

    }

    const permitNo =
      formData.permitNo ||
      generatePermitNumber();

    const row = {

      id: crypto.randomUUID(),

      permitNo,

      applicantName:
        formData.applicantName || "",

      region:
        formData.region || "",

      location:
        formData.location || "",

      workTypes:
        Array.isArray(formData.workTypes)
          ? formData.workTypes
          : [],

      status: "DIAJUKAN",

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      data: formData

    };

    permits.push(row);

    return res.json({
      ok: true,
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
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });

  }

});

// ======================================================
// DAFTAR PERMIT
// ======================================================

app.get(
  "/api/permits",
  requireAdmin,
  (req, res) => {

    const q = String(
      req.query.q || ""
    ).toLowerCase();

    const status = String(
      req.query.status || ""
    );

    let rows = [...permits];

    if (q) {

      rows = rows.filter(row => {

        const text = [
          row.permitNo,
          row.applicantName,
          row.region,
          row.location
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(q);

      });

    }

    if (status) {

      rows = rows.filter(
        row => row.status === status
      );

    }

    rows.sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

    res.json({
      ok: true,
      rows: rows.slice(0, 500)
    });

  }
);

// ======================================================
// DETAIL PERMIT
// ======================================================

app.get(
  "/api/permits/:id",
  requireAdmin,
  (req, res) => {

    const row =
      permits.find(
        item =>
          item.id === req.params.id
      );

    if (!row) {

      return res.status(404).json({
        ok: false,
        message:
          "Data tidak ditemukan."
      });

    }

    res.json({
      ok: true,
      row
    });

  }
);

// ======================================================
// UBAH STATUS
// ======================================================

app.patch(
  "/api/permits/:id/status",
  requireAdmin,
  (req, res) => {

    const allowed = [
      "DRAFT",
      "DIAJUKAN",
      "DISETUJUI",
      "DITOLAK",
      "SELESAI"
    ];

    const status =
      req.body?.status;

    if (!allowed.includes(status)) {

      return res.status(400).json({
        ok: false,
        message:
          "Status tidak valid."
      });

    }

    const row =
      permits.find(
        item =>
          item.id === req.params.id
      );

    if (!row) {

      return res.status(404).json({
        ok: false,
        message:
          "Data tidak ditemukan."
      });

    }

    row.status = status;

    row.updatedAt =
      new Date().toISOString();

    res.json({
      ok: true,
      row
    });

  }
);

// ======================================================
// SMTP
// ======================================================

function createTransporter() {

  if (!SMTP_USER || !SMTP_PASS) {
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

      if (typeof data === "string") {

        try {
          data = JSON.parse(data);
        } catch (error) {

          return res.status(400).json({

            ok: false,

            message:
              "Data form tidak valid."

          });

        }

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
        Array.isArray(data.workTypes)
          ? data.workTypes.join(", ")
          : String(
              data.workTypes || "-"
            );

      // ==================================================
      // PDF BASE64
      // ==================================================

      let pdfBuffer = null;

      if (req.body?.pdfBase64) {

        const base64 =
          String(req.body.pdfBase64)
            .replace(
              /^data:application\/pdf;base64,/,
              ""
            );

        pdfBuffer =
          Buffer.from(
            base64,
            "base64"
          );

      }

      const mail = {

        from:
          `"${MAIL_FROM_NAME}" <${SMTP_USER}>`,

        to: MAIL_TO,

        subject:
          "Pengisian Form Izin Kerja - Permit " +
          permit,

        html:
          `
          <div style="font-family:Arial,sans-serif">

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
              style="border-collapse:collapse"
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

      await transporter.sendMail(
        mail
      );

      res.json({

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

      res.status(500).json({

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
// API 404
// ======================================================

app.use(
  (req, res, next) => {

    if (
      req.path.startsWith("/api/")
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

app.use((req, res) => {

  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      ok: false,
      message: "API endpoint tidak ditemukan."
    });
  }

  res.status(404).send("Halaman tidak ditemukan.");
});

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
        "Izin Kerja Web aktif di port " +
        port
      );

    }
  );

}

// ======================================================
// VERCEL
// ======================================================

module.exports = app;
