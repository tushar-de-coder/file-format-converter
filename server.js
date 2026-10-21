require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const os = require("os");
const CloudConvert = require("cloudconvert");

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigin = (process.env.ALLOWED_ORIGIN || "*").split(",").map(s => s.trim());
app.use(cors({ origin: (origin, cb) => {
  if (!origin || allowedOrigin.includes("*") || allowedOrigin.includes(origin)) return cb(null, true);
  return cb(new Error("Origin not allowed by CORS"));
}}));
app.use(express.json({ limit: "100kb" }));
const upload = multer({
  dest: path.join(os.tmpdir(), "convertly-uploads"),
  limits: { fileSize: Number(process.env.MAX_FILE_MB || 25) * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const allowed = new Set("pdf doc docx odt rtf txt md html htm xls xlsx ods csv tsv ppt pptx odp png jpg jpeg webp gif bmp tiff tif ico svg".split(" "));
    if (!allowed.has(ext)) return cb(new Error("This source file extension is not supported."));
    cb(null, true);
  }
});
const apiKey = process.env.CLOUDCONVERT_API_KEY;
const cloudConvert = apiKey ? new CloudConvert(apiKey) : null;
const targetFormats = new Set("pdf doc docx odt rtf txt md html xls xlsx ods csv tsv ppt pptx odp png jpg jpeg webp gif bmp tiff tif ico svg".split(" "));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "Convertly API" }));
app.post("/api/convert", upload.single("file"), async (req, res) => {
  let tempPath = req.file?.path;
  try {
    if (!cloudConvert) return res.status(503).json({ error: "Conversion service is not configured. Add CLOUDCONVERT_API_KEY to the backend environment variables." });
    if (!req.file) return res.status(400).json({ error: "Upload a file first." });
    const targetFormat = String(req.body.targetFormat || "").toLowerCase().replace(/^\./, "");
    if (!targetFormats.has(targetFormat)) return res.status(400).json({ error: "That target format is not supported." });
    const sourceFormat = path.extname(req.file.originalname).slice(1).toLowerCase();
    if (sourceFormat === targetFormat) return res.status(400).json({ error: "Source and target formats are the same." });

    const job = await cloudConvert.jobs.create({
      tasks: {
        "import-file": { operation: "import/upload" },
        "convert-file": { operation: "convert", input: "import-file", output_format: targetFormat },
        "export-file": { operation: "export/url", input: "convert-file", inline: false }
      }
    });
    const importTask = job.tasks.find(t => t.name === "import-file");
    await cloudConvert.tasks.upload(importTask, tempPath, req.file.originalname);
    const finishedJob = await cloudConvert.jobs.wait(job.id);
    const exportTask = finishedJob.tasks.find(t => t.name === "export-file");
    if (!exportTask || exportTask.status !== "finished" || !exportTask.result?.files?.length) {
      throw new Error("The conversion provider did not produce an output file. Try another format pair.");
    }
    const output = exportTask.result.files[0];
    const safeBase = path.basename(req.file.originalname, path.extname(req.file.originalname)).replace(/[^\w.-]+/g, "_");
    res.json({ downloadUrl: output.url, fileName: `${safeBase}.${targetFormat}`, expires: "Provider download links may expire; download promptly." });
  } catch (err) {
    console.error("Conversion error:", err.message);
    const message = err.message || "Conversion failed.";
    res.status(500).json({ error: message.includes("timeout") ? "Conversion timed out. Try a smaller file." : message });
  } finally {
    if (tempPath) await fs.unlink(tempPath).catch(() => {});
  }
});
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: `File is too large. The current limit is ${process.env.MAX_FILE_MB || 25} MB.` });
  if (err) return res.status(400).json({ error: err.message || "Invalid request." });
  next();
});
app.listen(PORT, () => console.log(`Convertly API listening on port ${PORT}`));
