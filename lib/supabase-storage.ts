import { createHash } from "node:crypto";
import { APIError } from "./http-response.js";

const storageConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "inspection-images";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new APIError(503, "STORAGE_UNAVAILABLE", "Penyimpanan gambar belum tersedia. Coba lagi nanti.");
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey, bucket };
};

export async function uploadInspectionImage(base64: string, contentType: string, userId: number, roomCode: string) {
  if (typeof base64 !== "string" || typeof contentType !== "string") {
    throw new APIError(400, "INVALID_IMAGE", "Gambar sampel tidak valid.");
  }
  if (base64.length > 14 * 1024 * 1024) {
    throw new APIError(413, "IMAGE_TOO_LARGE", "Gambar harus lebih kecil dari 10 MB.");
  }
  const dataUri = /^data:([^;]+);base64,(.*)$/s.exec(base64);
  const normalizedType = contentType.toLowerCase();
  const extension = normalizedType === "image/png" ? "png"
    : normalizedType === "image/webp" ? "webp" : normalizedType === "image/jpeg" ? "jpg" : null;
  if (!extension || (dataUri && dataUri[1].toLowerCase() !== normalizedType)) {
    throw new APIError(400, "INVALID_IMAGE_TYPE", "Gunakan gambar JPEG, PNG, atau WebP dengan format yang sesuai.");
  }
  const rawBase64 = dataUri ? dataUri[2] : base64;
  if (!rawBase64 || rawBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(rawBase64)) {
    throw new APIError(400, "INVALID_IMAGE", "Data gambar sampel tidak valid.");
  }
  const image = Buffer.from(rawBase64, "base64");
  if (image.length > 10 * 1024 * 1024) {
    throw new APIError(413, "IMAGE_TOO_LARGE", "Gambar harus lebih kecil dari 10 MB.");
  }
  const matchesType = normalizedType === "image/png" ? image.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    : normalizedType === "image/jpeg" ? image.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"))
    : image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP";
  if (!matchesType) throw new APIError(400, "INVALID_IMAGE", "Isi gambar tidak sesuai dengan formatnya.");

  const { supabaseUrl, serviceRoleKey, bucket } = storageConfig();
  // Reusing the same bytes on retry or concurrent completion uses the same object.
  const hash = createHash("sha256").update(image).digest("hex");
  const path = `inspections/${userId}/${roomCode}/${hash}.${extension}`;
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey,
        "Content-Type": normalizedType, "x-upsert": "true"
      },
      body: image,
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new APIError(503, "STORAGE_UNAVAILABLE", "Gambar belum berhasil diunggah. Periksa koneksi lalu coba lagi.");
  }
  if (!response.ok) throw new APIError(503, "STORAGE_UNAVAILABLE", "Penyimpanan gambar sedang bermasalah. Coba lagi nanti.");
  return { imagePath: path, imageUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` };
}
