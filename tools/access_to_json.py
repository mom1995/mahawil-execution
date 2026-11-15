# -*- coding: utf-8 -*-
"""
تحويل بيانات الأضابير من قواعد Microsoft Access إلى ملفات البحث المشفّرة (data/meta.json و data/idx/)
=====================================================================================================

يقرأ جداول الأضابير من ملف Access واحد أو أكثر (.accdb / .mdb) أو من ملفات CSV مُصدَّرة من Access،
ويدمجها في ملفات البحث التي تستخدمها خدمة "البحث عن رقم الإضبارة" في الموقع.

🔒 الحماية:
   - لا يُكتب أي اسم. لكل اسم (ثلاثي، ورباعي إن وُجد) يُشتق بخوارزمية PBKDF2-SHA256 (100,000 تكرار):
       * مُعرِّف قصير يُستخدم للبحث،
       * ومفتاح AES-256 خاص بهذا الاسم وحده.
   - رقم الإضبارة والسنة والنوع تُشفَّر بـ AES-256-GCM بذلك المفتاح، فلا يقرؤها إلا من كتب الاسم الصحيح.
   - التكرارات الكثيرة تجعل تخمين الأسماء آلياً أبطأ بنحو 100,000 مرة من بصمة عادية.

طريقة الاستخدام
---------------
1) عرض الجداول والأعمدة في ملف أو أكثر:
       python access_to_json.py --list "D:\\ملف1.accdb" "D:\\ملف2.accdb"

2) ملف واحد (أسماء الأعمدة من الخطوة 1):
       python access_to_json.py "D:\\ملف1.accdb" --table "الاضابير" ^
           --no "رقم_الاضبارة" --year "السنة" --creditor "اسم_الدائن" --debtor "اسم_المدين" --type "نوع_القرار"

3) عدة ملفات (لكل ملف جدوله وأعمدته): انسخ sources.example.json إلى sources.json وعدّله، ثم:
       python access_to_json.py --config sources.json

4) ارفع data/meta.json وكل ملفات data/idx/ إلى المستودع على GitHub (استبدل القديمة واحذف ما لم يعد موجوداً).

المتطلبات
---------
- Python 3، ومكتبتا pyodbc و cryptography:  python -m pip install --user pyodbc cryptography
- "Microsoft Access Driver (*.mdb, *.accdb)" (يأتي مع Office) بنفس إصدار Python (64 أو 32 بت).
  إن لم يعمل ذلك، صدّر الجدول من Access إلى CSV (UTF-8) واستخدم ملف CSV بدل .accdb.

⚠️ مهم: normalize() و SALT و ITERATIONS وطريقة الاشتقاق هنا يجب أن تطابق ما في script.js حرفياً.
"""
import argparse, base64, csv, datetime, hashlib, json, os, re, sys
from multiprocessing import Pool

SALT = 'mahawil-v2'
ITERATIONS = 100_000
SHARDS = 64          # عدد ملفات الفهرس؛ يُختار الملف من أول بايت في المُعرِّف (>> 2)
NONCE = bytes(12)    # آمن هنا لأن كل مفتاح يُستخدم لتشفير رسالة واحدة فقط

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


def normalize(s):
    s = str(s or '')
    s = re.sub('[\u064B-\u0652\u0670\u0640]', '', s)
    s = re.sub('[أإآٱ]', 'ا', s).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    s = re.sub(r'[^\u0621-\u064Aa-zA-Z\s]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


def names_for(role, raw):
    """الصيغ التي يُبحث بها: الاسم كاملاً وأول ثلاث كلمات منه."""
    name = normalize(raw)
    words = name.split(' ')
    if len(words) < 3:
        return set()
    return {(role, name), (role, ' '.join(words[:3]))}


def derive(role, name):
    dk = hashlib.pbkdf2_hmac('sha256', name.encode('utf-8'), f'{SALT}|{role}'.encode('utf-8'), ITERATIONS, 48)
    return dk[:8].hex(), dk[16:48]          # (المُعرِّف، مفتاح AES-256)


def seal(item):
    """يُنفَّذ بالتوازي: يشتق المُعرِّف والمفتاح ويشفّر قائمة الأضابير لهذا الاسم."""
    (role, name), entries = item
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    ident, key = derive(role, name)
    plain = json.dumps(entries, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return ident, base64.b64encode(AESGCM(key).encrypt(NONCE, plain, None)).decode('ascii')


def clean_num(v):
    if isinstance(v, (datetime.date, datetime.datetime)):
        return str(v.year)
    v = str(v if v is not None else '').strip().translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))
    return v[:-2] if v.endswith('.0') else v


