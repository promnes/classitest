import { Router, Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

const router = Router();

// Session storage for authenticated admins
const adminSessions = new Map<string, { expires: number; ip: string }>();
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;
const MAX_LOGIN_ATTEMPTS = 5;

// Allowed environment keys that can be modified
// Organized by category for different deployment environments
const ALLOWED_ENV_KEYS = [
  // === Core Application Settings ===
  "APP_NAME",
  "APP_URL",
  "NODE_ENV",
  "PORT",
  "HOST",
  "API_VERSION",
  
  // === Database Configuration ===
  "DATABASE_URL",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "POSTGRES_HOST",
  "POSTGRES_PORT",
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
  "DB_SSL",
  "DB_POOL_MIN",
  "DB_POOL_MAX",
  
  // === Authentication & Security ===
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "SESSION_SECRET",
  "SESSION_TIMEOUT",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "BCRYPT_ROUNDS",
  "OTP_EXPIRY_MINUTES",
  "MAX_LOGIN_ATTEMPTS",
  
  // === CORS & Origins ===
  "ALLOWED_ORIGINS",
  "CORS_CREDENTIALS",
  "TRUSTED_PROXIES",
  
  // === Server Configuration ===
  "LOG_LEVEL",
  "MAX_UPLOAD_SIZE",
  "REQUEST_TIMEOUT",
  "RATE_LIMIT_WINDOW",
  "RATE_LIMIT_MAX",
  "BODY_LIMIT",
  
  // === SSL/HTTPS Configuration ===
  "SSL_ENABLED",
  "SSL_KEY_PATH",
  "SSL_CERT_PATH",
  "SSL_CA_PATH",
  "FORCE_HTTPS",
  
  // === Docker Specific ===
  "DOCKER_ENV",
  "CONTAINER_NAME",
  "NETWORK_MODE",
  "RESTART_POLICY",
  "HEALTHCHECK_INTERVAL",
  "DOCKER_VOLUME_PATH",
  
  // === VPS/Hostinger Specific ===
  "VPS_IP",
  "VPS_USER",
  "VPS_SSH_PORT",
  "DOMAIN_NAME",
  "SUBDOMAIN",
  "NGINX_ENABLED",
  "PM2_INSTANCES",
  "PM2_EXEC_MODE",
  "PM2_MAX_MEMORY",
  
  // === Local Development ===
  "DEV_MODE",
  "HOT_RELOAD",
  "DEBUG",
  "VITE_DEV_PORT",
  "MOCK_DATA",
  "SEED_DATABASE",
  
  // === Email Configuration ===
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "SMTP_SECURE",
  "EMAIL_ENABLED",
  
  // === File Storage ===
  "UPLOAD_DIR",
  "STATIC_DIR",
  "MAX_FILE_SIZE",
  "ALLOWED_FILE_TYPES",
  "STORAGE_TYPE",
  "S3_BUCKET",
  "S3_REGION",
  "S3_ACCESS_KEY",
  "S3_SECRET_KEY",
  
  // === Caching & Performance ===
  "REDIS_URL",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "CACHE_ENABLED",
  "CACHE_TTL",
  
  // === Monitoring & Logging ===
  "SENTRY_DSN",
  "LOG_FORMAT",
  "LOG_FILE_PATH",
  "AUDIT_LOG_ENABLED",
  "METRICS_ENABLED",
  
  // === Mobile App Configuration ===
  "MOBILE_API_KEY",
  "PUSH_NOTIFICATIONS_ENABLED",
  "FCM_SERVER_KEY",
  "APNS_KEY_ID",
  "APNS_TEAM_ID",
  
  // === Payment Integration ===
  "PAYMENT_ENABLED",
  "PAYMENT_GATEWAY",
  "PAYMENT_API_KEY",
  "PAYMENT_SECRET",
  "PAYMENT_WEBHOOK_SECRET",
  
  // === Feature Flags ===
  "FEATURE_REGISTRATION",
  "FEATURE_2FA",
  "FEATURE_FLASH_GAMES",
  "FEATURE_STORE",
  "MAINTENANCE_MODE",
  
  // === Backup & Recovery ===
  "BACKUP_ENABLED",
  "BACKUP_SCHEDULE",
  "BACKUP_RETENTION_DAYS",
  "BACKUP_PATH",
  "AUTO_BACKUP"
];

// Audit log function
const auditLog = (action: string, ip: string, details: string) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [ADMIN-AUDIT] IP: ${ip} | Action: ${action} | ${details}`;
  console.log(logEntry);
  
  try {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(path.join(logDir, "admin-audit.log"), logEntry + "\n");
  } catch (e) {
    console.error("Failed to write audit log:", e);
  }
};

// Rate limiting middleware
const rateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (record.count >= MAX_REQUESTS) {
    auditLog("RATE_LIMITED", ip, "Too many requests");
    return res.status(429).json({ 
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }
  
  record.count++;
  next();
};

// Session validation middleware
const validateSession = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const sessionToken = req.headers["x-admin-session"] as string;

  if (!sessionToken) {
    return res.status(401).json({ 
      message: "Session required. Please login first.",
      loginUrl: "/admin/env/login"
    });
  }

  const session = adminSessions.get(sessionToken);
  if (!session || Date.now() > session.expires) {
    adminSessions.delete(sessionToken);
    return res.status(401).json({ 
      message: "Session expired. Please login again.",
      loginUrl: "/admin/env/login"
    });
  }

  // Extend session on activity
  session.expires = Date.now() + SESSION_DURATION;
  
  auditLog("SESSION_VALID", ip, "Session validated");
  next();
};

// HTTPS enforcement in production
const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === "production") {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    if (proto !== "https") {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      auditLog("SECURITY_WARNING", ip, "Attempted access over non-HTTPS");
      return res.status(403).json({
        message: "Admin panel requires HTTPS in production"
      });
    }
  }
  next();
};

// Apply rate limiting to all routes
router.use(rateLimit);
router.use(enforceHttps);

// Login endpoint - creates a session
router.post("/login", async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const { password } = req.body;
  const envPassword = process.env.ADMIN_PANEL_PASSWORD;

  // Check if admin panel is configured
  if (!envPassword) {
    auditLog("LOGIN_FAILED", ip, "ADMIN_PANEL_PASSWORD not configured");
    return res.status(503).json({ 
      success: false,
      message: "Admin panel is not configured. Set ADMIN_PANEL_PASSWORD in environment."
    });
  }

  // Check password
  if (!password || password !== envPassword) {
    auditLog("LOGIN_FAILED", ip, "Invalid password attempt");
    return res.status(401).json({ 
      success: false,
      message: "Invalid password"
    });
  }

  // Create session token
  const sessionToken = crypto.randomBytes(32).toString("hex");
  adminSessions.set(sessionToken, {
    expires: Date.now() + SESSION_DURATION,
    ip
  });

  auditLog("LOGIN_SUCCESS", ip, "Admin logged in successfully");
  
  res.json({ 
    success: true,
    sessionToken,
    expiresIn: SESSION_DURATION / 1000
  });
});

// Logout endpoint
router.post("/logout", validateSession, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const sessionToken = req.headers["x-admin-session"] as string;
  
  adminSessions.delete(sessionToken);
  auditLog("LOGOUT", ip, "Admin logged out");
  
  res.json({ success: true, message: "Logged out successfully" });
});

// Get current .env values (with sensitive data hidden)
router.get("/", validateSession, async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  try {
    const envPath = path.join(process.cwd(), ".env");
    
    // Read current env values (hide sensitive ones)
    const currentEnv: Record<string, string> = {};
    ALLOWED_ENV_KEYS.forEach(key => {
      const value = process.env[key] || "";
      if (["JWT_SECRET", "SESSION_SECRET", "ADMIN_PASSWORD", "POSTGRES_PASSWORD", "ADMIN_PANEL_PASSWORD"].includes(key)) {
        currentEnv[key] = value ? "[CONFIGURED]" : "";
      } else {
        currentEnv[key] = value;
      }
    });

    auditLog("ENV_READ", ip, "Fetched environment configuration");
    
    res.json({
      success: true,
      env: currentEnv,
      fileExists: fs.existsSync(envPath),
      allowedKeys: ALLOWED_ENV_KEYS
    });
  } catch (error: any) {
    auditLog("ENV_READ_ERROR", ip, error.message);
    res.status(500).json({ success: false, message: "Failed to read configuration" });
  }
});

// Update .env values with validation
router.post("/", validateSession, async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  try {
    const envPath = path.join(process.cwd(), ".env");
    const updates = req.body;

    // Validate all keys are allowed
    const invalidKeys = Object.keys(updates).filter(key => !ALLOWED_ENV_KEYS.includes(key));
    if (invalidKeys.length > 0) {
      auditLog("ENV_UPDATE_REJECTED", ip, `Invalid keys: ${invalidKeys.join(", ")}`);
      return res.status(400).json({ 
        success: false, 
        message: "Invalid configuration keys",
        invalidKeys 
      });
    }

    // Validate values (no injection attacks)
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid value type for ${key}` 
        });
      }
      if (value.includes("\n") || value.includes("\r")) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid characters in value for ${key}` 
        });
      }
    }

    // Read existing .env file and preserve structure
    let envContent = "";
    const envMap = new Map<string, string>();
    const preservedLines: string[] = [];
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
      const lines = envContent.split("\n");
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          preservedLines.push(line);
        } else {
          const eqIndex = line.indexOf("=");
          if (eqIndex > 0) {
            const key = line.substring(0, eqIndex).trim();
            const value = line.substring(eqIndex + 1).trim();
            envMap.set(key, value);
          }
        }
      });
    }

    // Update with new values
    const updatedKeys: string[] = [];
    Object.entries(updates).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        envMap.set(key, value);
        process.env[key] = value;
        updatedKeys.push(key);
      }
    });

    // Rebuild .env content
    let newEnvContent = `# Classify Environment Configuration\n`;
    newEnvContent += `# Last updated: ${new Date().toISOString()}\n`;
    newEnvContent += `# Updated by admin from IP: ${ip}\n\n`;
    
    envMap.forEach((value, key) => {
      newEnvContent += `${key}=${value}\n`;
    });

    // Write to file
    fs.writeFileSync(envPath, newEnvContent);

    auditLog("ENV_UPDATED", ip, `Updated keys: ${updatedKeys.join(", ")}`);

    res.json({ 
      success: true, 
      message: "Environment updated successfully",
      updatedKeys,
      note: "Some changes may require server restart to take full effect"
    });
  } catch (error: any) {
    auditLog("ENV_UPDATE_ERROR", ip, error.message);
    res.status(500).json({ success: false, message: "Failed to update configuration" });
  }
});

