import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { fileURLToPath } from "url";

// ESM-compatible __dirname replacement (handles Windows paths)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic import vite only in development (never in production)
  const vite = await import("vite");
  const viteConfigModule = await import("../vite.config.js");
  const { nanoid } = await import("nanoid");
  
  const viteLogger = vite.createLogger();
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const viteServer = await vite.createServer({
    ...viteConfigModule.default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg: any, options: any) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(viteServer.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Mirror production contract for unknown API routes in development
    if (req.path.startsWith("/api/") || req.path.startsWith("/objects/")) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "API endpoint not found",
      });
    }

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await viteServer.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      viteServer.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use process.cwd() to be robust when running from bundled dist/index.js
  const distPath = path.resolve(process.cwd(), "dist", "public");

  // Fail fast if build output doesn't exist
  if (!fs.existsSync(distPath)) {
    const error = new Error(
      `❌ Build output not found at: ${distPath}\n` +
      `Current working directory: ${process.cwd()}\n` +
      `Make sure to run 'npm run build' before starting production server.`
    );
    console.error(error.message);
    throw error;
  }

  console.log(`📁 Serving static assets from: ${distPath}`);
  console.log(`   Working directory: ${process.cwd()}`);
  
  // List files for debugging
  try {
    const files = fs.readdirSync(distPath);
    console.log(`   Files found: ${files.join(", ")}`);
  } catch (err) {
    console.error(`   Warning: Could not list files:`, err);
  }

  // Serve static assets with immutable caching for hashed filenames under /assets
  app.use(express.static(distPath, {
    maxAge: "30d",
    etag: false,
    index: false,
    setHeaders: (res, filePath) => {
      const lowerPath = filePath.toLowerCase();
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Hashed files are safe to cache immutably
        res.setHeader("Cache-Control", "public, max-age=2592000, immutable");
        return;
      }
      if (/\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|eot)$/.test(lowerPath)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
        return;
      }
      res.setHeader("Cache-Control", "public, max-age=300");
    }
  }));

  // SPA fallback - must come LAST
  // Serve index.html for all unmatched routes (for React Router)
  app.use("*", (req, res) => {
    // Do not fallback API routes or object storage paths
    if (req.path.startsWith("/api/") || req.path.startsWith("/objects/")) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "API endpoint not found"
      });
    }

    // Serve service worker and manifest directly
    if (req.path === "/sw.js" || req.path === "/manifest.json") {
      const filePath = path.resolve(distPath, req.path.slice(1));
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(404).send("File not found");
    }

    // SPA fallback to index.html
    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(500).send(
        "Application not built correctly - index.html not found"
      );
    }
    
    return res.sendFile(indexPath);
  });
}
