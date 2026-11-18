import { randomUUID } from "node:crypto";

const storageConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "inspection-images";
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase Storage configuration is missing");
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey, bucket };
};

export async function uploadInspectionImage(base64: string, contentType: string, userId: number, roomCode: string) {
  const { supabaseUrl, serviceRoleKey, bucket } = storageConfig();
  const normalizedType = contentType.toLowerCase();
  const extension = normalizedType === "image/png" ? "png" : normalizedType === "image/webp" ? "webp" : normalizedType === "image/jpeg" ? "jpg" : null;
  if (!extension) throw new Error("imageContentType must be image/jpeg, image/png, or image/webp");

  const rawBase64 = base64.replace(/^data:[^;]+;base64,/, "");
  const image = Buffer.from(rawBase64, "base64");
  if (!image.length) throw new Error("imageBase64 is empty or invalid");
  if (image.length > 10 * 1024 * 1024) throw new Error("Image must be smaller than 10 MB");

  const path = `inspections/${userId}/${roomCode}/${Date.now()}-${randomUUID()}.${extension}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": normalizedType, "x-upsert": "false" },
    body: image
  });
  if (!response.ok) throw new Error(`Supabase Storage upload failed (${response.status})`);
  return { imagePath: path, imageUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}` };
}
