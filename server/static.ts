import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    const error = new Error(
      `Build output not found at: ${distPath}\n` +
      `Current working directory: ${process.cwd()}\n` +
      `Make sure to run 'npm run build' before starting production server.`
    );
    console.error(error.message);
    throw error;
  }

  console.log(`Serving static assets from: ${distPath}`);
  
  try {
    const files = fs.readdirSync(distPath);
    console.log(`Files found: ${files.join(", ")}`);
  } catch (err) {
    console.error(`Warning: Could not list files:`, err);
  }

  app.use(express.static(distPath, {
    etag: true,
    index: false,
    setHeaders: (res, filePath) => {
      const basename = path.basename(filePath);
      // Never cache sw.js, manifest.json, or index.html
      if (basename === 'sw.js' || basename === 'manifest.json' || basename === 'index.html') {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Hashed assets are immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        // Icons and other static files: 1 day
        res.setHeader("Cache-Control", "public, max-age=86400");
      }
    }
  }));

  app.use("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "API endpoint not found"
      });
    }

    if (req.path === "/sw.js" || req.path === "/manifest.json") {
      const filePath = path.resolve(distPath, req.path.slice(1));
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
      return res.status(404).send("File not found");
    }

    const indexPath = path.resolve(distPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return res.status(500).send(
        "Application not built correctly - index.html not found"
      );
    }
    
    return res.sendFile(indexPath);
  });
}
