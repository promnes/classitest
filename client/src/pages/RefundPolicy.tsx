import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import { CreditCard, ArrowLeft, ArrowRight, Shield, Clock, AlertTriangle, Mail, ChevronDown, RefreshCcw, XCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

const ar = {
  title: "سياسة الاسترداد والإلغاء",
  subtitle: "شروط وأحكام استرداد الأموال وإلغاء الاشتراكات",
  lastUpdated: "21 فبراير 2026",
  version: "الإصدار 2.0",
  intro: "تحرص Classify على رضا عملائها وشفافية تعاملاتها المالية. تُحدد هذه السياسة حقوقكم فيما يخص استرداد الأموال وإلغاء الاشتراكات والإجراءات المتبعة لمعالجة طلبات الاسترداد عبر متجر Google Play و Apple App Store.",
  sections: [
    { id: "scope", icon: "Shield", title: "نطاق السياسة", paragraphs: [
      "تنطبق هذه السياسة على جميع عمليات الشراء والاشتراكات التي تتم من خلال منصة Classify، بما في ذلك:",
    ], items: [
      "الاشتراكات الشهرية والسنوية في الخطط المدفوعة.",
      "المشتريات داخل التطبيق (In-App Purchases).",
      "الهدايا والمكافآت الرقمية المدفوعة.",
      "أي مدفوعات أخرى تتم عبر المنصة.",
      "تخضع عمليات الشراء عبر Google Play و Apple App Store لسياسات الاسترداد الخاصة بهذه المنصات بالإضافة إلى سياستنا.",
    ] },
    { id: "eligibility", icon: "CheckCircle", title: "شروط الأهلية للاسترداد", paragraphs: [
      "يحق لكم طلب استرداد كامل المبلغ في الحالات التالية:",
    ], items: [
      "خلال 48 ساعة من الشراء: استرداد كامل بدون أي أسئلة (ضمان الرضا).",
      "خلل تقني: إذا تعذّر الوصول إلى الخدمة بسبب خلل تقني من طرفنا لأكثر من 72 ساعة متواصلة.",
      "خصم مزدوج: في حالة خصم المبلغ أكثر من مرة عن نفس الخدمة.",
      "خدمة غير مقدّمة: إذا لم يتم تفعيل الخدمة المدفوعة رغم نجاح عملية الدفع.",
      "وصف مضلل: إذا كانت الخدمة المقدمة مختلفة جوهريًا عمّا تم وصفه.",
    ] },
    { id: "partial-refund", icon: "RefreshCcw", title: "الاسترداد الجزئي", paragraphs: [
      "قد يتم تقديم استرداد جزئي في الحالات التالية:",
    ], items: [
      "طلب الاسترداد بعد 48 ساعة وحتى 14 يومًا من الشراء: استرداد نسبي بناءً على فترة الاستخدام.",
      "إلغاء اشتراك سنوي: استرداد نسبي للأشهر المتبقية غير المستخدمة.",
      "مشكلة تقنية جزئية: استرداد نسبي إذا كانت المشكلة تؤثر على جزء من الخدمة فقط.",
    ] },
    { id: "non-refundable", icon: "XCircle", title: "حالات لا يُقبل فيها الاسترداد", paragraphs: [
      "لا يمكننا تقديم استرداد في الحالات التالية:",
    ], items: [
      "مرور أكثر من 14 يومًا على تاريخ الشراء (إلا في حالات استثنائية).",
      "استخدام الخدمة بشكل كامل (مثل إكمال جميع المحتويات التعليمية في الحزمة).",
      "انتهاك شروط الاستخدام مما أدى إلى تعليق أو إلغاء الحساب.",
      "تغيير الرأي بعد فترة الضمان (48 ساعة) إذا كانت الخدمة تعمل بشكل صحيح.",
      "المشتريات المجانية أو المكافآت الترويجية.",
      "الخصومات والعروض الخاصة المحددة بشرط \"غير قابلة للاسترداد\" عند الشراء.",
    ] },
    { id: "process", icon: "Clock", title: "إجراءات طلب الاسترداد", paragraphs: [
      "لطلب استرداد، يُرجى اتباع الخطوات التالية:",
    ], items: [
      "الخطوة 1: تواصلوا مع فريق الدعم عبر البريد الإلكتروني support@classi-fy.com أو من خلال صفحة التواصل على المنصة.",
      "الخطوة 2: اذكروا في رسالتكم: عنوان البريد الإلكتروني المسجّل، تفاصيل عملية الشراء (التاريخ، المبلغ، نوع الخدمة)، وسبب طلب الاسترداد.",
      "الخطوة 3: سيراجع فريقنا طلبكم خلال 3 أيام عمل.",
      "الخطوة 4: ستتلقون إشعارًا بالبريد الإلكتروني بنتيجة المراجعة.",
      "الخطوة 5: في حالة الموافقة، سيتم معالجة الاسترداد خلال 5-10 أيام عمل.",
    ] },
    { id: "refund-methods", icon: "CreditCard", title: "طرق الاسترداد", paragraphs: [
      "يتم استرداد المبلغ بنفس الطريقة التي تمت بها عملية الدفع الأصلية:",
    ], items: [
      "عمليات الشراء عبر Google Play: يتم الاسترداد عبر Google Play إلى طريقة الدفع الأصلية. يمكنكم أيضًا طلب الاسترداد مباشرة من Google Play.",
      "عمليات الشراء عبر Apple App Store: يتم الاسترداد عبر Apple. يمكنكم طلب الاسترداد من reportaproblem.apple.com.",
      "عمليات الشراء عبر بطاقة الائتمان (Stripe): يتم الاسترداد إلى البطاقة الأصلية خلال 5-10 أيام عمل.",
      "ملاحظة: قد تستغرق عمليات الاسترداد وقتًا إضافيًا حسب البنك أو مزود خدمة الدفع.",
    ] },
    { id: "subscriptions", icon: "RefreshCcw", title: "إلغاء الاشتراكات", paragraphs: [
      "يمكنكم إلغاء اشتراككم في أي وقت. تفاصيل عملية الإلغاء:",
    ], items: [
      "الإلغاء الفوري: يمكنكم إلغاء اشتراككم من إعدادات حسابكم في أي وقت.",
      "استمرار الوصول: بعد الإلغاء، ستظلون قادرين على الوصول إلى الخدمة المدفوعة حتى نهاية فترة الاشتراك الحالية.",
      "عدم التجديد التلقائي: بعد الإلغاء، لن يتم تجديد الاشتراك تلقائيًا ولن يتم خصم أي مبالغ إضافية.",
      "إلغاء عبر المتجر: لاشتراكات Google Play أو App Store، يجب إلغاء الاشتراك من خلال المتجر المعني وليس من تطبيقنا فقط.",
      "فترة السماح: إذا فاتكم إلغاء الاشتراك قبل التجديد، يمكنكم التقدم بطلب استرداد خلال 48 ساعة من التجديد.",
    ] },
    { id: "disputes", icon: "AlertTriangle", title: "حل النزاعات", paragraphs: [
      "إذا لم تكونوا راضين عن نتيجة طلب الاسترداد:",
    ], items: [
      "يمكنكم طلب مراجعة ثانية عبر إرسال بريد إلكتروني إلى billing@classi-fy.com مع ذكر رقم طلب الاسترداد.",
      "سيراجع مسؤول أعلى طلبكم خلال 5 أيام عمل.",
      "يمكنكم أيضًا التقدم بشكوى إلى جهة حماية المستهلك في بلدكم.",
      "لعمليات الشراء عبر Google Play، يمكنكم الاستعانة بمركز مساعدة Google Play.",
      "لعمليات الشراء عبر Apple، يمكنكم استخدام reportaproblem.apple.com.",
    ] },
    { id: "contact", icon: "Mail", title: "التواصل بشأن الاسترداد", paragraphs: [
      "لأي استفسارات أو طلبات استرداد:",
    ], items: [
      "دعم الفوترة: billing@classi-fy.com",
      "الدعم العام: support@classi-fy.com",
      "صفحة التواصل: https://classi-fy.com/contact",
      "نلتزم بالرد على جميع طلبات الاسترداد خلال 3 أيام عمل.",
    ] },
  ],
};

const en = {
  title: "Refund & Cancellation Policy",
  subtitle: "Terms and Conditions for Refunds and Subscription Cancellations",
  lastUpdated: "February 21, 2026",
  version: "Version 2.0",
  intro: "Classify is committed to customer satisfaction and transparency in financial transactions. This policy defines your rights regarding refunds, subscription cancellations, and the procedures for processing refund requests through Google Play and Apple App Store.",
  sections: [
    { id: "scope", icon: "Shield", title: "Scope", paragraphs: ["This policy applies to all purchases and subscriptions made through Classify, including:"], items: ["Monthly and annual premium plan subscriptions.", "In-App Purchases.", "Paid digital gifts and rewards.", "Any other payments made through the platform.", "Purchases through Google Play and Apple App Store are subject to those platforms' refund policies in addition to ours."] },
    { id: "eligibility", icon: "CheckCircle", title: "Refund Eligibility", paragraphs: ["You are entitled to a full refund in the following cases:"], items: ["Within 48 hours of purchase: Full refund with no questions asked (satisfaction guarantee).", "Technical malfunction: If the service is inaccessible due to a technical issue on our end for more than 72 consecutive hours.", "Double charge: If the amount was charged more than once for the same service.", "Service not provided: If the paid service was not activated despite a successful payment.", "Misleading description: If the service provided is substantially different from what was described."] },
    { id: "partial-refund", icon: "RefreshCcw", title: "Partial Refunds", paragraphs: ["A partial refund may be offered in the following cases:"], items: ["Refund request after 48 hours and up to 14 days from purchase: Prorated refund based on usage period.", "Annual subscription cancellation: Prorated refund for remaining unused months.", "Partial technical issue: Prorated refund if the issue affects only part of the service."] },
    { id: "non-refundable", icon: "XCircle", title: "Non-Refundable Cases", paragraphs: ["We cannot provide a refund in the following cases:"], items: ["More than 14 days have passed since the purchase date (except in exceptional cases).", "The service has been fully consumed (e.g., completing all educational content in the package).", "Violation of Terms of Service resulting in account suspension or termination.", "Change of mind after the guarantee period (48 hours) if the service is functioning correctly.", "Free purchases or promotional rewards.", "Discounts and special offers marked as 'non-refundable' at the time of purchase."] },
    { id: "process", icon: "Clock", title: "Refund Request Process", paragraphs: ["To request a refund, please follow these steps:"], items: ["Step 1: Contact our support team via email at support@classi-fy.com or through the Contact page.", "Step 2: Include in your message: registered email address, purchase details (date, amount, service type), and reason for refund.", "Step 3: Our team will review your request within 3 business days.", "Step 4: You will receive an email notification with the review result.", "Step 5: If approved, the refund will be processed within 5-10 business days."] },
    { id: "refund-methods", icon: "CreditCard", title: "Refund Methods", paragraphs: ["The refund is processed using the same payment method used for the original purchase:"], items: ["Google Play purchases: Refunded through Google Play to the original payment method. You may also request a refund directly from Google Play.", "Apple App Store purchases: Refunded through Apple. You may request a refund at reportaproblem.apple.com.", "Credit card purchases (Stripe): Refunded to the original card within 5-10 business days.", "Note: Refunds may take additional time depending on your bank or payment provider."] },
    { id: "subscriptions", icon: "RefreshCcw", title: "Subscription Cancellation", paragraphs: ["You can cancel your subscription at any time. Cancellation details:"], items: ["Immediate cancellation: You can cancel from your account settings at any time.", "Continued access: After cancellation, you retain access to the paid service until the end of the current billing period.", "No auto-renewal: After cancellation, the subscription will not auto-renew and no additional charges will be made.", "Store cancellation: For Google Play or App Store subscriptions, cancellation must be done through the respective store, not just our app.", "Grace period: If you missed cancelling before renewal, you can request a refund within 48 hours of the renewal charge."] },
    { id: "disputes", icon: "AlertTriangle", title: "Dispute Resolution", paragraphs: ["If you are not satisfied with the refund request outcome:"], items: ["You may request a second review by emailing billing@classi-fy.com with the refund request number.", "A senior officer will review your request within 5 business days.", "You may also file a complaint with your local consumer protection authority.", "For Google Play purchases, you can use the Google Play Help Center.", "For Apple purchases, you can use reportaproblem.apple.com."] },
    { id: "contact", icon: "Mail", title: "Contact Us About Refunds", paragraphs: ["For any refund inquiries or requests:"], items: ["Billing Support: billing@classi-fy.com", "General Support: support@classi-fy.com", "Contact Page: https://classi-fy.com/contact", "We commit to responding to all refund requests within 3 business days."] },
  ],
};

const iconMap: Record<string, JSX.Element> = { Shield: <Shield className="w-5 h-5" />, CheckCircle: <CheckCircle className="w-5 h-5" />, RefreshCcw: <RefreshCcw className="w-5 h-5" />, XCircle: <XCircle className="w-5 h-5" />, Clock: <Clock className="w-5 h-5" />, CreditCard: <CreditCard className="w-5 h-5" />, AlertTriangle: <AlertTriangle className="w-5 h-5" />, Mail: <Mail className="w-5 h-5" /> };

export const RefundPolicy = (): JSX.Element => {
  const { i18n } = useTranslation();
  const [, navigate] = useLocation();
  const { isDark } = useTheme();
  const lang = i18n.language === "ar" ? "ar" : "en";
  const isRTL = lang === "ar";
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const c = lang === "ar" ? ar : en;
  const [openToc, setOpenToc] = useState(false);

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gradient-to-b from-red-50 to-white"}`} dir={isRTL ? "rtl" : "ltr"}>
      <header className="bg-gradient-to-r from-red-600 to-rose-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.length > 1 ? window.history.back() : navigate("/")} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><BackArrow className="w-5 h-5" /></button>
            <div className="flex items-center gap-2"><CreditCard className="w-6 h-6" /><h1 className="text-xl md:text-2xl font-bold">{c.title}</h1></div>
          </div>
          <LanguageSelector />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className={`px-6 md:px-8 py-5 ${isDark ? "border-b border-gray-700" : "bg-red-50 border-b border-red-100"}`}>
            <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Classify — {c.subtitle}</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{lang === "ar" ? "آخر تحديث" : "Last Updated"}: {c.lastUpdated}</p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{c.version}</p>
            </div>
          </div>
          <div className="px-6 md:px-8 py-6"><p className={`leading-relaxed ${isDark ? "text-gray-300" : "text-gray-600"}`}>{c.intro}</p></div>
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden mb-6 ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <button onClick={() => setOpenToc(!openToc)} className={`w-full px-6 md:px-8 py-4 flex items-center justify-between transition-colors`}>
            <h2 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{lang === "ar" ? "📑 جدول المحتويات" : "📑 Table of Contents"}</h2>
            <ChevronDown className={`w-5 h-5 transition-transform ${openToc ? "rotate-180" : ""}`} />
          </button>
          {openToc && (<div className={`px-6 md:px-8 pb-5 border-t ${isDark ? "border-gray-700" : "border-gray-100"}`}><ol className="pt-3 space-y-1.5">{c.sections.map((s, i) => (<li key={s.id}><a href={`#${s.id}`} className={`text-sm hover:underline ${isDark ? "text-red-400" : "text-red-600"}`}>{i + 1}. {s.title}</a></li>))}</ol></div>)}
        </div>
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? "bg-gray-800" : "bg-white"}`}>
          <div className="px-6 md:px-8 py-6 space-y-8">
            {c.sections.map((section, idx) => (
              <section key={section.id} id={section.id}>
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isDark ? "bg-red-900/30 text-red-400" : "bg-red-100 text-red-600"}`}>{iconMap[section.icon] || <Shield className="w-5 h-5" />}</div>
                  <h2 className={`text-lg md:text-xl font-bold pt-0.5 ${isDark ? "text-white" : "text-gray-900"}`}>{idx + 1}. {section.title}</h2>
                </div>
                <div className={`${isRTL ? "pr-12" : "pl-12"}`}>
                  {section.paragraphs.map((p, pi) => (<p key={pi} className={`leading-relaxed mb-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}>{p}</p>))}
                  {section.items && (<ul className="space-y-2 mb-4">{section.items.map((item, i) => (<li key={i} className={`flex items-start gap-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}><span className="text-red-500 mt-1.5 shrink-0">•</span><span className="leading-relaxed">{item}</span></li>))}</ul>)}
                </div>
                {idx < c.sections.length - 1 && <div className={`mt-6 border-b ${isDark ? "border-gray-700" : "border-gray-100"}`} />}
              </section>
            ))}
          </div>
        </div>
        <div className="text-center py-6"><p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>© {new Date().getFullYear()} Classify by Proomnes.</p></div>
      </main>
    </div>
  );
};
