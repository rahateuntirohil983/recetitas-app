import { createWriteStream } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";

const port = Number(process.env.PORT || 3004);
const uploadToken = process.env.UPLOAD_TOKEN || "";
const storageRoot = process.env.STORAGE_ROOT || "/var/lib/recetitas-media";
const publicBaseUrl = String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
const run = promisify(execFile);
const maxImageBytes = 8 * 1024 * 1024;
const maxVideoBytes = 50 * 1024 * 1024;
const maxVideoSeconds = 35;
const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const videoTypes = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

if (!uploadToken || !publicBaseUrl.startsWith("https://")) {
  throw new Error("UPLOAD_TOKEN and an HTTPS PUBLIC_BASE_URL are required");
}

const json = (response, status, body) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
};

const tokenMatches = (authorization) => {
  const provided = Buffer.from(String(authorization || "").replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(uploadToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
};

const validMagic = async (path, contentType) => {
  const file = await open(path, "r");
  const buffer = Buffer.alloc(16);
  await file.read(buffer, 0, buffer.length, 0);
  await file.close();

  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  if (["video/mp4", "video/quicktime"].includes(contentType)) return buffer.subarray(4, 8).toString() === "ftyp";
  if (contentType === "video/webm") return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
};

const videoDuration = async (path) => {
  const { stdout } = await run("/usr/bin/ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    path,
  ], { timeout: 15_000, maxBuffer: 64 * 1024 });
  return Number.parseFloat(stdout.trim());
};

const transcodeVideo = async (inputPath, outputPath) => {
  await run("/usr/bin/ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", inputPath,
    "-t", String(maxVideoSeconds),
    "-vf", "scale=720:1280:force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "25", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart",
    "-map_metadata", "-1",
    outputPath,
  ], { timeout: 120_000, maxBuffer: 1024 * 1024 });
};

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return json(response, 200, { ok: true, service: "recetitas-media", maxVideoSeconds });
  }

  if (request.method === "DELETE" && request.url === "/delete") {
    if (!tokenMatches(request.headers.authorization)) return json(response, 401, { error: "unauthorized" });
    const userId = String(request.headers["x-user-id"] || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const fileUrl = String(request.headers["x-file-url"] || "");
    try {
      const parsed = new URL(fileUrl);
      const expectedPrefix = `/files/${encodeURIComponent(userId)}/`;
      const filename = parsed.pathname.startsWith(expectedPrefix) ? parsed.pathname.slice(expectedPrefix.length) : "";
      if (parsed.origin !== publicBaseUrl || !/^[a-f0-9]{32}\.(jpg|png|webp|mp4)$/.test(filename)) {
        return json(response, 422, { error: "invalid_file" });
      }
      await rm(`${storageRoot}/${userId}/${filename}`, { force: true });
      return json(response, 200, { deleted: true });
    } catch {
      return json(response, 422, { error: "invalid_file" });
    }
  }

  if (request.method !== "POST" || request.url !== "/upload") {
    return json(response, 404, { error: "not_found" });
  }
  if (!tokenMatches(request.headers.authorization)) {
    return json(response, 401, { error: "unauthorized" });
  }

  const contentType = String(request.headers["content-type"] || "").split(";")[0].toLowerCase();
  const mediaKind = imageTypes.has(contentType) ? "image" : videoTypes.has(contentType) ? "video" : "";
  const extension = imageTypes.get(contentType) || videoTypes.get(contentType);
  const maxBytes = mediaKind === "video" ? maxVideoBytes : maxImageBytes;
  const contentLength = Number(request.headers["content-length"] || 0);
  if (!extension) return json(response, 415, { error: "unsupported_media" });
  if (contentLength > maxBytes) return json(response, 413, { error: "media_too_large" });

  const userId = String(request.headers["x-user-id"] || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "anonymous";
  const directory = `${storageRoot}/${userId}`;
  const fileId = randomUUID().replaceAll("-", "");
  const temporaryPath = `${directory}/.${fileId}.upload`;
  const processedPath = `${directory}/.${fileId}.processing.mp4`;
  const finalExtension = mediaKind === "video" ? "mp4" : extension;
  const finalPath = `${directory}/${fileId}.${finalExtension}`;

  try {
    await mkdir(directory, { recursive: true, mode: 0o755 });
    let received = 0;
    const limiter = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length;
        callback(received > maxBytes ? new Error("MEDIA_TOO_LARGE") : null, chunk);
      },
    });
    await pipeline(request, limiter, createWriteStream(temporaryPath, { mode: 0o644 }));
    if (!await validMagic(temporaryPath, contentType)) throw new Error("INVALID_MEDIA");
    if (mediaKind === "video") {
      const duration = await videoDuration(temporaryPath);
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("INVALID_VIDEO");
      if (duration > maxVideoSeconds + 0.25) throw new Error("VIDEO_TOO_LONG");
      await transcodeVideo(temporaryPath, processedPath);
      await rename(processedPath, finalPath);
      await rm(temporaryPath, { force: true });
    } else {
      await rename(temporaryPath, finalPath);
    }
    return json(response, 201, {
      url: `${publicBaseUrl}/files/${encodeURIComponent(userId)}/${fileId}.${finalExtension}`,
      type: mediaKind,
    });
  } catch (failure) {
    await rm(temporaryPath, { force: true }).catch(() => null);
    await rm(processedPath, { force: true }).catch(() => null);
    if (failure.message === "MEDIA_TOO_LARGE") return json(response, 413, { error: "media_too_large" });
    if (failure.message === "INVALID_MEDIA" || failure.message === "INVALID_VIDEO") return json(response, 422, { error: "invalid_media" });
    if (failure.message === "VIDEO_TOO_LONG") return json(response, 422, { error: "video_too_long", maxVideoSeconds });
    console.error("upload_failed", failure);
    return json(response, 500, { error: "upload_failed" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`recetitas-media listening on 127.0.0.1:${port}`);
});
