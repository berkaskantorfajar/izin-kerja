require('dotenv').config();
const express = require('express');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const PDF_DIR = path.join(DATA_DIR, 'pdf');
const DB_FILE = path.join(DATA_DIR, 'permits.json');
fs.mkdirSync(PDF_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, '[]');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'ganti-password-ini';
const SESSION_SECRET = process.env.SESSION_SECRET || 'ganti-secret-ini';
const MAIL_TO = process.env.MAIL_TO || 'stasiungombong2026@gmail.com';

function dbRead(){ try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return []; } }
function dbWrite(rows){ fs.writeFileSync(DB_FILE, JSON.stringify(rows,null,2)); }
function safe(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function slug(v){ return String(v||'baru').replace(/[^a-z0-9_-]/gi,'_').slice(0,80); }
function nextPermit(){
  const year = new Date().getFullYear();
  const rows = dbRead();
  const nums = rows.map(r => String(r.permitNo||'').match(/(\d+)$/)).filter(Boolean).map(m=>Number(m[1]));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `IK-${year}-${String(n).padStart(4,'0')}`;
}
function sign(payload){ return crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex'); }
function makeSession(){ const p = Buffer.from(JSON.stringify({u:ADMIN_USER,exp:Date.now()+8*60*60*1000})).toString('base64url'); return `${p}.${sign(p)}`; }
function auth(req,res,next){
  const raw=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('ik_session='))?.split('=')[1];
  if(!raw) return res.status(401).json({ok:false,message:'Login admin diperlukan.'});
  const [p,s]=raw.split('.');
  try { if(!p||!s||!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(sign(p)))) throw 0; const x=JSON.parse(Buffer.from(p,'base64url').toString()); if(x.u!==ADMIN_USER||x.exp<Date.now()) throw 0; next(); } catch { return res.status(401).json({ok:false,message:'Sesi admin tidak valid atau sudah berakhir.'}); }
}
function mailer(){
  if(!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({host:process.env.SMTP_HOST||'smtp.gmail.com',port:Number(process.env.SMTP_PORT||465),secure:String(process.env.SMTP_SECURE||'true')==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
}

app.get('/api/health',(_,res)=>res.json({ok:true,app:'Izin Kerja Web',time:new Date().toISOString()}));
app.get('/api/auth/me',(req,res)=>{ try { auth(req,res,()=>res.json({ok:true,user:ADMIN_USER})); } catch { res.json({ok:false}); }});
app.post('/api/auth/login',(req,res)=>{ const {username,password}=req.body||{}; if(username===ADMIN_USER && password===ADMIN_PASS){res.setHeader('Set-Cookie',`ik_session=${makeSession()}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);return res.json({ok:true});} res.status(401).json({ok:false,message:'Username atau password salah.'}); });
app.post('/api/auth/logout',(req,res)=>{res.setHeader('Set-Cookie','ik_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');res.json({ok:true});});

app.get('/api/permit/next-number',(req,res)=>res.json({ok:true,permitNo:nextPermit()}));
app.get('/api/permits',auth,(req,res)=>{
  const q=String(req.query.q||'').toLowerCase(); const status=String(req.query.status||'');
  let rows=dbRead().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(q) rows=rows.filter(r=>[r.permitNo,r.applicantName,r.region,r.location].join(' ').toLowerCase().includes(q));
  if(status) rows=rows.filter(r=>r.status===status);
  res.json({ok:true,rows:rows.slice(0,500)});
});
app.get('/api/permits/:id',auth,(req,res)=>{const r=dbRead().find(x=>x.id===req.params.id); if(!r)return res.status(404).json({ok:false,message:'Data tidak ditemukan.'}); res.json({ok:true,row:r});});

app.post('/api/permits',upload.single('pdf'),(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({ok:false,message:'PDF wajib dilampirkan.'});
    const data=JSON.parse(req.body.data||'{}');
    const rows=dbRead();
    const id=crypto.randomUUID(); const permitNo=data.permitNo||nextPermit();
    const pdfName=`${id}-${slug(permitNo)}.pdf`; fs.writeFileSync(path.join(PDF_DIR,pdfName),req.file.buffer);
    const row={id,permitNo,applicantName:data.applicantName||'',region:data.region||'',location:data.location||'',workTypes:data.workTypes||[],status:'DRAFT',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),pdfName,data};
    rows.push(row); dbWrite(rows); res.json({ok:true,row});
  }catch(e){console.error(e);res.status(500).json({ok:false,message:'Gagal menyimpan data.'});}
});
app.patch('/api/permits/:id/status',auth,(req,res)=>{const allowed=['DRAFT','DIAJUKAN','DISETUJUI','DITOLAK','SELESAI']; const s=req.body?.status; if(!allowed.includes(s))return res.status(400).json({ok:false,message:'Status tidak valid.'}); const rows=dbRead(); const r=rows.find(x=>x.id===req.params.id); if(!r)return res.status(404).json({ok:false,message:'Data tidak ditemukan.'}); r.status=s;r.updatedAt=new Date().toISOString();dbWrite(rows);res.json({ok:true,row:r});});
app.get('/api/permits/:id/pdf',auth,(req,res)=>{const r=dbRead().find(x=>x.id===req.params.id); if(!r)return res.status(404).end(); const p=path.join(PDF_DIR,r.pdfName); if(!fs.existsSync(p))return res.status(404).end(); res.type('application/pdf').sendFile(p);});

app.post('/api/send-email', upload.single('pdf'), async (req,res)=>{
  try{
    const transporter=mailer(); if(!transporter)return res.status(503).json({ok:false,message:'SMTP belum dikonfigurasi di server (.env).'});
    if(!req.file)return res.status(400).json({ok:false,message:'PDF tidak ditemukan.'});
    const data=JSON.parse(req.body.data||'{}'); const permit=data.permitNo||'-';
    await transporter.sendMail({from:`"${process.env.MAIL_FROM_NAME||'Form Izin Kerja'}" <${process.env.SMTP_USER}>`,to:MAIL_TO,subject:`Pengisian Form Izin Kerja - Permit ${permit}`,html:`<div style="font-family:Arial"><h2>Notifikasi Pengisian Form Izin Kerja</h2><p>Form telah diisi melalui aplikasi web.</p><table cellpadding="6" cellspacing="0" border="1" style="border-collapse:collapse"><tr><td><b>Permit No</b></td><td>${safe(permit)}</td></tr><tr><td><b>Pemohon</b></td><td>${safe(data.applicantName||'-')}</td></tr><tr><td><b>Wilayah</b></td><td>${safe(data.region||'-')}</td></tr><tr><td><b>Lokasi</b></td><td>${safe(data.location||'-')}</td></tr><tr><td><b>Jenis izin</b></td><td>${safe((data.workTypes||[]).join(', ')||'-')}</td></tr></table><p>PDF hasil pengisian terlampir.</p></div>`,attachments:[{filename:`izin-kerja-${slug(permit)}.pdf`,content:req.file.buffer,contentType:'application/pdf'}]});
    res.json({ok:true,message:`Notifikasi berhasil dikirim ke ${MAIL_TO}.`});
  }catch(e){console.error(e);res.status(500).json({ok:false,message:'Gagal mengirim email. Periksa SMTP.'});}
});

app.get('*',(_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.listen(PORT,()=>console.log(`Izin Kerja web aktif di http://localhost:${PORT}`));
