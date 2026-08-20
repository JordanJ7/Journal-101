import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// In-memory store for shared journal snapshots (can be extended with Firestore if initialized)
const sharedSnapshots: Record<string, { id: string; title: string; createdAt: string; data: any }> = {};

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Create shareable snapshot link
app.post("/api/share", (req, res) => {
  try {
    const { title, data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Missing journal data" });
    }
    
    // Generate a random 8-character ID
    const shareId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    
    sharedSnapshots[shareId] = {
      id: shareId,
      title: title || "Personal Journal Share",
      createdAt: new Date().toISOString(),
      data,
    };

    return res.json({
      success: true,
      shareId,
      shareUrl: `${req.protocol}://${req.get("host")}?shareId=${shareId}`,
    });
  } catch (error: any) {
    console.error("Error creating share snapshot:", error);
    return res.status(500).json({ error: error.message || "Failed to create share link" });
  }
});

// Retrieve shareable snapshot
app.get("/api/share/:shareId", (req, res) => {
  const { shareId } = req.params;
  const snapshot = sharedSnapshots[shareId];
  
  if (!snapshot) {
    return res.status(404).json({ error: "Shared snapshot not found or expired" });
  }
  
  return res.json(snapshot);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
