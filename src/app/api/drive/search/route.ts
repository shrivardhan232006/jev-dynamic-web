import { NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs/promises";
import path from "path";
import { getAuthenticatedClient } from "@/lib/mcp/google-auth";

export const runtime = "nodejs";

const WORKSPACE_ROOT = "d:\\One Drive\\OneDrive\\Desktop\\shrivardhan";

type DriveFileResult = {
  id: string;
  name: string;
  source: "google_drive" | "onedrive" | "local";
  url: string;
  type: string;
  size?: string;
  modified?: string;
  thumbnailUrl?: string;
  mimeType?: string;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileType(ext: string): string {
  const e = ext.toLowerCase().replace(".", "");
  if (["pdf"].includes(e)) return "pdf";
  if (["doc", "docx", "gdoc"].includes(e)) return "document";
  if (["xls", "xlsx", "csv", "gsheet"].includes(e)) return "spreadsheet";
  if (["ppt", "pptx", "gslides"].includes(e)) return "presentation";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(e)) return "image";
  if (["ipynb", "py", "js", "ts", "json"].includes(e)) return "code";
  return "file";
}

function mimeToType(mime: string): string {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("document") || mime.includes("word")) return "document";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "presentation";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("folder")) return "folder";
  return "file";
}

async function searchLocalFiles(query: string, maxResults = 8): Promise<DriveFileResult[]> {
  const results: DriveFileResult[] = [];
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  async function scanDir(currentDir: string, depth = 0) {
    if (depth > 3 || results.length >= maxResults) return;
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next") {
          continue;
        }

        const fullPath = path.join(currentDir, entry.name);
        const lowerName = entry.name.toLowerCase();

        if (entry.isFile()) {
          const matches = terms.some((t) => lowerName.includes(t));
          if (matches) {
            try {
              const stat = await fs.stat(fullPath);
              const ext = path.extname(entry.name);
              const fileUrl = `file:///${fullPath.replace(/\\/g, "/")}`;
              results.push({
                id: `local-${results.length}-${entry.name}`,
                name: entry.name,
                source: "local",
                url: fileUrl,
                type: getFileType(ext),
                size: formatBytes(stat.size),
                modified: stat.mtime.toLocaleDateString(),
              });
            } catch {
              // skip unreadable
            }
          }
        } else if (entry.isDirectory()) {
          await scanDir(fullPath, depth + 1);
        }
      }
    } catch {
      // directory inaccessible
    }
  }

  await scanDir(WORKSPACE_ROOT);
  return results;
}

async function searchGoogleDrive(query: string, maxResults = 10): Promise<DriveFileResult[]> {
  const auth = await getAuthenticatedClient();
  if (!auth) return [];

  const drive = google.drive({ version: "v3", auth });

  try {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const noSpace = query.replace(/\s+/g, "");

    // Search exact phrase, concatenated phrase (e.g. "rlbook"), and individual terms
    const clauses = [
      `name contains '${query.replace(/'/g, "\\'")}'`,
      ...(noSpace !== query ? [`name contains '${noSpace.replace(/'/g, "\\'")}'`] : []),
      ...terms.map((t) => `name contains '${t.replace(/'/g, "\\'")}'`),
    ];
    const q = `(${clauses.join(" or ")}) and trashed = false`;

    const res = await drive.files.list({
      q,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink)",
      pageSize: maxResults,
      orderBy: "modifiedTime desc",
    });

    const items = (res.data.files ?? []).map((f) => ({
      id: f.id ?? `gdrive-${Date.now()}`,
      name: f.name ?? "Untitled",
      source: "google_drive" as const,
      url: f.webViewLink
        ? f.webViewLink.includes("usp=")
          ? f.webViewLink
          : `${f.webViewLink}${f.webViewLink.includes("?") ? "&" : "?"}usp=drive_link`
        : `https://drive.google.com/file/d/${f.id}/view?usp=drive_link`,
      type: mimeToType(f.mimeType ?? ""),
      size: f.size ? formatBytes(Number(f.size)) : "Cloud",
      modified: f.modifiedTime
        ? new Date(f.modifiedTime).toLocaleDateString()
        : undefined,
      thumbnailUrl: f.thumbnailLink ?? undefined,
      mimeType: f.mimeType ?? undefined,
    }));

    // Sort items so files matching more terms appear first
    return items.sort((a, b) => {
      const aLower = a.name.toLowerCase();
      const bLower = b.name.toLowerCase();
      const aScore = (aLower.includes(noSpace) ? 4 : 0) + terms.filter((t) => aLower.includes(t)).length;
      const bScore = (bLower.includes(noSpace) ? 4 : 0) + terms.filter((t) => bLower.includes(t)).length;
      return bScore - aScore;
    });
  } catch (err) {
    console.warn("[drive] Search failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ files: [] });
  }

  // Run both searches in parallel
  const [googleFiles, localFiles] = await Promise.all([
    searchGoogleDrive(q),
    searchLocalFiles(q),
  ]);

  // If no Google Drive API results, provide a search link as fallback
  const fallbackDriveLink: DriveFileResult | null =
    googleFiles.length === 0
      ? {
          id: `gdrive-search-${encodeURIComponent(q)}`,
          name: `Search "${q}" in Google Drive`,
          source: "google_drive",
          url: `https://drive.google.com/drive/search?q=${encodeURIComponent(q)}`,
          type: "document",
          size: "Cloud",
        }
      : null;

  const allFiles = [
    ...googleFiles,
    ...(fallbackDriveLink ? [fallbackDriveLink] : []),
    ...localFiles,
  ];

  return NextResponse.json({
    query: q,
    googleDriveConnected: googleFiles.length > 0 || (await getAuthenticatedClient()) !== null,
    files: allFiles,
  });
}
