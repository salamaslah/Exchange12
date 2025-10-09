# تعليمات بناء التطبيق للهاتف (Android APK)

## المشاكل الشائعة وحلولها

### المشكلة: التطبيق لا يعمل بعد تثبيت APK

**السبب:** متغيرات البيئة (Supabase URL & Key) لم يتم تضمينها في البناء

**الحل:** تم إصلاح هذه المشكلة بإضافة المتغيرات إلى `app.json` في حقل `extra`

---

## طريقة البناء الصحيحة

### 1️⃣ التأكد من التكوين

تأكد من أن ملف `app.json` يحتوي على:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_SUPABASE_URL": "https://drmfvptsuvrqmsqtpzse.supabase.co",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "..."
    }
  }
}
```

### 2️⃣ بناء APK باستخدام EAS Build

#### الخطوة الأولى: تثبيت EAS CLI

```bash
npm install -g eas-cli
```

#### الخطوة الثانية: تسجيل الدخول

```bash
eas login
```

#### الخطوة الثالثة: تكوين المشروع

```bash
eas build:configure
```

#### الخطوة الرابعة: بناء APK

للبناء المحلي (بدون حساب Expo):
```bash
eas build --platform android --profile preview --local
```

للبناء السحابي (يتطلب حساب Expo):
```bash
eas build --platform android --profile preview
```

---

## 3️⃣ البناء باستخدام Expo Development Build

### إذا كنت تريد بناء محلي:

```bash
# 1. تثبيت الحزم المطلوبة
npx expo install expo-dev-client

# 2. بناء للأندرويد
npx expo run:android
```

**ملاحظة:** هذه الطريقة تتطلب:
- Android Studio مثبت
- Android SDK مكون بشكل صحيح
- Java JDK 17 أو أعلى

---

## 4️⃣ التحقق من نجاح البناء

بعد تثبيت التطبيق على الهاتف، افتحه وتحقق من:

1. ✅ شاشة تسجيل الدخول تظهر بشكل صحيح
2. ✅ بعد تسجيل الدخول، البيانات تُحمّل من Supabase
3. ✅ في console logs (إذا كان متصل بـ USB)، يجب أن ترى:
   ```
   🔗 Supabase Configuration:
      URL: https://drmfvptsuvrqmsqtpzse.supabase.co
      Key: ✅ موجود
   ```

---

## المتطلبات الأساسية

### لبناء APK على Windows:

1. **Node.js** (v18 أو أعلى)
2. **Android Studio** مع:
   - Android SDK Platform 34
   - Android SDK Build-Tools
   - Android Emulator (اختياري للاختبار)
3. **Java JDK 17**

### لبناء APK على Mac/Linux:

نفس المتطلبات أعلاه، لكن التثبيت قد يكون أسهل باستخدام Homebrew:

```bash
brew install node
brew install openjdk@17
```

---

## استكشاف الأخطاء

### خطأ: "Supabase client not initialized"

**الحل:** تأكد من أن `app.json` يحتوي على حقل `extra` بالمتغيرات

### خطأ: "Network request failed"

**الحل:**
1. تأكد من أن الهاتف متصل بالإنترنت
2. تأكد من أن Supabase URL صحيح
3. تحقق من أن الـ API Key غير منتهي الصلاحية

### التطبيق يتعطل عند الفتح

**الحل:**
1. استخدم `adb logcat` لرؤية الأخطاء:
   ```bash
   adb logcat *:E
   ```
2. تحقق من أن جميع الحزم المطلوبة مثبتة في `package.json`

---

## ملاحظات مهمة

1. ⚠️ **لا تشارك** ملف APK الذي يحتوي على مفاتيح Supabase حقيقية مع أشخاص آخرين
2. 🔒 للإنتاج، استخدم **Supabase Row Level Security (RLS)** لحماية البيانات
3. 📱 اختبر التطبيق على أجهزة مختلفة قبل النشر
4. 🔄 استخدم **EAS Update** لتحديث التطبيق بدون إعادة بناء APK

---

## روابط مفيدة

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase React Native Setup](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)