def clean_year(v):
    y = clean_num(v)
    m = re.search(r'(19|20)\d{2}', y)          # يقبل "2024" أو تاريخاً كاملاً مثل 2024-03-01
    return m.group(0) if m else y


# ---------- القراءة ----------
def access_conn(path):
    try:
        import pyodbc
    except ImportError:
        sys.exit('مكتبة pyodbc غير مثبتة. نفّذ:  python -m pip install --user pyodbc')
    if not os.path.isfile(path):
        sys.exit(f'الملف غير موجود: {path}')
    return pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=' + os.path.abspath(path) + ';ReadOnly=1')


def list_source(path):
    print(f'\n📁 {path}')
    if os.path.splitext(path)[1].lower() in ('.accdb', '.mdb'):
        conn = access_conn(path)
        for t in conn.cursor().tables(tableType='TABLE'):
            cols = [c.column_name for c in conn.cursor().columns(table=t.table_name)]
            n = conn.cursor().execute(f'SELECT COUNT(*) FROM [{t.table_name}]').fetchone()[0]
            print(f'   الجدول: {t.table_name}  ({n} سجل)\n      الأعمدة: {" | ".join(cols)}')
        conn.close()
    else:
        with open(path, encoding='utf-8-sig', newline='') as f:
            print('   الأعمدة: ' + ' | '.join(csv.DictReader(f).fieldnames or []))


def read_rows(src):
    path = src['file']
    if os.path.splitext(path)[1].lower() in ('.accdb', '.mdb'):
        if not src.get('table'):
            sys.exit(f'حدّد اسم الجدول (table) للملف: {path}')
        conn = access_conn(path)
        cur = conn.cursor()
        cur.execute(f'SELECT * FROM [{src["table"]}]')
        cols = [d[0] for d in cur.description]
        for row in cur.fetchall():
            yield dict(zip(cols, row))
        conn.close()
    else:
        with open(path, encoding='utf-8-sig', newline='') as f:
            yield from csv.DictReader(f)


