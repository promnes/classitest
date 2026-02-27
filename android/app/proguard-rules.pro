# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ===== Capacitor / WebView Bridge =====
# Keep the JavaScript interface classes used by Capacitor
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# Keep Capacitor bridge
-keepclassmembers class com.getcapacitor.Bridge {
    public *;
}

# Keep push notification plugin
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }

# ===== AndroidX =====
-keep class androidx.core.app.** { *; }
-keep class androidx.core.content.** { *; }

# ===== Preserve line numbers for debugging =====
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ===== Don't warn about missing classes =====
-dontwarn com.google.android.gms.**
-dontwarn com.google.firebase.**
