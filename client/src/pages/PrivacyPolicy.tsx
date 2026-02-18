import React from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";

export const PrivacyPolicy = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <header className="bg-gradient-to-r from-blue-700 to-blue-800 text-white p-4 md:p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold">سياسة الخصوصية</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  navigate("/settings");
                }
              }}
              className="px-4 py-2 bg-white text-blue-700 font-bold rounded-lg hover:bg-gray-100"
            >
              ← العودة
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 mt-8">
        <article className={`${isDark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"} rounded-lg p-8 shadow-lg`}>
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">مقدمة</h2>
            <p>نلتزم بحماية خصوصيتك. تشرح هذه السياسة كيفية جمع بياناتك واستخدامها وحمايتها عند استخدام التطبيق.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">1. المعلومات التي نجمعها</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف.</li>
              <li>بيانات الأطفال المرتبطة: الاسم والأنشطة داخل التطبيق.</li>
              <li>بيانات الدفع والفواتير عند استخدام خدمات المتجر.</li>
              <li>بيانات الاستخدام والجهاز وتفضيلات التطبيق.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">2. كيفية استخدام المعلومات</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>تقديم الخدمة وتحسين تجربة الاستخدام.</li>
              <li>المصادقة والأمان وحماية الحساب.</li>
              <li>معالجة المدفوعات والطلبات.</li>
              <li>التواصل بشأن التحديثات والميزات الجديدة.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">3. حماية البيانات</h2>
            <p className="mb-4">نستخدم تشفير SSL/TLS وأفضل الممارسات الأمنية لحماية بيانات المستخدمين أثناء النقل والتخزين.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">4. مشاركة البيانات</h2>
            <p className="mb-4">لا نشارك بيانات المستخدمين مع أطراف ثالثة إلا عند الضرورة القانونية.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">5. حقوق المستخدم</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>الاطلاع على بياناتك وتصحيحها.</li>
              <li>طلب حذف الحساب وجميع البيانات المرتبطة به.</li>
              <li>سحب الموافقة على معالجة البيانات حيثما ينطبق ذلك.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">6. حذف الحساب</h2>
            <p className="mb-4">يمكنك حذف حسابك من داخل صفحة الإعدادات. سيتم حذف البيانات المرتبطة بالحساب نهائياً.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">7. التحديثات</h2>
            <p className="mb-4">قد نحدث هذه السياسة من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">8. التواصل</h2>
            <p className="mb-4">للاستفسارات حول الخصوصية، يرجى التواصل عبر البريد الإلكتروني: support@classify.app</p>
          </section>
        </article>
      </main>
    </div>
  );
};
