export async function uploadFileWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<{ url: string; fileName: string; fileSize: number }> {
  try {
    // 1. Fetch direct GitHub Release Asset upload URL from server
    const configRes = await fetch('/api/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type }),
    });

    if (!configRes.ok) {
      throw new Error('Failed to get direct upload URL');
    }

    const { uploadUrl, token } = await configRes.json();

    // 2. Perform direct XHR upload from browser to GitHub CDN
    return await new Promise<{ url: string; fileName: string; fileSize: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Cap at 99% until response is parsed
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            onProgress(100);
            resolve({
              url: response.browser_download_url,
              fileName: file.name,
              fileSize: file.size,
            });
          } catch (e) {
            reject(new Error('Invalid JSON response from GitHub'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.message || 'GitHub upload failed'));
          } catch {
            reject(new Error(`GitHub upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload to GitHub'));

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `token ${token}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  } catch (error) {
    // Fallback: If direct client-side GitHub CORS is blocked, upload via server endpoint
    return new Promise<{ url: string; fileName: string; fileSize: number }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            onProgress(100);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          try {
            const errData = JSON.parse(xhr.responseText);
            reject(new Error(errData.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during fallback upload'));

      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    });
  }
}
