📋 الخطوات التي يجب أن تنفذها أنت يدوياً
1. 🔑 إنشاء Keystore للتوقيع (مطلوب)
📋 الخطوات التي يجب أن تنفذها أنت يدوياً
1. 🔑 إنشاء Keystore للتوقيع (مطلوب)
keytool -genkeypair -v -keystore classify-release.keystore -alias classify-key -keyalg RSA -keysize 2048 -validity 10000 -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD

ثم أنشئ ملف android/keystore.properties:
storeFile=../classify-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=classify-key
keyPassword=YOUR_PASSWORD

storeFile=../classify-release.keystorestorePassword=YOUR_PASSWORDkeyAlias=classify-keykeyPassword=YOUR_PASSWORD
⚠️ احتفظ بنسخة احتياطية من الـ keystore في مكان آمن — فقدانه = لا يمكن تحديث التطبيق أبداً

2. 🔥 إعداد Firebase (مطلوب لإشعارات Push)
اذهب إلى Firebase Console
أنشئ مشروع جديد باسم "Classify"
أضف تطبيق Android بـ Package Name: com.classify.app
حمّل google-services.json وضعه في app
فعّل Cloud Messaging في إعدادات المشروع
3. 🎨 أيقونات التطبيق (مطلوب)
افتح Android Studio: npx cap open android
اضغط يمين على res → New → Image Asset
اختر أيقونة التطبيق (مقاس 1024x1024 PNG مربعة)
Android Studio سينشئ كل الأحجام تلقائياً (mdpi → xxxhdpi)
4. 🛡️ تحديث assetlinks.json (مطلوب للـ Deep Links)
بعد إنشاء الـ keystore، اشتغل هذا الأمر:


keytool -list -v -keystore classify-release.keystore -alias classify-key | grep SHA256
انسخ الـ SHA256 fingerprint وغيّر REPLACE_WITH_YOUR_SHA256_FINGERPRINT في ملف assetlinks.json

5. 💳 حساب Google Play Developer (مطلوب)
اذهب إلى Google Play Console
ادفع رسوم التسجيل ($25 مرة واحدة)
أكمل التحقق من الهوية (يأخذ 24-48 ساعة)
6. 📸 Screenshots + Store Listing
حضّر 4-8 screenshots (Phone: 1080x1920 أو 1440x2560)
صورة Feature Graphic: 1024x500
وصف قصير (80 حرف): "منصة تعليمية ممتعة للأطفال مع رقابة أبوية ذكية"
وصف كامل (4000 حرف)
سياسة الخصوصية URL: https://classi-fy.com/privacy
7. 🏗️ بناء ملف AAB ورفعه

cd android./gradlew bundleRelease
الملف سيكون في: android/app/build/outputs/bundle/release/app-release.aab

8. 🚀 رفع على Google Play Console
أنشئ تطبيق جديد في Play Console
أكمل Store Listing + Content Rating
ارفع AAB في Production/Internal Testing
أكمل Data Safety form
أرسل للمراجعة (عادة 3-7 أيام)
الترتيب المقترح:
اليوم: خطوة 1 (keystore) + خطوة 2 (Firebase) + خطوة 5 (حساب Play)
غداً: خطوة 3 (أيقونات) + خطوة 4 (assetlinks) + خطوة 6 (screenshots)
بعده: خطوة 7 (build AAB) + خطوة 8 (رفع)


keytool -genkeypair -v -keystore classify-release.keystore -alias classify-key -keyalg RSA -keysize 2048 -validity 10000 -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD
ثم أنشئ ملف android/keystore.properties:


storeFile=../classify-release.keystorestorePassword=YOUR_PASSWORDkeyAlias=classify-keykeyPassword=YOUR_PASSWORD
⚠️ احتفظ بنسخة احتياطية من الـ keystore في مكان آمن — فقدانه = لا يمكن تحديث التطبيق أبداً

2. 🔥 إعداد Firebase (مطلوب لإشعارات Push)
اذهب إلى Firebase Console
أنشئ مشروع جديد باسم "Classify"
أضف تطبيق Android بـ Package Name: com.classify.app
حمّل google-services.json وضعه في app
فعّل Cloud Messaging في إعدادات المشروع
3. 🎨 أيقونات التطبيق (مطلوب)
افتح Android Studio: npx cap open android
اضغط يمين على res → New → Image Asset
اختر أيقونة التطبيق (مقاس 1024x1024 PNG مربعة)
Android Studio سينشئ كل الأحجام تلقائياً (mdpi → xxxhdpi)
4. 🛡️ تحديث assetlinks.json (مطلوب للـ Deep Links)
بعد إنشاء الـ keystore، اشتغل هذا الأمر:
keytool -list -v -keystore classify-release.keystore -alias classify-key | grep SHA256

keytool -list -v -keystore classify-release.keystore -alias classify-key | grep SHA256
انسخ الـ SHA256 fingerprint وغيّر REPLACE_WITH_YOUR_SHA256_FINGERPRINT في ملف assetlinks.json

5. 💳 حساب Google Play Developer (مطلوب)
اذهب إلى Google Play Console
ادفع رسوم التسجيل ($25 مرة واحدة)
أكمل التحقق من الهوية (يأخذ 24-48 ساعة)
6. 📸 Screenshots + Store Listing
حضّر 4-8 screenshots (Phone: 1080x1920 أو 1440x2560)
صورة Feature Graphic: 1024x500
وصف قصير (80 حرف): "منصة تعليمية ممتعة للأطفال مع رقابة أبوية ذكية"
وصف كامل (4000 حرف)
سياسة الخصوصية URL: https://classi-fy.com/privacy
7. 🏗️ بناء ملف AAB ورفعه
cd android
./gradlew bundleRelease
cd android./gradlew bundleRelease
الملف سيكون في: android/app/build/outputs/bundle/release/app-release.aab

8. 🚀 رفع على Google Play Console
أنشئ تطبيق جديد في Play Console
أكمل Store Listing + Content Rating
ارفع AAB في Production/Internal Testing
أكمل Data Safety form
أرسل للمراجعة (عادة 3-7 أيام)
الترتيب المقترح:
اليوم: خطوة 1 (keystore) + خطوة 2 (Firebase) + خطوة 5 (حساب Play)
غداً: خطوة 3 (أيقونات) + خطوة 4 (assetlinks) + خطوة 6 (screenshots)
بعده: خطوة 7 (build AAB) + خطوة 8 (رفع)
