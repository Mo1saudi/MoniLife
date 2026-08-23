# دليل إعداد FCM وAPNs لاختبار إشعارات OMNI LIFE

هذا الدليل يوضح كيفية استخراج الاعتمادات المطلوبة لإرسال الإشعارات البعيدة لتطبيق **OMNI LIFE** على هاتف Android أو iPhone. يستخدم التطبيق خدمة إشعارات Expo، والتي تعتمد في الخلفية على **Firebase Cloud Messaging (FCM V1)** في Android و**Apple Push Notification service (APNs)** في iOS.

> لا ترسل ملفات المفاتيح أو محتواها في المحادثة. عند إنهاء الخطوات، أخبرني فقط بأن الملفات جاهزة؛ سأفتح حقول إدخال آمنة لرفعها.

| الهاتف المستهدف | ما تحتاجه | هل يتطلب اشتراكًا مدفوعًا؟ |
|---|---|---|
| Android | ملف `google-services.json` وملف مفتاح حساب خدمة FCM بصيغة JSON | لا |
| iPhone | ملف مفتاح APNs بصيغة `.p8`، وKey ID، وApple Team ID | نعم، عضوية Apple Developer مدفوعة |

## أولًا: إعداد Android وFirebase Cloud Messaging

### 1. إنشاء مشروع Firebase أو اختيار مشروع قائم