# ---------- التحويل ----------
def convert(sources, out, demo=False):
    index, total, skipped, seen_files = {}, 0, 0, set()
    for src in sources:
        for req in ('file', 'no', 'year', 'creditor', 'debtor'):
            if not src.get(req):
                sys.exit(f'الحقل "{req}" مفقود في إعدادات المصدر: {src}')
        count = 0
        first = True
        for r in read_rows(src):
            if first:
                missing = [src[k] for k in ('no', 'year', 'creditor', 'debtor', 'type') if src.get(k) and src[k] not in r]
                if missing:
                    sys.exit(f'أعمدة غير موجودة في {src["file"]}: {", ".join(missing)}\nالأعمدة المتاحة: {" | ".join(r.keys())}')
                first = False
            no, year = clean_num(r.get(src['no'])), clean_year(r.get(src['year']))
            if not no or not year:
                skipped += 1
                continue
            kind = str(r.get(src['type']) or '').strip() if src.get('type') else ''
            entry = [no, year, kind] if kind else [no, year]
            keys = names_for('creditor', r.get(src['creditor'])) | names_for('debtor', r.get(src['debtor']))
            if not keys:
                skipped += 1
                continue
            for k in keys:
                lst = index.setdefault(k, [])
                if not any(e[0] == no and e[1] == year for e in lst):   # الإضبارة نفسها في أكثر من ملف تُحسب مرة واحدة
                    lst.append(entry)
            seen_files.add((no, year))
            count += 1
        print(f'✔ {os.path.basename(src["file"])}: {count} سجل')
        total += count

    print(f'\nجارٍ التشفير ({len(index)} اسم × {ITERATIONS:,} تكرار) على {os.cpu_count()} معالج… قد يستغرق بضع دقائق.')
    with Pool() as pool:
        sealed = pool.map(seal, index.items(), chunksize=200)

    # يُقسَّم الفهرس على 64 ملفاً حسب أول بايت من المُعرِّف، فيحمّل الموقع جزءاً صغيراً فقط عند البحث.
    out = os.path.abspath(out)
    if out.lower().endswith('.json'):            # توافق مع الإعدادات القديمة (data/files.json)
        out = os.path.dirname(out)
    idx_dir = os.path.join(out, 'idx')
    os.makedirs(idx_dir, exist_ok=True)
    for old in os.listdir(idx_dir):              # حذف ملفات الإصدار السابق (0.json … f.json)
        if old.endswith('.json'):
            os.remove(os.path.join(idx_dir, old))
    shards = [{} for _ in range(SHARDS)]
    for ident, blob in sealed:
        shards[int(ident[:2], 16) >> 2][ident] = blob
    sizes = []
    for n, part in enumerate(shards):
        p = os.path.join(idx_dir, f'{n:02d}.json')
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(part, f, separators=(',', ':'))
        sizes.append(os.path.getsize(p))
    meta = {'v': 2, 'updated': datetime.date.today().isoformat(), 'demo': demo, 'count': len(seen_files),
            'shards': SHARDS, 'iter': ITERATIONS}
    with open(os.path.join(out, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False)
    print(f'\nتم: {len(seen_files)} إضبارة مختلفة من {total} سجل، وتم تخطي {skipped} سجل '
          f'(بلا رقم/سنة أو اسم أقل من ثلاثي).\n'
          f'الملفات: {os.path.join(out, "meta.json")} و {SHARDS} ملفاً في {idx_dir} (00.json … {SHARDS - 1:02d}.json) '
          f'— المجموع {sum(sizes) // 1024} KB، أكبر جزء {max(sizes) // 1024} KB')


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description='تحويل أضابير Access إلى data/files.json')
    ap.add_argument('source', nargs='*', help='ملف .accdb أو .mdb أو .csv (أو عدة ملفات مع --list)')
    ap.add_argument('--list', action='store_true', help='عرض الجداول والأعمدة فقط')
    ap.add_argument('--config', help='ملف JSON بعدة مصادر (انظر sources.example.json)')
    ap.add_argument('--table', help='اسم الجدول في Access')
    ap.add_argument('--no', help='عمود رقم الإضبارة')
    ap.add_argument('--year', help='عمود السنة')
    ap.add_argument('--creditor', help='عمود اسم الدائن')
    ap.add_argument('--debtor', help='عمود اسم المدين')
    ap.add_argument('--type', help='عمود نوع القرار (اختياري)')
    ap.add_argument('--out', default=os.path.join(here, '..', 'data'), help='مجلد البيانات (افتراضياً data)')
    ap.add_argument('--demo', action='store_true', help=argparse.SUPPRESS)
    a = ap.parse_args()

    if a.list:
        if not a.source:
            sys.exit('اكتب مسار ملف واحد على الأقل بعد --list')
        for p in a.source:
            list_source(p)
        return

    if a.config:
        with open(a.config, encoding='utf-8-sig') as f:
            cfg = json.load(f)
        base = os.path.dirname(os.path.abspath(a.config))
        sources = [dict(s, file=os.path.join(base, s['file'])) for s in cfg['sources']]
        out = os.path.join(base, cfg['out']) if cfg.get('out') else a.out
        convert(sources, out, a.demo)
        return

    if len(a.source) != 1:
        sys.exit('اكتب مسار ملف واحد، أو استخدم --config لعدة ملفات، أو --list لعرض الأعمدة.')
    convert([{'file': a.source[0], 'table': a.table, 'no': a.no, 'year': a.year,
              'creditor': a.creditor, 'debtor': a.debtor, 'type': a.type}], a.out, a.demo)


if __name__ == '__main__':
    main()
