export type BgRemovalStatus = 'idle' | 'loading-model' | 'processing' | 'done' | 'error';

export async function removeImageBackground(
  imageUrl: string,
  onProgress?: (status: BgRemovalStatus) => void,
): Promise<string> {
  try {
    onProgress?.('loading-model');

    // Lazy-load the heavy ONNX-based background removal library
    const { removeBackground } = await import('@imgly/background-removal');

    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    const blob = await response.blob();

    onProgress?.('processing');

    const resultBlob = await removeBackground(blob, {
      publicPath: 'https://unpkg.com/@imgly/background-removal@1.5.5/dist/',
      debug: false,
      proxyToWorker: true,
      model: 'isnet',
    });

    const url = URL.createObjectURL(resultBlob);
    onProgress?.('done');
    return url;
  } catch (err) {
    onProgress?.('error');
    throw err;
  }
}

export function blobUrlToDataUrl(blobUrl: string): Promise<string> {
  return fetch(blobUrl)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
}
