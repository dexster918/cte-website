# 🚀 دليل النشر — موقع CTE 2018

هذا الدليل يشرح كيفاش تخلي لوحة الأدمن تخدم **محلياً** و**على الأنترنت** (باش كي تزيد اختراع أو عضو يبان في الموقع مباشرة).

---

## 1) كيفاش تخدم الحاجة دكا

```
admin.html  ──►  POST /save   ──►  content.json   (محلياً)
                                  أو MongoDB       (على الأنترنت)
public pages ──►  GET /content.json  ──►  نفس البيانات
```

- كي تشغّل `node server.js`، الموقع كامل يخدم من نفس السيرفر (port 3000).
- الأدمن يحفظ عبر `/save`، والصفحات العمومية تقرأ من `/content.json`.
- **مهم:** لازم تفتح الموقع من خلال السيرفر (`http://localhost:3000`)، ماشي بالنقر المباشر على الملف، باش الأدمن يلقى السيرفر.

### كيفاش تشغّلو محلياً

```powershell
cd C:\Users\thinnkbook\OneDrive\Desktop\projet
node server.js
```

من بعد افتح في المتصفح:
- الموقع: `http://localhost:3000`
- لوحة الأدمن: `http://localhost:3000/admin.html` (كلمة السر: `cte2026`)

---

## 2) النشر على الأنترنت (Render + MongoDB)

المشكلة: الاستضافات المجانية (Render / Netlify / GitHub Pages) **ما تحفظش الملفات** — كل مرة يعاود السيرفر يشتغل، `content.json` يرجع للنسخة القديمة.
الحل: نخزّنو المحتوى في **قاعدة بيانات MongoDB Atlas** (مجانية).

### الخطوة 1: قاعدة بيانات MongoDB Atlas

1. اذهب إلى <https://www.mongodb.com/cloud/atlas/register> وسجّل (مجاني).
2. أنشئ **Cluster** (اختر `M0 Free`).
3. في **Database Access**: أنشئ مستخدم (user + password) ولازم我给你 رقم ما فيهش رموز خاصة.
4. في **Network Access**: أضف `0.0.0.0/0` (يسمح لأي سيرفر يتصل) — مناسب للاستضافة.
5. اضغط **Connect → Drivers** وخُذ الرابط اللي يشبه:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   (بدّل `USER` و`PASSWORD` باللي درتهم).

### الخطوة 2: نشر السيرفر على Render

1. اذهب إلى <https://render.com> وسجّل بحساب GitHub.
2. حطّ الكود في مستودع GitHub (repo). إذا ما تعرفش، قلي ونديروها خطوة بخطوة.
3. في Render: **New → Web Service** → اختر المستودع.
4. الإعدادات:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
5. في **Environment Variables** أضف:
   | المفتاح | القيمة |
   |---|---|
   | `MONGODB_URI` | الرابط تاع Atlas (الخطوة 1) |
   | `ADMIN_PASSWORD` | كلمة سر قوية (مثلاً `Cte!2026#Tipaza`) |
6. اضغط **Create Web Service**. بعد ما يكمّل، راح تلقى رابط مثل:
   ```
   https://cte-website.onrender.com
   ```

### الخطوة 3: استعمل الموقع

- الموقع: `https://cte-website.onrender.com`
- الأدمن: `https://cte-website.onrender.com/admin.html`
- كلمة السر: نفس `ADMIN_PASSWORD` اللي حطيتها في Render.

كي تزيد اختراع ولا عضو وتحفظ، البيانات تروح لـ MongoDB، و**تبقى** حتى بعد ما يعاود السيرفر يشتغل. ✅

> في أول تشغيل، السيرفر ينسخ `content.json` تلقائياً لقاعدة البيانات (Seeding)، يعني ما تفقدش المحتوى القديم.

---

## 3) ملاحظات مهمة

- **Render المجاني ينعّس**: إذا ما دخلش أحد للموقع مدة ~15 دقيقة، أول زيارة تاخذ ~30 ثانية باش يفيق. عادي.
- **حجم الصور**: خزّن الصور **صغيرة** (أقل من 1 ميغا) أو استعمل **روابط immagini** (URL) بلا ما ترفع الملف مباشرة. السبب: قاعدة البيانات عندها حد أقصى ~16 ميغا للمستند الواحد، والصور Base64 تكبّر الحجم بزاف.
- **تغيير كلمة السر**: بدّلها في Render (Environment Variables) وفي خانة Settings في الأدمن باش يتوافقوا.
- **الاحتياط**: قبل أي تعديل كبير، احتفظ بنسخة من `content.json`.

---

## 4) الملفات المرتبطة

| الملف | الدور |
|---|---|
| `server.js` | السيرفر: الموقع + API (`/save`, `/load`, `/content.json`, `/health`) |
| `content.json` | بيانات الموقع (النسخة المحلية) |
| `admin.html` | لوحة التحكم |
| `render.yaml` | إعدادات النشر الآلي على Render |
| `.env.example` | مثال لمتغيّرات البيئة |