// Login page
router.get("/login", (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Classify Admin - تسجيل الدخول</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .login-box {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      width: 100%;
      max-width: 400px;
    }
    h1 { text-align: center; color: #2d3748; margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; font-weight: 600; margin-bottom: 8px; color: #2d3748; }
    input {
      width: 100%;
      padding: 14px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 16px;
      color: #1a202c;
      background-color: #ffffff;
    }
    input::placeholder {
      color: #a0aec0;
    }
    input:focus { 
      outline: none; 
      border-color: #667eea;
      color: #1a202c;
    }
    .btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:hover { opacity: 0.9; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #e53e3e; text-align: center; margin-top: 15px; }
    .security-note {
      margin-top: 20px;
      padding: 12px;
      background: #fef3c7;
      border-radius: 8px;
      font-size: 13px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="login-box">
    <h1>لوحة تحكم Classify</h1>
    <form id="loginForm">
      <div class="form-group">
        <label>كلمة مرور لوحة التحكم</label>
        <input type="password" id="password" required autofocus 
               data-testid="input-admin-password" placeholder="أدخل كلمة المرور">
      </div>
      <button type="submit" class="btn" id="loginBtn" data-testid="button-admin-login">
        تسجيل الدخول
      </button>
      <p class="error" id="error"></p>
    </form>
    <div class="security-note">
      هذه لوحة تحكم محمية. جميع محاولات الدخول مسجلة.
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const error = document.getElementById('error');
      const password = document.getElementById('password').value;
      
      btn.disabled = true;
      btn.textContent = 'جاري التحقق...';
      error.textContent = '';
      
      try {
        const res = await fetch('/admin/env/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        
        if (data.success) {
          sessionStorage.setItem('adminSession', data.sessionToken);
          window.location.href = '/admin/env/dashboard';
        } else {
          error.textContent = data.message || 'فشل تسجيل الدخول';
        }
      } catch (e) {
        error.textContent = 'خطأ في الاتصال';
      } finally {
        btn.disabled = false;
        btn.textContent = 'تسجيل الدخول';
      }
    });
  </script>
</body>
</html>
  `);
});

// Dashboard page (requires session)
router.get("/dashboard", (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Classify - لوحة تحكم الإعدادات</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%);
      color: white;
      padding: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 24px; }
    .logout-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
    }
    .logout-btn:hover { background: rgba(255,255,255,0.3); }
    .content { padding: 25px; }
    .form-group { margin-bottom: 18px; }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #2d3748;
      font-size: 14px;
    }
    input, select {
      width: 100%;
      padding: 10px 14px;
      border: 2px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      color: #1a202c;
      background-color: #ffffff;
    }
    input::placeholder {
      color: #a0aec0;
    }
    input:focus, select:focus { 
      outline: none; 
      border-color: #667eea;
      color: #1a202c;
    }
    .hint { font-size: 12px; color: #718096; margin-top: 4px; }
    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      width: 100%;
    }
    .btn:hover { opacity: 0.95; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert {
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 15px;
      font-size: 13px;
    }
    .alert-success { background: #c6f6d5; color: #22543d; }
    .alert-error { background: #fed7d7; color: #742a2a; }
    .alert-warning { background: #fefcbf; color: #744210; }
    .section-title {
      font-size: 16px;
      color: #2d3748;
      margin: 25px 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
    .loading {
      text-align: center;
      padding: 40px;
      color: #718096;
    }
    .admin-tools {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 25px;
    }
    .tool-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 16px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      color: white;
    }
    .tool-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
    .tool-btn .icon { font-size: 18px; }
    .tool-btn.health { background: linear-gradient(135deg, #48bb78, #38a169); }
    .tool-btn.logs { background: linear-gradient(135deg, #4299e1, #3182ce); }
    .tool-btn.db { background: linear-gradient(135deg, #ed8936, #dd6b20); }
    .tool-btn.system { background: linear-gradient(135deg, #9f7aea, #805ad5); }
    .tool-btn.backup { background: linear-gradient(135deg, #38b2ac, #319795); }
    .tool-btn.restore { background: linear-gradient(135deg, #667eea, #5a67d8); }
    .tool-btn.restart { background: linear-gradient(135deg, #fc8181, #f56565); }
    .tool-result {
      background: #1a202c;
      color: #68d391;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .tool-result.error { color: #fc8181; }
    .tool-result .close-btn {
      float: left;
      background: #4a5568;
      color: white;
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 10px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin: 25px 0 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .section-title-text {
      font-size: 16px;
      color: #2d3748;
      flex: 1;
    }
    .toggle-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
      min-width: 100px;
    }
    .toggle-btn:hover { 
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .toggle-btn.disabled {
      background: linear-gradient(135deg, #cbd5e0 0%, #a0aec0 100%);
      color: #4a5568;
    }
    .section-content {
      display: block;
      transition: all 0.3s ease;
    }
    .section-content.hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>لوحة تحكم الإعدادات</h1>
      <button class="logout-btn" onclick="logout()" data-testid="button-logout">تسجيل الخروج</button>
    </div>
    <div class="content">
      <div id="loading" class="loading">جاري التحميل...</div>
      <div id="main" style="display:none;">
        <div id="alert"></div>
        <div class="alert alert-warning">
          تحذير: بعض التغييرات قد تتطلب إعادة تشغيل السيرفر
        </div>

        <h3 class="section-title">أدوات الإدارة</h3>
        <div class="admin-tools">
          <button type="button" class="tool-btn health" onclick="checkHealth()" data-testid="button-health">
            <span class="icon">💚</span> فحص صحة السيرفر
          </button>
          <button type="button" class="tool-btn logs" onclick="viewLogs()" data-testid="button-logs">
            <span class="icon">📋</span> سجلات السيرفر
          </button>
          <button type="button" class="tool-btn db" onclick="testDatabase()" data-testid="button-db-test">
            <span class="icon">🗄️</span> فحص قاعدة البيانات
          </button>
          <button type="button" class="tool-btn system" onclick="systemInfo()" data-testid="button-system">
            <span class="icon">💻</span> معلومات النظام
          </button>
          <button type="button" class="tool-btn backup" onclick="backupEnv()" data-testid="button-backup">
            <span class="icon">💾</span> نسخ احتياطي .env
          </button>
          <button type="button" class="tool-btn restore" onclick="restoreEnv()" data-testid="button-restore">
            <span class="icon">🔄</span> استعادة .env
          </button>
          <button type="button" class="tool-btn restart" onclick="restartServer()" data-testid="button-restart">
            <span class="icon">🔁</span> إعادة تشغيل السيرفر
          </button>
        </div>

        <div id="toolResult" class="tool-result" style="display:none;"></div>
        
        <form id="envForm">
          <!-- إعدادات التطبيق الأساسية -->
          <div class="section-header" data-section="app-core">
            <h3 class="section-title-text">⚙️ إعدادات التطبيق الأساسية</h3>
            <button type="button" class="toggle-btn" id="toggle-app-core" onclick="toggleSection('app-core')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-app-core">
          <div class="grid">
            <div class="form-group">
              <label>APP_NAME</label>
              <input type="text" name="APP_NAME" placeholder="Classify" data-testid="input-app-name">
              <p class="hint">اسم التطبيق</p>
            </div>
            <div class="form-group">
              <label>APP_URL</label>
              <input type="url" name="APP_URL" placeholder="https://yourapp.com" data-testid="input-app-url">
              <p class="hint">رابط التطبيق الكامل</p>
            </div>
            <div class="form-group">
              <label>NODE_ENV</label>
              <select name="NODE_ENV" data-testid="select-node-env">
                <option value="">-- اختر البيئة --</option>
                <option value="development">development (تطوير)</option>
                <option value="production">production (إنتاج)</option>
                <option value="staging">staging (اختبار)</option>
              </select>
            </div>
            <div class="form-group">
              <label>PORT</label>
              <input type="number" name="PORT" placeholder="5000" data-testid="input-port">
              <p class="hint">منفذ السيرفر</p>
            </div>
            <div class="form-group">
              <label>HOST</label>
              <input type="text" name="HOST" placeholder="0.0.0.0" data-testid="input-host">
              <p class="hint">عنوان الاستماع</p>
            </div>
            <div class="form-group">
              <label>API_VERSION</label>
              <input type="text" name="API_VERSION" placeholder="v1" data-testid="input-api-version">
            </div>
          </div>

          </div>
          <!-- قاعدة البيانات -->
          <div class="section-header" data-section="database">
            <h3 class="section-title-text">🗄️ قاعدة البيانات</h3>
            <button type="button" class="toggle-btn" id="toggle-database" onclick="toggleSection('database')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-database">
          <div class="form-group">
            <label>DATABASE_URL</label>
            <input type="text" name="DATABASE_URL" placeholder="postgresql://user:pass@host:5432/db" data-testid="input-database-url">
            <p class="hint">رابط الاتصال الكامل بقاعدة البيانات</p>
          </div>
          <div class="grid">
            <div class="form-group">
              <label>POSTGRES_HOST / PGHOST</label>
              <input type="text" name="PGHOST" placeholder="localhost" data-testid="input-pg-host">
            </div>
            <div class="form-group">
              <label>POSTGRES_PORT / PGPORT</label>
              <input type="number" name="PGPORT" placeholder="5432" data-testid="input-pg-port">
            </div>
            <div class="form-group">
              <label>POSTGRES_USER / PGUSER</label>
              <input type="text" name="PGUSER" placeholder="postgres" data-testid="input-pg-user">
            </div>
            <div class="form-group">
              <label>POSTGRES_PASSWORD / PGPASSWORD</label>
              <input type="password" name="PGPASSWORD" placeholder="كلمة المرور" data-testid="input-pg-password">
            </div>
            <div class="form-group">
              <label>POSTGRES_DB / PGDATABASE</label>
              <input type="text" name="PGDATABASE" placeholder="classify" data-testid="input-pg-database">
            </div>
            <div class="form-group">
              <label>DB_SSL</label>
              <select name="DB_SSL" data-testid="select-db-ssl">
                <option value="">-- اختياري --</option>
                <option value="true">true (مفعل)</option>
                <option value="false">false (معطل)</option>
                <option value="require">require</option>
              </select>
            </div>
            <div class="form-group">
              <label>DB_POOL_MIN</label>
              <input type="number" name="DB_POOL_MIN" placeholder="2" data-testid="input-db-pool-min">
            </div>
            <div class="form-group">
              <label>DB_POOL_MAX</label>
              <input type="number" name="DB_POOL_MAX" placeholder="10" data-testid="input-db-pool-max">
            </div>
          </div>

          </div>
          <!-- الأمان والتوثيق -->
          <div class="section-header" data-section="security">
            <h3 class="section-title-text">🔐 الأمان والتوثيق</h3>
            <button type="button" class="toggle-btn" id="toggle-security" onclick="toggleSection('security')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-security">
          <div class="grid">
            <div class="form-group">
              <label>JWT_SECRET</label>
              <input type="password" name="JWT_SECRET" placeholder="اتركه فارغاً إذا لم ترد تغييره" data-testid="input-jwt-secret">
              <p class="hint">مفتاح تشفير JWT (64 حرف على الأقل)</p>
            </div>
            <div class="form-group">
              <label>JWT_EXPIRES_IN</label>
              <input type="text" name="JWT_EXPIRES_IN" placeholder="30d" data-testid="input-jwt-expires">
              <p class="hint">مدة صلاحية التوكن (7d, 30d, 1y)</p>
            </div>
            <div class="form-group">
              <label>SESSION_SECRET</label>
              <input type="password" name="SESSION_SECRET" placeholder="مفتاح الجلسات" data-testid="input-session-secret">
            </div>
            <div class="form-group">
              <label>SESSION_TIMEOUT</label>
              <input type="number" name="SESSION_TIMEOUT" placeholder="3600" data-testid="input-session-timeout">
              <p class="hint">بالثواني (3600 = ساعة)</p>
            </div>
            <div class="form-group">
              <label>BCRYPT_ROUNDS</label>
              <input type="number" name="BCRYPT_ROUNDS" placeholder="10" data-testid="input-bcrypt-rounds">
            </div>
            <div class="form-group">
              <label>OTP_EXPIRY_MINUTES</label>
              <input type="number" name="OTP_EXPIRY_MINUTES" placeholder="5" data-testid="input-otp-expiry">
            </div>
            <div class="form-group">
              <label>ADMIN_EMAIL</label>
              <input type="email" name="ADMIN_EMAIL" placeholder="admin@example.com" data-testid="input-admin-email">
            </div>
            <div class="form-group">
              <label>ADMIN_PASSWORD</label>
              <input type="password" name="ADMIN_PASSWORD" placeholder="اتركه فارغاً إذا لم ترد تغييره" data-testid="input-admin-password-field">
            </div>
          </div>

          <!-- CORS والأصول -->
          <div class="section-header" data-section="cors">
            <h3 class="section-title-text">🌐 CORS والأصول المسموحة</h3>
            <button type="button" class="toggle-btn" id="toggle-cors" onclick="toggleSection('cors')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-cors">
          <div class="form-group">
            <label>ALLOWED_ORIGINS</label>
            <input type="text" name="ALLOWED_ORIGINS" placeholder="https://app.com,https://admin.app.com" data-testid="input-allowed-origins">
            <p class="hint">الأصول المسموحة مفصولة بفاصلة</p>
          </div>
          <div class="grid">
            <div class="form-group">
              <label>CORS_CREDENTIALS</label>
              <select name="CORS_CREDENTIALS" data-testid="select-cors-credentials">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>TRUSTED_PROXIES</label>
              <input type="text" name="TRUSTED_PROXIES" placeholder="127.0.0.1,nginx" data-testid="input-trusted-proxies">
            </div>
          </div>

          <!-- إعدادات السيرفر -->
          <div class="section-header" data-section="server">
            <h3 class="section-title-text">🖥️ إعدادات السيرفر</h3>
            <button type="button" class="toggle-btn" id="toggle-server" onclick="toggleSection('server')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-server">
          <div class="grid">
            <div class="form-group">
              <label>LOG_LEVEL</label>
              <select name="LOG_LEVEL" data-testid="select-log-level">
                <option value="">-- اختياري --</option>
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warn">warn</option>
                <option value="error">error</option>
              </select>
            </div>
            <div class="form-group">
              <label>MAX_UPLOAD_SIZE</label>
              <input type="text" name="MAX_UPLOAD_SIZE" placeholder="10mb" data-testid="input-max-upload">
            </div>
            <div class="form-group">
              <label>REQUEST_TIMEOUT</label>
              <input type="number" name="REQUEST_TIMEOUT" placeholder="30000" data-testid="input-request-timeout">
              <p class="hint">بالميلي ثانية</p>
            </div>
            <div class="form-group">
              <label>RATE_LIMIT_MAX</label>
              <input type="number" name="RATE_LIMIT_MAX" placeholder="100" data-testid="input-rate-limit">
            </div>
          </div>

          <!-- SSL/HTTPS -->
          <div class="section-header" data-section="ssl">
            <h3 class="section-title-text">🔒 SSL/HTTPS</h3>
            <button type="button" class="toggle-btn" id="toggle-ssl" onclick="toggleSection('ssl')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-ssl">
          <div class="grid">
            <div class="form-group">
              <label>SSL_ENABLED</label>
              <select name="SSL_ENABLED" data-testid="select-ssl-enabled">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>FORCE_HTTPS</label>
              <select name="FORCE_HTTPS" data-testid="select-force-https">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>SSL_KEY_PATH</label>
              <input type="text" name="SSL_KEY_PATH" placeholder="/etc/ssl/private/key.pem" data-testid="input-ssl-key">
            </div>
            <div class="form-group">
              <label>SSL_CERT_PATH</label>
              <input type="text" name="SSL_CERT_PATH" placeholder="/etc/ssl/certs/cert.pem" data-testid="input-ssl-cert">
            </div>
          </div>

          <!-- Docker -->
          <div class="section-header" data-section="docker">
            <h3 class="section-title-text">🐳 إعدادات Docker</h3>
            <button type="button" class="toggle-btn" id="toggle-docker" onclick="toggleSection('docker')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-docker">
          <div class="grid">
            <div class="form-group">
              <label>DOCKER_ENV</label>
              <select name="DOCKER_ENV" data-testid="select-docker-env">
                <option value="">-- اختياري --</option>
                <option value="true">true (داخل Docker)</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>CONTAINER_NAME</label>
              <input type="text" name="CONTAINER_NAME" placeholder="classify-app" data-testid="input-container-name">
            </div>
            <div class="form-group">
              <label>NETWORK_MODE</label>
              <select name="NETWORK_MODE" data-testid="select-network-mode">
                <option value="">-- اختياري --</option>
                <option value="bridge">bridge</option>
                <option value="host">host</option>
                <option value="none">none</option>
              </select>
            </div>
            <div class="form-group">
              <label>RESTART_POLICY</label>
              <select name="RESTART_POLICY" data-testid="select-restart-policy">
                <option value="">-- اختياري --</option>
                <option value="no">no</option>
                <option value="always">always</option>
                <option value="on-failure">on-failure</option>
                <option value="unless-stopped">unless-stopped</option>
              </select>
            </div>
            <div class="form-group">
              <label>HEALTHCHECK_INTERVAL</label>
              <input type="text" name="HEALTHCHECK_INTERVAL" placeholder="30s" data-testid="input-healthcheck">
            </div>
            <div class="form-group">
              <label>DOCKER_VOLUME_PATH</label>
              <input type="text" name="DOCKER_VOLUME_PATH" placeholder="/app/data" data-testid="input-docker-volume">
            </div>
          </div>

          <!-- VPS/Hostinger -->
          <div class="section-header" data-section="vps">
            <h3 class="section-title-text">☁️ إعدادات VPS/Hostinger</h3>
            <button type="button" class="toggle-btn" id="toggle-vps" onclick="toggleSection('vps')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-vps">
          <div class="grid">
            <div class="form-group">
              <label>VPS_IP</label>
              <input type="text" name="VPS_IP" placeholder="123.456.789.0" data-testid="input-vps-ip">
            </div>
            <div class="form-group">
              <label>VPS_USER</label>
              <input type="text" name="VPS_USER" placeholder="root" data-testid="input-vps-user">
            </div>
            <div class="form-group">
              <label>VPS_SSH_PORT</label>
              <input type="number" name="VPS_SSH_PORT" placeholder="22" data-testid="input-vps-ssh">
            </div>
            <div class="form-group">
              <label>DOMAIN_NAME</label>
              <input type="text" name="DOMAIN_NAME" placeholder="classify.com" data-testid="input-domain">
            </div>
            <div class="form-group">
              <label>SUBDOMAIN</label>
              <input type="text" name="SUBDOMAIN" placeholder="app" data-testid="input-subdomain">
            </div>
            <div class="form-group">
              <label>NGINX_ENABLED</label>
              <select name="NGINX_ENABLED" data-testid="select-nginx">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>PM2_INSTANCES</label>
              <input type="text" name="PM2_INSTANCES" placeholder="max أو رقم" data-testid="input-pm2-instances">
            </div>
            <div class="form-group">
              <label>PM2_EXEC_MODE</label>
              <select name="PM2_EXEC_MODE" data-testid="select-pm2-mode">
                <option value="">-- اختياري --</option>
                <option value="fork">fork</option>
                <option value="cluster">cluster</option>
              </select>
            </div>
            <div class="form-group">
              <label>PM2_MAX_MEMORY</label>
              <input type="text" name="PM2_MAX_MEMORY" placeholder="512M" data-testid="input-pm2-memory">
            </div>
          </div>

          <!-- التطوير المحلي -->
          <div class="section-header" data-section="dev">
            <h3 class="section-title-text">💻 التطوير المحلي</h3>
            <button type="button" class="toggle-btn" id="toggle-dev" onclick="toggleSection('dev')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-dev">
          <div class="grid">
            <div class="form-group">
              <label>DEV_MODE</label>
              <select name="DEV_MODE" data-testid="select-dev-mode">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>HOT_RELOAD</label>
              <select name="HOT_RELOAD" data-testid="select-hot-reload">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>DEBUG</label>
              <select name="DEBUG" data-testid="select-debug">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>VITE_DEV_PORT</label>
              <input type="number" name="VITE_DEV_PORT" placeholder="3000" data-testid="input-vite-port">
            </div>
            <div class="form-group">
              <label>MOCK_DATA</label>
              <select name="MOCK_DATA" data-testid="select-mock-data">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>SEED_DATABASE</label>
              <select name="SEED_DATABASE" data-testid="select-seed-db">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <!-- البريد الإلكتروني -->
          <div class="section-header" data-section="email">
            <h3 class="section-title-text">📧 إعدادات البريد الإلكتروني</h3>
            <button type="button" class="toggle-btn" id="toggle-email" onclick="toggleSection('email')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-email">
          <div class="grid">
            <div class="form-group">
              <label>EMAIL_ENABLED</label>
              <select name="EMAIL_ENABLED" data-testid="select-email-enabled">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>SMTP_HOST</label>
              <input type="text" name="SMTP_HOST" placeholder="smtp.gmail.com" data-testid="input-smtp-host">
            </div>
            <div class="form-group">
              <label>SMTP_PORT</label>
              <input type="number" name="SMTP_PORT" placeholder="587" data-testid="input-smtp-port">
            </div>
            <div class="form-group">
              <label>SMTP_SECURE</label>
              <select name="SMTP_SECURE" data-testid="select-smtp-secure">
                <option value="">-- اختياري --</option>
                <option value="true">true (SSL/TLS)</option>
                <option value="false">false (STARTTLS)</option>
              </select>
            </div>
            <div class="form-group">
              <label>SMTP_USER</label>
              <input type="text" name="SMTP_USER" placeholder="email@gmail.com" data-testid="input-smtp-user">
            </div>
            <div class="form-group">
              <label>SMTP_PASSWORD</label>
              <input type="password" name="SMTP_PASSWORD" placeholder="كلمة مرور التطبيق" data-testid="input-smtp-password">
            </div>
            <div class="form-group">
              <label>SMTP_FROM</label>
              <input type="text" name="SMTP_FROM" placeholder="Classify <noreply@classify.com>" data-testid="input-smtp-from">
            </div>
          </div>

          <!-- تخزين الملفات -->
          <div class="section-header" data-section="storage">
            <h3 class="section-title-text">📁 تخزين الملفات</h3>
            <button type="button" class="toggle-btn" id="toggle-storage" onclick="toggleSection('storage')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-storage">
          <div class="grid">
            <div class="form-group">
              <label>STORAGE_TYPE</label>
              <select name="STORAGE_TYPE" data-testid="select-storage-type">
                <option value="">-- اختياري --</option>
                <option value="local">local (محلي)</option>
                <option value="s3">s3 (Amazon S3)</option>
                <option value="cloudinary">cloudinary</option>
              </select>
            </div>
            <div class="form-group">
              <label>UPLOAD_DIR</label>
              <input type="text" name="UPLOAD_DIR" placeholder="./uploads" data-testid="input-upload-dir">
            </div>
            <div class="form-group">
              <label>MAX_FILE_SIZE</label>
              <input type="text" name="MAX_FILE_SIZE" placeholder="10mb" data-testid="input-max-file-size">
            </div>
            <div class="form-group">
              <label>ALLOWED_FILE_TYPES</label>
              <input type="text" name="ALLOWED_FILE_TYPES" placeholder="jpg,png,pdf" data-testid="input-file-types">
            </div>
            <div class="form-group">
              <label>S3_BUCKET</label>
              <input type="text" name="S3_BUCKET" placeholder="my-bucket" data-testid="input-s3-bucket">
            </div>
            <div class="form-group">
              <label>S3_REGION</label>
              <input type="text" name="S3_REGION" placeholder="us-east-1" data-testid="input-s3-region">
            </div>
            <div class="form-group">
              <label>S3_ACCESS_KEY</label>
              <input type="password" name="S3_ACCESS_KEY" placeholder="Access Key" data-testid="input-s3-access">
            </div>
            <div class="form-group">
              <label>S3_SECRET_KEY</label>
              <input type="password" name="S3_SECRET_KEY" placeholder="Secret Key" data-testid="input-s3-secret">
            </div>
          </div>

          <!-- التخزين المؤقت Redis -->
          <div class="section-header" data-section="redis">
            <h3 class="section-title-text">⚡ التخزين المؤقت (Redis)</h3>
            <button type="button" class="toggle-btn" id="toggle-redis" onclick="toggleSection('redis')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-redis">
          <div class="grid">
            <div class="form-group">
              <label>CACHE_ENABLED</label>
              <select name="CACHE_ENABLED" data-testid="select-cache-enabled">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>REDIS_URL</label>
              <input type="text" name="REDIS_URL" placeholder="redis://localhost:6379" data-testid="input-redis-url">
            </div>
            <div class="form-group">
              <label>REDIS_HOST</label>
              <input type="text" name="REDIS_HOST" placeholder="localhost" data-testid="input-redis-host">
            </div>
            <div class="form-group">
              <label>REDIS_PORT</label>
              <input type="number" name="REDIS_PORT" placeholder="6379" data-testid="input-redis-port">
            </div>
            <div class="form-group">
              <label>REDIS_PASSWORD</label>
              <input type="password" name="REDIS_PASSWORD" placeholder="كلمة المرور" data-testid="input-redis-password">
            </div>
            <div class="form-group">
              <label>CACHE_TTL</label>
              <input type="number" name="CACHE_TTL" placeholder="3600" data-testid="input-cache-ttl">
              <p class="hint">بالثواني</p>
            </div>
          </div>

          <!-- المراقبة والسجلات -->
          <div class="section-header" data-section="monitoring">
            <h3 class="section-title-text">📊 المراقبة والسجلات</h3>
            <button type="button" class="toggle-btn" id="toggle-monitoring" onclick="toggleSection('monitoring')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-monitoring">
          <div class="grid">
            <div class="form-group">
              <label>SENTRY_DSN</label>
              <input type="text" name="SENTRY_DSN" placeholder="https://xxx@sentry.io/xxx" data-testid="input-sentry-dsn">
            </div>
            <div class="form-group">
              <label>LOG_FORMAT</label>
              <select name="LOG_FORMAT" data-testid="select-log-format">
                <option value="">-- اختياري --</option>
                <option value="json">json</option>
                <option value="text">text</option>
                <option value="combined">combined</option>
              </select>
            </div>
            <div class="form-group">
              <label>LOG_FILE_PATH</label>
              <input type="text" name="LOG_FILE_PATH" placeholder="./logs/app.log" data-testid="input-log-path">
            </div>
            <div class="form-group">
              <label>AUDIT_LOG_ENABLED</label>
              <select name="AUDIT_LOG_ENABLED" data-testid="select-audit-log">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>METRICS_ENABLED</label>
              <select name="METRICS_ENABLED" data-testid="select-metrics">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
          </div>

          <!-- تطبيق الجوال -->
          <div class="section-header" data-section="mobile">
            <h3 class="section-title-text">📱 إعدادات تطبيق الجوال</h3>
            <button type="button" class="toggle-btn" id="toggle-mobile" onclick="toggleSection('mobile')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-mobile">
          <div class="grid">
            <div class="form-group">
              <label>MOBILE_API_KEY</label>
              <input type="password" name="MOBILE_API_KEY" placeholder="مفتاح API للجوال" data-testid="input-mobile-api-key">
            </div>
            <div class="form-group">
              <label>PUSH_NOTIFICATIONS_ENABLED</label>
              <select name="PUSH_NOTIFICATIONS_ENABLED" data-testid="select-push-enabled">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>FCM_SERVER_KEY</label>
              <input type="password" name="FCM_SERVER_KEY" placeholder="Firebase Cloud Messaging Key" data-testid="input-fcm-key">
            </div>
            <div class="form-group">
              <label>APNS_KEY_ID</label>
              <input type="text" name="APNS_KEY_ID" placeholder="Apple Push Key ID" data-testid="input-apns-key">
            </div>
            <div class="form-group">
              <label>APNS_TEAM_ID</label>
              <input type="text" name="APNS_TEAM_ID" placeholder="Apple Team ID" data-testid="input-apns-team">
            </div>
          </div>

          <!-- الدفع -->
          <div class="section-header" data-section="payment">
            <h3 class="section-title-text">💳 إعدادات الدفع</h3>
            <button type="button" class="toggle-btn" id="toggle-payment" onclick="toggleSection('payment')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-payment">
          <div class="grid">
            <div class="form-group">
              <label>PAYMENT_ENABLED</label>
              <select name="PAYMENT_ENABLED" data-testid="select-payment-enabled">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>PAYMENT_GATEWAY</label>
              <select name="PAYMENT_GATEWAY" data-testid="select-payment-gateway">
                <option value="">-- اختياري --</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="fawry">Fawry</option>
                <option value="paymob">Paymob</option>
              </select>
            </div>
            <div class="form-group">
              <label>PAYMENT_API_KEY</label>
              <input type="password" name="PAYMENT_API_KEY" placeholder="API Key" data-testid="input-payment-api-key">
            </div>
            <div class="form-group">
              <label>PAYMENT_SECRET</label>
              <input type="password" name="PAYMENT_SECRET" placeholder="Secret Key" data-testid="input-payment-secret">
            </div>
            <div class="form-group">
              <label>PAYMENT_WEBHOOK_SECRET</label>
              <input type="password" name="PAYMENT_WEBHOOK_SECRET" placeholder="Webhook Secret" data-testid="input-payment-webhook">
            </div>
          </div>

          <!-- أعلام الميزات -->
          <div class="section-header" data-section="features">
            <h3 class="section-title-text">🚩 أعلام الميزات</h3>
            <button type="button" class="toggle-btn" id="toggle-features" onclick="toggleSection('features')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-features">
          <div class="grid">
            <div class="form-group">
              <label>FEATURE_REGISTRATION</label>
              <select name="FEATURE_REGISTRATION" data-testid="select-feature-registration">
                <option value="">-- اختياري --</option>
                <option value="true">true (مفعل)</option>
                <option value="false">false (معطل)</option>
              </select>
            </div>
            <div class="form-group">
              <label>FEATURE_2FA</label>
              <select name="FEATURE_2FA" data-testid="select-feature-2fa">
                <option value="">-- اختياري --</option>
                <option value="true">true (مفعل)</option>
                <option value="false">false (معطل)</option>
              </select>
            </div>
            <div class="form-group">
              <label>FEATURE_FLASH_GAMES</label>
              <select name="FEATURE_FLASH_GAMES" data-testid="select-feature-games">
                <option value="">-- اختياري --</option>
                <option value="true">true (مفعل)</option>
                <option value="false">false (معطل)</option>
              </select>
            </div>
            <div class="form-group">
              <label>FEATURE_STORE</label>
              <select name="FEATURE_STORE" data-testid="select-feature-store">
                <option value="">-- اختياري --</option>
                <option value="true">true (مفعل)</option>
                <option value="false">false (معطل)</option>
              </select>
            </div>
            <div class="form-group">
              <label>MAINTENANCE_MODE</label>
              <select name="MAINTENANCE_MODE" data-testid="select-maintenance">
                <option value="">-- اختياري --</option>
                <option value="true">true (وضع الصيانة)</option>
                <option value="false">false (تشغيل عادي)</option>
              </select>
            </div>
          </div>

          <!-- النسخ الاحتياطي -->
          <div class="section-header" data-section="backup">
            <h3 class="section-title-text">💾 النسخ الاحتياطي</h3>
            <button type="button" class="toggle-btn" id="toggle-backup" onclick="toggleSection('backup')">✓ مفعل</button>
          </div>
          <div class="section-content" id="content-backup">
          <div class="grid">
            <div class="form-group">
              <label>BACKUP_ENABLED</label>
              <select name="BACKUP_ENABLED" data-testid="select-backup-enabled">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>AUTO_BACKUP</label>
              <select name="AUTO_BACKUP" data-testid="select-auto-backup">
                <option value="">-- اختياري --</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            </div>
            <div class="form-group">
              <label>BACKUP_SCHEDULE</label>
              <input type="text" name="BACKUP_SCHEDULE" placeholder="0 2 * * * (كل يوم 2 صباحاً)" data-testid="input-backup-schedule">
              <p class="hint">صيغة Cron</p>
            </div>
            <div class="form-group">
              <label>BACKUP_RETENTION_DAYS</label>
              <input type="number" name="BACKUP_RETENTION_DAYS" placeholder="7" data-testid="input-backup-retention">
            </div>
            <div class="form-group">
              <label>BACKUP_PATH</label>
              <input type="text" name="BACKUP_PATH" placeholder="./backups" data-testid="input-backup-path">
            </div>
          </div>
          </div> <!-- Close section-content for backup -->

          <div style="margin-top: 30px;">
            <button type="submit" class="btn" id="saveBtn" data-testid="button-save">
              💾 حفظ جميع التغييرات
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <script>
    const session = sessionStorage.getItem('adminSession');
    if (!session) {
      window.location.href = '/admin/env/login';
    }

    // Section visibility management
    const SECTIONS_KEY = 'envDashboard_sections';
    
    function getSectionVisibility() {
      const saved = localStorage.getItem(SECTIONS_KEY);
      if (!saved) {
        // Default: all sections visible
        const sections = document.querySelectorAll('[data-section]');
        const defaults = {};
        sections.forEach(section => {
          defaults[section.dataset.section] = true;
        });
        return defaults;
      }
      return JSON.parse(saved);
    }

    function setSectionVisibility(sectionId, isVisible) {
      const visibility = getSectionVisibility();
      visibility[sectionId] = isVisible;
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(visibility));
    }

    function toggleSection(sectionId) {
      const visibility = getSectionVisibility();
      const isVisible = visibility[sectionId] !== false;
      visibility[sectionId] = !isVisible;
      localStorage.setItem(SECTIONS_KEY, JSON.stringify(visibility));

      const content = document.getElementById('content-' + sectionId);
      const btn = document.getElementById('toggle-' + sectionId);

      if (visibility[sectionId]) {
        content.classList.remove('hidden');
        btn.textContent = '✓ مفعل';
        btn.classList.remove('disabled');
      } else {
        content.classList.add('hidden');
        btn.textContent = '✕ معطل';
        btn.classList.add('disabled');
      }
    }

    function initializeSections() {
      const visibility = getSectionVisibility();
      
      document.querySelectorAll('[data-section]').forEach(section => {
        const sectionId = section.dataset.section;
        const content = document.getElementById('content-' + sectionId);
        const btn = document.getElementById('toggle-' + sectionId);
        
        if (!visibility[sectionId] && visibility[sectionId] !== undefined) {
          content.classList.add('hidden');
          btn.textContent = '✕ معطل';
          btn.classList.add('disabled');
        } else {
          content.classList.remove('hidden');
          btn.textContent = '✓ مفعل';
          btn.classList.remove('disabled');
        }
      });
    }

    async function loadEnv() {
      try {
        const res = await fetch('/admin/env', {
          headers: { 'x-admin-session': session }
        });
        if (!res.ok) {
          if (res.status === 401) {
            sessionStorage.removeItem('adminSession');
            window.location.href = '/admin/env/login';
            return;
          }
          throw new Error('Failed to load');
        }
        const data = await res.json();
        
        Object.entries(data.env).forEach(([key, value]) => {
          const input = document.querySelector('[name="' + key + '"]');
          if (input && !String(value).includes('[CONFIGURED]')) {
            input.value = value;
          }
        });
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('main').style.display = 'block';
        initializeSections();
      } catch (e) {
        document.getElementById('loading').textContent = 'فشل تحميل الإعدادات';
      }
    }

    document.getElementById('envForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'جاري الحفظ...';

      const formData = new FormData(e.target);
      const data = {};
      formData.forEach((value, key) => {
        if (value && String(value).trim()) data[key] = String(value).trim();
      });

      try {
        const res = await fetch('/admin/env', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-session': session
          },
          body: JSON.stringify(data)
        });
        
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || 'Failed');
        
        let successMsg = '=== تم الحفظ بنجاح ===\\n\\n';
        successMsg += '✅ ' + (result.message || 'تم حفظ الإعدادات بنجاح') + '\\n\\n';
        if (result.updatedKeys && result.updatedKeys.length > 0) {
          successMsg += '📝 المتغيرات المحدثة:\\n';
          result.updatedKeys.forEach(key => {
            successMsg += '   • ' + key + '\\n';
          });
        }
        if (result.note) {
          successMsg += '\\n⚠️ ' + result.note;
        }
        showToolResult(successMsg);
        showAlert('تم حفظ الإعدادات بنجاح!', 'success');
      } catch (e) {
        showToolResult('=== فشل الحفظ ===\\n\\n❌ ' + (e.message || 'فشل حفظ الإعدادات'), true);
        showAlert(e.message || 'فشل حفظ الإعدادات', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ التغييرات';
      }
    });

    function showAlert(msg, type) {
      const alert = document.getElementById('alert');
      alert.className = 'alert alert-' + type;
      alert.textContent = msg;
      setTimeout(() => alert.textContent = '', 5000);
    }

    function logout() {
      fetch('/admin/env/logout', {
        method: 'POST',
        headers: { 'x-admin-session': session }
      }).finally(() => {
        sessionStorage.removeItem('adminSession');
        window.location.href = '/admin/env/login';
      });
    }

    function showToolResult(content, isError = false) {
      const result = document.getElementById('toolResult');
      result.className = 'tool-result' + (isError ? ' error' : '');
      result.innerHTML = '<button class="close-btn" onclick="hideToolResult()">إغلاق</button><br>' + content;
      result.style.display = 'block';
      result.scrollTop = 0;
    }

    function hideToolResult() {
      document.getElementById('toolResult').style.display = 'none';
    }

    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        showToolResult('=== فحص صحة السيرفر ===\\n' + JSON.stringify(data, null, 2));
      } catch (e) {
        showToolResult('فشل الاتصال بالسيرفر: ' + e.message, true);
      }
    }

    async function viewLogs() {
      try {
        const res = await fetch('/admin/logs', {
          headers: { 'x-admin-session': session }
        });
        const data = await res.json();
        if (data.success) {
          showToolResult('=== سجلات السيرفر (آخر ' + data.lines + ' سطر) ===\\n\\n' + data.logs);
        } else {
          showToolResult(data.message || 'فشل تحميل السجلات', true);
        }
      } catch (e) {
        showToolResult('خطأ: ' + e.message, true);
      }
    }

    async function testDatabase() {
      try {
        const res = await fetch('/admin/db-test', {
          headers: { 'x-admin-session': session }
        });
        const data = await res.json();
        if (data.success) {
          showToolResult('=== فحص قاعدة البيانات ===\\n\\n✅ ' + data.message + '\\n\\nالوقت: ' + data.responseTime);
        } else {
          showToolResult('❌ فشل الاتصال: ' + data.message, true);
        }
      } catch (e) {
        showToolResult('خطأ: ' + e.message, true);
      }
    }

    async function systemInfo() {
      try {
        const res = await fetch('/admin/system', {
          headers: { 'x-admin-session': session }
        });
        const data = await res.json();
        let info = '=== معلومات النظام ===\\n\\n';
        info += 'Node.js: ' + data.nodeVersion + '\\n';
        info += 'النظام: ' + data.platform + '\\n';
        info += 'المعمارية: ' + data.arch + '\\n';
        info += 'الذاكرة الكلية: ' + data.totalMemory + '\\n';
        info += 'الذاكرة المتاحة: ' + data.freeMemory + '\\n';
        info += 'عدد المعالجات: ' + data.cpus + '\\n';
        info += 'مدة التشغيل: ' + data.uptime + '\\n';
        info += 'NODE_ENV: ' + data.nodeEnv + '\\n';
        info += 'PORT: ' + data.port + '\\n';
        info += 'المسار: ' + data.cwd;
        showToolResult(info);
      } catch (e) {
        showToolResult('خطأ: ' + e.message, true);
      }
    }

    async function backupEnv() {
      try {
        const res = await fetch('/admin/env-backup', {
          method: 'POST',
          headers: { 'x-admin-session': session }
        });
        const data = await res.json();
        if (data.success) {
          showToolResult('✅ ' + data.message + '\\n\\nالملف: ' + data.backupFile);
        } else {
          showToolResult('❌ ' + data.message, true);
        }
      } catch (e) {
        showToolResult('خطأ: ' + e.message, true);
      }
    }

    async function restoreEnv() {
      if (!confirm('هل أنت متأكد من استعادة ملف .env من النسخة الاحتياطية؟')) return;
      try {
        const res = await fetch('/admin/env-restore', {
          method: 'POST',
          headers: { 'x-admin-session': session }
        });
        const data = await res.json();
        if (data.success) {
          showToolResult('✅ ' + data.message);
          setTimeout(() => location.reload(), 2000);
        } else {
          showToolResult('❌ ' + data.message, true);
        }
      } catch (e) {
        showToolResult('خطأ: ' + e.message, true);
      }
    }

    async function restartServer() {
      if (!confirm('هل أنت متأكد من إعادة تشغيل السيرفر؟ سيتم قطع الاتصال مؤقتاً.')) return;
      try {
        showToolResult('⏳ جاري إعادة تشغيل السيرفر...');
        await fetch('/admin/restart', {
          method: 'POST',
          headers: { 'x-admin-session': session }
        });
      } catch (e) {
        showToolResult('🔄 السيرفر يعيد التشغيل... انتظر 5 ثوانٍ ثم أعد تحميل الصفحة.');
        setTimeout(() => location.reload(), 5000);
      }
    }

    loadEnv();
  </script>
</body>
</html>
  `);
});

// Server Logs endpoint
router.get("/logs", validateSession, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  auditLog("VIEW_LOGS", ip, "Viewing server logs");
  
  try {
    const logPath = path.join(process.cwd(), "logs", "admin-audit.log");
    let logs = "لا توجد سجلات متاحة";
    let lines = 0;
    
    if (fs.existsSync(logPath)) {
      const content = fs.readFileSync(logPath, "utf-8");
      const allLines = content.split("\n").filter(l => l.trim());
      lines = Math.min(allLines.length, 100);
      logs = allLines.slice(-100).join("\n");
    }
    
    res.json({ success: true, logs, lines });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

// Database Test endpoint
router.get("/db-test", validateSession, async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  auditLog("DB_TEST", ip, "Testing database connection");
  
  const startTime = Date.now();
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("SELECT 1");
    await pool.end();
    
    const responseTime = Date.now() - startTime;
    res.json({ 
      success: true, 
      message: "Database Connected Successfully",
      responseTime: responseTime + "ms"
    });
  } catch (error: any) {
    res.json({ 
      success: false, 
      message: error.message 
    });
  }
});

// System Info endpoint
router.get("/system", validateSession, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  auditLog("SYSTEM_INFO", ip, "Viewing system information");
  
  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + " GB";
  };
  
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };
  
  res.json({
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    totalMemory: formatBytes(os.totalmem()),
    freeMemory: formatBytes(os.freemem()),
    cpus: os.cpus().length,
    uptime: formatUptime(os.uptime()),
    nodeEnv: process.env.NODE_ENV || "development",
    port: process.env.PORT || "5000",
    cwd: process.cwd()
  });
});

