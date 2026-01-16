/**
 * useUpload hook for uploading files from the mobile app.
 * Files are uploaded via the web backend which securely forwards to AppGen's upload service.
 * 
 * Usage:
 *   import { useUpload } from '@/utils/useUpload';
 *   
 *   const [upload, { loading }] = useUpload();
 *   
 *   // Upload a file from image picker
 *   const result = await upload({ reactNativeAsset: imagePickerAsset });
 *   if (result.url) console.log('Uploaded:', result.url);
 *   if (result.error) console.error('Error:', result.error);
 *   
 *   // Upload from URL
 *   const result = await upload({ url: 'https://example.com/image.jpg' });
 *   
 *   // Upload from base64
 *   const result = await upload({ base64: 'iVBORw0KGgo...', fileName: 'image.png', mimeType: 'image/png' });
 */

import * as React from 'react';
import { Platform } from 'react-native';

// Base URL for the web backend (same sandbox, different port)
const API_BASE = process.env.EXPO_PUBLIC_APP_URL || '';

function useUpload() {
  const [loading, setLoading] = React.useState(false);

  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;

      if ("file" in input && input.file) {
        // Web File object
        const formData = new FormData();
        formData.append("file", input.file);
        response = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          body: formData,
        });
      } else if ("reactNativeAsset" in input && input.reactNativeAsset) {
        // React Native image picker asset
        const asset = input.reactNativeAsset;
        
        if (Platform.OS === 'web') {
          // For web: fetch the blob from the URI and create a proper File
          const blob = await fetch(asset.uri).then(r => r.blob());
          const fileName = asset.fileName || asset.uri.split('/').pop() || 'file';
          const file = new File([blob], fileName, { 
            type: asset.mimeType || blob.type || 'application/octet-stream' 
          });
          const formData = new FormData();
          formData.append("file", file);
          response = await fetch(`${API_BASE}/api/upload`, {
            method: "POST",
            body: formData,
          });
        } else {
          // For native: use the special RN FormData format
          const formData = new FormData();
          formData.append("file", {
            uri: asset.uri,
            name: asset.fileName || asset.uri.split('/').pop() || 'file',
            type: asset.mimeType || 'application/octet-stream',
          });
          response = await fetch(`${API_BASE}/api/upload`, {
            method: "POST",
            body: formData,
          });
        }
      } else if ("url" in input) {
        response = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.url }),
        });
      } else if ("base64" in input) {
        response = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: input.base64,
            fileName: input.fileName,
            mimeType: input.mimeType,
          }),
        });
      } else {
        throw new Error("Invalid upload input");
      }

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error("File too large (max 10MB)");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : "Upload failed" 
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;
