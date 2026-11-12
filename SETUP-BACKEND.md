# تفعيل الطلبات في لوحة الإدارة + الإشعارات على الجوال

الموقع على GitHub Pages ثابت، ولذلك الطلبات تحتاج قاعدة بيانات صغيرة. نستخدم **Supabase** (مجاني للبدء).
بدون هذه الخطوات يعمل الموقع في "الوضع المحلي": الفاتورة PDF تُرسل بالواتساب والطلب لا يصل لوحة الإدارة تلقائيًا.

## 1) إنشاء المشروع
1. أنشئ حسابًا في https://supabase.com ثم **New project**.
2. من **SQL Editor** الصق محتوى `supabase/schema.sql` ثم **Run**.
3. من **Authentication → Users → Add user** أنشئ حساب الإدارة (بريد + كلمة مرور قوية). هذا هو دخولك للوحة.
4. من **Authentication → Providers → Email** اغلق **Allow new users to sign up** (حتى لا يسجّل أحد).
5. من **Project Settings → API** انسخ: `Project URL` و `anon public key`.

## 2) ربطه بالموقع (GitHub)
Repo → Settings → Secrets and variables → Actions → **Variables** → New repository variable:
- `NEXT_PUBLIC_SUPABASE_URL` = رابط المشروع
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = المفتاح العام (anon)

ثم أعد تشغيل الـ workflow (Actions → Deploy → Run workflow). بعدها لوحة الإدارة تطلب البريد وكلمة المرور، وكل طلب جديد يظهر فيها لحظيًا.

## 3) إشعارات الجوال (حتى والتطبيق مغلق)
1. أنشئ مفاتيح VAPID: `npx web-push generate-vapid-keys`
2. أضف في GitHub (Variables): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = المفتاح العام.
3. انشر الدالة: `supabase functions deploy notify-order` (بعد `supabase login` و `supabase link`) وضع أسرارها:
   `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com WEBHOOK_SECRET=<أي نص طويل>`
4. من **Database → Webhooks → Create**: Table `orders`، Event `Insert`، Type `Supabase Edge Functions` → `notify-order`، وأضف Header: `x-webhook-secret` بنفس القيمة.
5. على جوالك افتح `/admin/` وثبّت التطبيق (Android: قائمة Chrome → تثبيت التطبيق، iPhone: Safari → مشاركة → إضافة إلى الشاشة الرئيسية)، ثم من تبويب الطلبات اضغط **تفعيل إشعارات الطلبات**.
   (iPhone يتطلب iOS 16.4+ وأن يكون التطبيق مضافًا للشاشة الرئيسية.)

## ملاحظات أمان
- مفتاح `anon` عام بطبيعته. حماية البيانات من سياسات RLS في `schema.sql`: الزائر يستطيع **إضافة** طلب فقط ولا يقرأ شيئًا.
- لا تضع `service_role` key في GitHub أو الموقع أبدًا (تُستخدم داخل الدالة فقط كسر).
