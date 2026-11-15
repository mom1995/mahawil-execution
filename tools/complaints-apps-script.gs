/**
 * استقبال الشكاوى والمقترحات من موقع مديرية تنفيذ قضاء المحاويل وحفظها في Google Sheets
 * ======================================================================================
 * يُلصق هذا الكود في محرر Apps Script المرتبط بجدول Google الخاص بالمديرية،
 * ثم يُنشر كتطبيق ويب (Web app). خطوات الإعداد الكاملة في الملف COMPLAINTS-SETUP.md.
 *
 * كل رسالة تُضاف سطراً في ورقة "الشكاوى" مع رقم مرجعي. لا يُرسل الكود أي بريد إلكتروني.
 */

// ===== الإعدادات =====
const SHEET_NAME = 'الشكاوى';
// ====================

const HEADERS = ['الرقم المرجعي', 'التاريخ والوقت', 'نوع الرسالة', 'الاسم', 'رقم الهاتف', 'نص الرسالة', 'الحالة', 'ملاحظات الموظف'];
const KINDS = ['شكوى', 'مقترح', 'استفسار', 'شكر وتقدير'];

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // حقل مخفي في النموذج: إن امتلأ فالمُرسل برنامج آلي (spam)
    if (d.website) return reply({ ok: true, ref: 'MH-0' });

    const name = clean(d.name, 100);
    const phone = String(d.phone || '').replace(/[^\d]/g, '');
    const kind = KINDS.indexOf(d.kind) >= 0 ? d.kind : 'شكوى';
    const msg = clean(d.message, 600);
    if (!name || !/^07\d{9}$/.test(phone) || !msg) return reply({ ok: false, error: 'invalid' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    let ref;
    try {
      const sh = getSheet();
      const tz = Session.getScriptTimeZone() || 'Asia/Baghdad';
      const now = new Date();
      ref = 'MH-' + Utilities.formatDate(now, tz, 'yyMMdd') + '-' + String(sh.getLastRow()).padStart(4, '0');
      sh.appendRow([ref, now, kind, name, "'" + phone, msg, 'جديدة', '']);
    } finally {
      lock.releaseLock();
    }

    return reply({ ok: true, ref: ref });
  } catch (err) {
    return reply({ ok: false, error: 'server' });
  }
}

// يتيح فتح رابط التطبيق في المتصفح للتأكد من أنه يعمل
function doGet() {
  return reply({ ok: true, service: 'mahawil-complaints' });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0b2545').setFontColor('#ffffff');
    sh.setRightToLeft(true);
    sh.setColumnWidth(6, 420);
  }
  return sh;
}

// تنظيف النص ومنع تنفيذه كمعادلة داخل الجدول
function clean(v, max) {
  let s = String(v || '').replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
