/**
 * Uploads an image file to Volcengine TOS.
 * @param file - The image file to upload.
 * @returns A promise that resolves with the uploaded image URL or null if upload fails.
 */
import { TosClient } from '@volcengine/tos-sdk';

export const uploadImageToTOS = async (file: File): Promise<string | null> => {
  if (!file || !file.type.startsWith('image/')) {
    console.error("Only image files are supported");
    return null;
  }

  try {
    const tosClient = new TosClient({
      accessKeyId: process.env.NEXT_PUBLIC_VOLCENGINE_ACCESS_KEY || '',
      accessKeySecret: process.env.NEXT_PUBLIC_VOLCENGINE_SECRET_KEY || '',
      region: process.env.NEXT_PUBLIC_VOLCENGINE_REGION || 'cn-shanghai',
      endpoint: process.env.NEXT_PUBLIC_VOLCENGINE_ENDPOINT || 'tos-cn-shanghai.volces.com',
      bucket: process.env.NEXT_PUBLIC_VOLCENGINE_BUCKET || '',
      requestTimeout: -1,
    });

    // Create a unique object key with timestamp and filename
    const objectKey = `uploads/${Date.now()}-${file.name}`;
    const expires = 3600; // URL validity period in seconds

    // Generate pre-signed URL for PUT request
    const url = await tosClient.getPreSignedUrl({
      key: objectKey,
      method: 'PUT',
      expires,
    });

    // Upload the file directly from the client
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`);
    }

    // Construct the public URL by removing the query parameters
    const publicUrl = url.split('?')[0];
    console.log('Image URL (from Volcengine TOS):', publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error("Upload failed (Volcengine TOS)", error);
    return null;
  }
}; 