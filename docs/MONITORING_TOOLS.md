# Monitoring & Management Tools Documentation

## Overview
تم إضافة 7 أدوات متقدمة للمراقبة والإدارة إلى المشروع:

### 1. **Portainer** (إدارة Docker)
- **الرابط**: `http://localhost:9000` أو `http://srv1118737.hstgr.cloud:9000`
- **الوصف**: واجهة بصرية لإدارة جميع حاويات Docker والصور والأحجام
- **الميزات**:
  - إدارة الحاويات (start/stop/restart)
  - عرض السجلات في الوقت الفعلي
  - إدارة الصور والشبكات
  - المراقبة الأساسية للموارد
  
---

### 2. **pgAdmin** (إدارة قاعدة البيانات)
- **الرابط**: `http://localhost:5050` أو `http://pgadmin.classi-fy.com`
- **بيانات الدخول**: `admin@classiv3.com` / `admin123`
- **الوصف**: واجهة بصرية كاملة لـ PostgreSQL
- **الميزات**:
  - تصفح الجداول والبيانات
  - كتابة والتنفيذ queries
  - بافاج النسخ الاحتياطي والاستعادة
  - إدارة المستخدمين والصلاحيات

---

### 3. **Redis Commander** (مراقبة الذاكرة المؤقتة)
- **الرابط**: `http://localhost:8081` أو `http://redis-commander.classi-fy.com`
- **الوصف**: واجهة بصرية لإدارة Redis
- **الميزات**:
  - عرض المفاتيح والقيم
  - حذف البيانات المؤقتة
  - مراقبة الذاكرة المستخدمة
  - اختبار الأوامر

---

### 4. **Prometheus** (جمع المقاييس)
- **الرابط**: `http://localhost:9090` أو `http://prometheus.classi-fy.com`
- **الوصف**: نظام جمع البيانات الزمنية والمقاييس
- **الميزات**:
  - جمع مقاييس النظام والتطبيق
  - الاستعلام عن البيانات التاريخية
  - رصد الأداء على مدار الوقت
  - تخزين 30 يوم من البيانات

---

### 5. **Grafana** (لوحات التحكم البصرية)
- **الرابط**: `http://localhost:3000` أو `http://grafana.classi-fy.com`
- **بيانات الدخول**: `admin` / `admin123`
- **الوصف**: لوحات تحكم بصرية متقدمة
- **الميزات**:
  - إنشاء لوحات تحكم مخصصة
  - تصور المقاييس والبيانات
  - تنبيهات تلقائية عند تجاوز العتبات
  - دعم Prometheus و Loki

---

### 6. **Loki** (مركز السجلات)
- **الرابط**: `http://localhost:3100` (API فقط)
- **الوصف**: نظام جمع ومعالجة السجلات
- **الميزات**:
  - تجميع سجلات جميع الحاويات
  - البحث السريع في السجلات
  - الربط مع Grafana للتصور
  - الاحتفاظ بـ 30 يوم من البيانات

---

### 7. **Mailhog** (اختبار البريد الإلكتروني)
- **الرابط**: `http://localhost:8025` أو `http://mailhog.classi-fy.com`
- **الوصف**: محاكاة بريد محلية لاختبار الرسائل
- **الميزات**:
  - التقاط جميع رسائل البريد المرسلة
  - عرض محتوى HTML والنصوص البسيطة
  - واجهة بصرية للرسائل المرسلة
  - مفيد لاختبار OTP والإخطارات

---

## كيفية الاستخدام

### التشغيل المحلي
```bash
cd /path/to/classify
docker-compose up -d
```

جميع الأدوات ستبدأ تلقائياً وتكون متاحة على الروابط أعلاه.

### الوصول عبر Traefik (الإنتاج)
عند النشر على VPS مع HTTPS:
- `https://portainer.classi-fy.com`
- `https://pgadmin.classi-fy.com`
- `https://redis-commander.classi-fy.com`
- `https://prometheus.classi-fy.com`
- `https://grafana.classi-fy.com`
- `https://mailhog.classi-fy.com`

---

## الأمان والموصيات

⚠️ **للإنتاج**:
1. غير جميع كلمات مرور الإدارة الافتراضية
2. أضف مصادقة إضافية (nginx auth/OAuth)
3. اربط Traefik بمجالات آمنة فقط
4. استخدم VPN أو firewall للموارد الداخلية

---

## موارد النظام

| الأداة | الذاكرة (حد أقصى) | الذاكرة (محجوز) |
|--------|-------------------|-----------------|
| Portainer | 512M | 256M |
| pgAdmin | 512M | 256M |
| Redis Commander | 256M | 128M |
| Prometheus | 512M | 256M |
| Grafana | 512M | 256M |
| Loki | 512M | 256M |
| Mailhog | 256M | 128M |
| **الإجمالي** | **3.5GB** | **1.8GB** |

---

## استكشاف الأخطاء

### Portainer لا يفتح
```bash
docker-compose logs portainer
docker-compose restart portainer
```

### pgAdmin لا يتصل ببقاعدة البيانات
```bash
# تحقق من حالة قاعدة البيانات
docker-compose ps db
docker-compose exec db pg_isready -U classify
```

### Prometheus لا يجمع البيانات
```bash
docker-compose logs prometheus
# تحقق من /monitoring/prometheus.yml
```

### Mailhog لا يستقبل الرسائل
```bash
# تأكد من أن SMTP_HOST في التطبيق = mailhog:1025
docker-compose logs mailhog
```

---

## النسخ الاحتياطي

```bash
# نسخ احتياطية من البيانات
docker-compose exec prometheus tar czf - /prometheus > prometheus_backup.tar.gz
docker-compose exec grafana tar czf - /var/lib/grafana > grafana_backup.tar.gz

# الاستعادة
docker-compose exec prometheus sh -c "tar xzf /dev/stdin -C /" < prometheus_backup.tar.gz
```

---

## هل تريد المزيد؟

يمكن إضافة أيضاً:
- **cAdvisor** - مراقبة موارد Docker
- **AlertManager** - إدارة التنبيهات
- **Node Exporter** - مقاييس النظام
- **Postgres Exporter** - مقاييس قاعدة البيانات