// Backup .env endpoint
router.post("/env-backup", validateSession, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  try {
    const envPath = path.join(process.cwd(), ".env");
    const backupPath = path.join(process.cwd(), ".env.backup");
    
    if (!fs.existsSync(envPath)) {
      return res.json({ success: false, message: "ملف .env غير موجود" });
    }
    
    fs.copyFileSync(envPath, backupPath);
    auditLog("ENV_BACKUP", ip, "Backup created: .env.backup");
    
    res.json({ 
      success: true, 
      message: "تم إنشاء النسخة الاحتياطية بنجاح",
      backupFile: ".env.backup"
    });
  } catch (error: any) {
    auditLog("ENV_BACKUP_ERROR", ip, error.message);
    res.json({ success: false, message: error.message });
  }
});

// Restore .env endpoint
router.post("/env-restore", validateSession, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  try {
    const envPath = path.join(process.cwd(), ".env");
    const backupPath = path.join(process.cwd(), ".env.backup");
    
    if (!fs.existsSync(backupPath)) {
      return res.json({ success: false, message: "لا توجد نسخة احتياطية" });
    }
    
    fs.copyFileSync(backupPath, envPath);
    auditLog("ENV_RESTORE", ip, "Restored from .env.backup");
    
    res.json({ 
      success: true, 
      message: "تم استعادة ملف .env بنجاح - يرجى إعادة تحميل الصفحة"
    });
  } catch (error: any) {
    auditLog("ENV_RESTORE_ERROR", ip, error.message);
    res.json({ success: false, message: error.message });
  }
});

// Restart Server endpoint
router.post("/restart", validateSession, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  auditLog("SERVER_RESTART", ip, "Server restart initiated");
  
  res.json({ success: true, message: "جاري إعادة تشغيل السيرفر..." });
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
});

export default router;
