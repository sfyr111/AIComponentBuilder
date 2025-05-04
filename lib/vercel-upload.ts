/**
 * Uploads an image file to Vercel Blob.
 * @param file - The image file to upload.
 * @returns A promise that resolves with the uploaded image URL or null if upload fails.
 */
export const uploadImageToVercel = async (file: File): Promise<string | null> => {
  if (!file || !file.type.startsWith('image/')) {
    console.error("Only image files are supported");
    return null;
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log('Image URL (from Vercel Blob):', data.url);
      return data.url;
    } else {
      console.error("Upload failed (Vercel Blob API)", data.error || "Upload failed");
      return null;
    }
  } catch (error) {
    console.error("Upload failed (Network/Client Error)", error);
    return null;
  }
}; 