import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

const STATIC_PRIVACY = `
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">1. Introduction</h3>
  <p class="mb-4">Classify ("App", "we", "our") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">2. Information We Collect</h3>
  <ul class="list-disc pl-6 space-y-2">
    <li>Account information (email, password, name)</li>
    <li>Child information (name, age, activity data)</li>
    <li>Device information and usage analytics</li>
    <li>Shipping addresses for product delivery</li>
    <li>In-app activity and task completion data</li>
  </ul>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">3. How We Use Your Data</h3>
  <ul class="list-disc pl-6 space-y-2">
    <li>To provide and maintain the Service</li>
    <li>To process parental controls and child activities</li>
    <li>To send notifications and updates</li>
    <li>To comply with legal obligations</li>
    <li>To improve and optimize the App</li>
  </ul>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">4. Child Safety &amp; COPPA Compliance</h3>
  <p class="mb-4">Classify complies with the Children's Online Privacy Protection Act (COPPA) and similar regulations worldwide. We collect child information only with verifiable parental consent. Parents control all child data and can request deletion at any time.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">5. Data Security</h3>
  <p class="mb-4">We implement industry-standard security measures including encryption, secure authentication, and regular security audits to protect your personal information.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">6. Your Rights</h3>
  <ul class="list-disc pl-6 space-y-2">
    <li>Right to access your personal data</li>
    <li>Right to correct inaccurate data</li>
    <li>Right to delete your account and data</li>
    <li>Right to data portability</li>
    <li>Right to withdraw consent</li>
  </ul>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">7. Contact Us</h3>
  <p>For privacy inquiries, please contact us at: privacy@classify-app.com</p>
</section>
`;

export const Privacy = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/legal/privacy")
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.content) {
          setContent(json.data.content);
          setUpdatedAt(json.data.updatedAt || "");
        } else {
          setContent(STATIC_PRIVACY);
        }
      })
      .catch(() => setContent(STATIC_PRIVACY))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={isDark ? "bg-gray-900 text-white" : "bg-white text-black"}>
      <header className={`${isDark ? "bg-gray-800" : "bg-blue-500 text-white"} p-4`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => navigate("/")} className="text-2xl">←</button>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <button onClick={toggleTheme} className="text-2xl">
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-8">
        <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} rounded-lg p-8`}>
          <h2 className="text-3xl font-bold mb-6">Privacy Policy</h2>
          <p className="text-sm text-gray-500 mb-8">
            Last Updated: {updatedAt ? new Date(updatedAt).toLocaleDateString() : new Date().toLocaleDateString()}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
      </main>
    </div>
  );
};
