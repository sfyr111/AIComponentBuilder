/**
 * Converts a File object to a base64 encoded string.
 * @param file - The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Uploads an image file to ImgBB.
 * @param file - The image file to upload.
 * @returns A promise that resolves with the uploaded image URL or null if upload fails.
 */
export const uploadImage = async (file: File): Promise<string | null> => {
  const API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || '';

  if (!API_KEY) {
    console.error("ImgBB API Key (NEXT_PUBLIC_IMGBB_API_KEY) is not configured.");
    return null;
  }

  if (!file || !file.type.startsWith('image/')) {
    console.error("Only image files are supported");
    return null;
  }

  try {
    const base64Data = await fileToBase64(file);
    const base64 = base64Data.split(',')[1]; // Remove prefix 'data:image/...;base64,'
    
    const formData = new URLSearchParams();
    formData.append('key', API_KEY);
    formData.append('image', base64);

    const res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await res.json();

    if (data.success) {
      const url = data.data.url;
      console.log('Image URL (from util):', url);
      return url;
    } else {
      console.error("Upload failed (ImgBB API)", data.error);
      return null;
    }
  } catch (error) {
    console.error("Upload failed (Network/Client Error)", error);
    return null;
  }
}; 