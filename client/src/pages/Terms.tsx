import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { LanguageSelector } from "@/components/LanguageSelector";

const STATIC_TERMS = `
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">1. Acceptance of Terms</h3>
  <p class="mb-4">By downloading and using Classify, you agree to these Terms of Service. If you do not agree with any part of these terms, please do not use the App.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">2. User Responsibilities</h3>
  <ul class="list-disc pl-6 space-y-2">
    <li>You are responsible for maintaining account security</li>
    <li>You must not use the App for illegal purposes</li>
    <li>You must be at least 18 years old or have parental consent</li>
    <li>You agree not to transmit harmful or offensive content</li>
  </ul>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">3. Parental Control Features</h3>
  <p class="mb-4">Classify provides tools for parental supervision and control. Parents are responsible for setting appropriate restrictions and monitoring their children's usage. The App is designed to support, not replace, responsible parenting.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">4. Intellectual Property</h3>
  <p class="mb-4">All content, features, and functionality of the App are owned by Classify, its licensors, and other providers of such material. You may not reproduce, distribute, or transmit any content without our permission.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">5. Limitation of Liability</h3>
  <p class="mb-4">The App is provided "as is" without warranties. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the App.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">6. Termination</h3>
  <p class="mb-4">We may terminate your account and access to the App at any time, for any reason, without notice or liability.</p>
</section>
<section class="mb-8">
  <h3 class="text-2xl font-bold mb-4">7. Changes to Terms</h3>
  <p class="mb-4">We may update these terms at any time. Continued use of the App constitutes acceptance of updated terms.</p>
</section>
`;

export const Terms = (): JSX.Element => {
  const [, navigate] = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [content, setContent] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/legal/terms")
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data?.content) {
          setContent(json.data.content);
          setUpdatedAt(json.data.updatedAt || "");
        } else {
          setContent(STATIC_TERMS);
        }
      })
      .catch(() => setContent(STATIC_TERMS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={isDark ? "bg-gray-900 text-white" : "bg-white text-black"}>
      <header className={`${isDark ? "bg-gray-800" : "bg-blue-500 text-white"} p-4`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              navigate("/settings");
            }
          }} className="text-2xl">←</button>
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <button onClick={toggleTheme} className="text-2xl">
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-8">
        <div className={`${isDark ? "bg-gray-800" : "bg-gray-50"} rounded-lg p-8`}>
          <h2 className="text-3xl font-bold mb-6">Terms of Service</h2>
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
