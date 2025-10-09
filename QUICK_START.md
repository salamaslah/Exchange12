# 🚀 دليل سريع: بناء APK للأندرويد

## ✅ المشكلة تم حلها!

تم إصلاح مشكلة عدم عمل التطبيق على الهاتف. السبب كان:
- متغيرات البيئة (Supabase) لم تكن مضمّنة في APK
- الآن تم إضافتها إلى `app.json` في حقل `extra`

---

## 📱 خطوات بناء APK جديد

### الطريقة الأولى: EAS Build (موصى بها)

```bash
# 1. تثبيت EAS CLI (مرة واحدة فقط)
npm install -g eas-cli

# 2. تسجيل الدخول
eas login

# 3. بناء APK
npm run build:android
```

ستحصل على رابط لتحميل APK بعد انتهاء البناء (5-15 دقيقة).

---

### الطريقة الثانية: البناء المحلي

```bash
npm run build:android-local
```

**ملاحظة:** يتطلب Android Studio و SDK مثبتين.

---

## ✨ ما تم إصلاحه

### 1. إضافة متغيرات البيئة إلى `app.json`:
```json
"extra": {
  "EXPO_PUBLIC_SUPABASE_URL": "https://...",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
}
```

### 2. تحديث `lib/supabase.ts`:
الآن يقرأ المتغيرات من 3 مصادر:
- `process.env` (للتطوير)
- `Constants.expoConfig.extra` (للـ APK)
- Fallback values (احتياطي)

### 3. إضافة تكوين Android:
```json
"android": {
  "package": "com.boltexpo.nativewind",
  "versionCode": 1
}
```

---

## 🔍 التحقق من نجاح التحديث

بعد تثبيت APK الجديد، افتح التطبيق وتحقق:

1. ✅ التطبيق يفتح بدون تعطل
2. ✅ شاشة تسجيل الدخول تظهر
3. ✅ بعد تسجيل الدخول، البيانات تُحمّل من قاعدة البيانات

إذا كنت متصلاً عبر USB Debug، ستشاهد في Logcat:
```
🔗 Supabase Configuration:
   URL: https://drmfvptsuvrqmsqtpzse.supabase.co
   Key: ✅ موجود
```

---

## ⚡ نصائح سريعة

1. **للاختبار السريع:** استخدم Expo Go (لكن لن تحصل على APK):
   ```bash
   npm run dev
   ```
   ثم امسح QR Code من هاتفك

2. **للتطوير على الهاتف مباشرة:**
   ```bash
   npm run android
   ```
   (يتطلب هاتف متصل عبر USB أو Emulator)

3. **للإنتاج:** استخدم:
   ```bash
   eas build --platform android --profile production
   ```
   هذا ينتج AAB بدلاً من APK (مطلوب لـ Google Play Store)

---

## 📞 استكشاف الأخطاء

### التطبيق يتعطل فوراً بعد الفتح؟
```bash
# اتصل الهاتف وشغل:
adb logcat *:E
```

### خطأ "Could not connect to development server"?
- هذا طبيعي في APK Production
- استخدم `preview` build بدلاً من `production`

### لا تظهر بيانات من Supabase؟
- تحقق من أن الإنترنت شغال على الهاتف
- تحقق من أن Supabase URL صحيح في `app.json`

---

## 📚 المزيد من المعلومات

راجع `BUILD_INSTRUCTIONS.md` للتفاصيل الكاملة.