افتح [Firebase Console](https://console.firebase.google.com/) وسجّل الدخول بحساب Google الذي ستستخدمه لإدارة التطبيق. اختر مشروع Firebase قائمًا أو اضغط **Add project** لإنشاء مشروع جديد؛ يمكنك ترك Google Analytics اختياريًا لأن إرسال الإشعارات لا يتطلبه وحده. [1]

### 2. تسجيل تطبيق Android بالمعرّف الصحيح

من شاشة نظرة عامة للمشروع اضغط شعار **Android** أو **Add app**، ثم أدخل بيانات التطبيق التالية:

| الحقل في Firebase | القيمة المطلوبة لتطبيق OMNI LIFE |
|---|---|
| Android package name | `com.app.omnilifecenter` |
| App nickname | `OMNI LIFE Android`، اختياري |
| SHA-1 | اتركه فارغًا في هذه المرحلة ما لم تستخدم تسجيل دخول Google أو تقييد مفاتيح API |

يجب إدخال اسم الحزمة بنفس الأحرف تمامًا، لأن Firebase يربط التطبيق بهذا المعرّف ولا يمكن تغييره لاحقًا بعد التسجيل. [2]

### 3. تنزيل ملف `google-services.json`

بعد تسجيل التطبيق، اضغط **Download google-services.json**. احفظ الملف باسمِه الأصلي ومن دون إضافة مثل `(1)` أو `(2)` إلى الاسم. هذا الملف لا يحتوي مفتاحًا خاصًا، لكنه مطلوب كي يتعرف التطبيق المثبّت على مشروع Firebase ويستخرج رمز FCM/Expo بنجاح. [2] [3]

### 4. إنشاء مفتاح FCM V1 السري

في Firebase Console، انتقل إلى:

`Project settings` ← `Service accounts` ← **Generate new private key**

اضغط **Generate key** ثم احفظ ملف JSON الذي يُنزَّل. هذا هو ملف حساب الخدمة السري الخاص بـ **FCM V1**. لا ترفعه إلى GitHub، ولا ترسله في Telegram أو البريد أو المحادثة. ستُرفع نسخه إلى إعدادات Expo الآمنة لاحقًا كي تستطيع خدمة Expo تسليم الإشعارات إلى أجهزة Android. [3]

> إذا كان لديك حساب خدمة موجود، يجب أن يحمل دور **Firebase Cloud Messaging API Admin** قبل استخدام مفتاحه لإرسال FCM V1. [3]

### ما سترسله لاحقًا عبر الإدخال الآمن

1. محتوى ملف `google-services.json` كاملًا.
2. محتوى ملف مفتاح حساب الخدمة FCM V1 بصيغة JSON كاملًا.

## ثانيًا: إعداد iPhone وApple Push Notification service

### المتطلبات قبل البدء

يلزم حساب **Apple Developer Program** مدفوعًا، ويجب أن تكون صلاحيتك في الحساب **Account Holder** أو **Admin** لإنشاء مفتاح APNs. كما يجب تسجيل iPhone الذي ستختبر عليه في حساب Apple Developer عند إنشاء نسخة تطوير. [1] [4]

### 1. تسجيل App ID والتأكد من Push Notifications

افتح [Apple Developer Account](https://developer.apple.com/account/)، ثم ادخل إلى **Certificates, Identifiers & Profiles**.

1. افتح **Identifiers**.
2. ابحث عن App ID بمعرّف الحزمة `com.app.omnilifecenter`.
3. إذا لم يكن موجودًا، أنشئ App ID جديدًا واستخدم هذا المعرّف بالضبط.
4. افتح إعدادات App ID وتأكد من تفعيل **Push Notifications** ضمن Capabilities.

### 2. إنشاء مفتاح APNs

داخل **Certificates, Identifiers & Profiles**، اتبع الآتي:

1. افتح **Keys** من الشريط الجانبي.
2. اضغط زر الإضافة **+**.
3. اكتب اسمًا واضحًا، مثل `OMNI LIFE Push`.
4. فعّل مربع **Apple Push Notification service (APNs)**.
5. عند ظهور خيار **Configure**، اختر إعدادًا مناسبًا للفريق أو للتطبيق، ثم أكمل بـ **Continue** و**Confirm**.
6. اضغط **Download** ونزّل ملف المفتاح `AuthKey_XXXXXXXXXX.p8`.

يمكن تنزيل هذا الملف مرة واحدة فقط؛ خزّنه في مكان آمن. Apple تعرض أيضًا **Key ID** المكوّن من عشرة أحرف، وستحتاج إليه لاحقًا. [4] [5]

### 3. الحصول على Apple Team ID

من Apple Developer Account افتح صفحة **Membership details** أو صفحة العضوية الرئيسية. انسخ قيمة **Team ID**، وهي عادةً سلسلة من عشرة أحرف. تستخدم APNs كلًّا من Team ID وKey ID والمفتاح `.p8` للمصادقة. [5]

### 4. تحويل ملف `.p8` إلى Base64 محليًا

لا تستخدم موقع تحويل Base64 على الإنترنت، لأن ملف `.p8` مفتاح خاص. حوّله محليًا على جهاز موثوق فقط.

| النظام | الطريقة الآمنة محليًا |
|---|---|
| macOS أو Linux | افتح Terminal داخل مجلد الملف ثم نفّذ: `base64 -w 0 AuthKey_XXXXXXXXXX.p8` |
| Windows PowerShell | نفّذ: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\PATH\AuthKey_XXXXXXXXXX.p8'))` |

انسخ الناتج كاملًا في حقل الإدخال الآمن المخصص للمفتاح. لا تحذف ملف `.p8` الأصلي قبل التأكد من نجاح الإعداد والاختبار.

### ما سترسله لاحقًا عبر الإدخال الآمن

1. النص Base64 الناتج من ملف `AuthKey_XXXXXXXXXX.p8`.
2. **APNs Key ID**.
3. **Apple Team ID**.

## ثالثًا: ما الذي سأفعله بعد استلام الاعتمادات

سأربط ملف Firebase بتهيئة Android، وأرفع مفتاح FCM V1 إلى مشروع Expo، وأضيف بيانات APNs إلى إعدادات iOS الآمنة. بعد ذلك سننشئ نسخة تطوير مخصصة للهاتف؛ لا يكفي Expo Go لاختبار الإشعارات البعيدة على Android في هذه النسخة من Expo. [1] [6]

## رابعًا: اختبار وصول الإشعار على هاتف فعلي

بعد تثبيت النسخة المخصصة على الهاتف، اتبع التسلسل التالي:

1. افتح OMNI LIFE وسجّل الدخول.
2. وافق على إذن الإشعارات عندما يطلبه النظام.
3. اترك التطبيق مفتوحًا مرة واحدة حتى يسجل رمز الجهاز لدى الخادم.
4. من حساب المدير، أرسل حملة اختبار بعنوان مثل: **اختبار إشعارات OMNI LIFE**.
5. أغلق التطبيق أو ضعه في الخلفية، ثم تحقق من ظهور الإشعار على شاشة الهاتف.
6. اضغط على الإشعار وتأكد من انتقال التطبيق إلى الوجهة المرتبطة به.

يُختبر الاستلام على هاتف فعلي أو بيئة اختبار تدعم الإشعارات؛ كما توصي Expo باستخدام نسخة تطوير مخصصة عند اختبار الإشعارات البعيدة. [1] [6]

## ملاحظات مهمة عند حدوث مشكلة

| العرض | الإجراء الأول |
|---|---|
| لا يظهر طلب إذن الإشعارات في Android | تأكد من فتح التطبيق في نسخة مخصصة، ومن إنشاء قناة الإشعارات قبل طلب الرمز. |
| يظهر خطأ FCM أو لا يُنشأ رمز الجهاز | راجع أن `google-services.json` يطابق `com.app.omnilifecenter` وأن ملف حساب خدمة FCM V1 صحيح. |
| لا يصل إشعار iPhone | تحقق من عضوية Apple Developer، وتفعيل Push Notifications في App ID، وتطابق Key ID وTeam ID مع ملف `.p8`. |
| الرمز موجود لكن الإشعار لا يصل | افحص أن المستخدم وافق على الإذن، وأن الهاتف متصل بالإنترنت، وأن الجهاز مسجّل في بيانات الإشعارات بالتطبيق. |

## المراجع

[1]: https://docs.expo.dev/push-notifications/push-notifications-setup/ "Expo: Push notifications setup"
[2]: https://firebase.google.com/docs/android/setup "Firebase: Add Firebase to your Android project"
[3]: https://docs.expo.dev/push-notifications/fcm-credentials/ "Expo: Obtain Google Service Account Keys using FCM V1"
[4]: https://developer.apple.com/help/account/manage-keys/create-a-private-key/ "Apple Developer: Create a private key to access a service"
[5]: https://developer.apple.com/documentation/usernotifications/establishing-a-token-based-connection-to-apns "Apple: Establishing a token-based connection to APNs"
[6]: https://docs.expo.dev/versions/latest/sdk/notifications/ "Expo Notifications SDK"
