function cropForStage(video, stage) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  const region = stage === 'DRIVER_ID'
    ? { x: 0.08, y: 0.16, width: 0.84, height: 0.68 }
    : { x: 0.08, y: 0.56, width: 0.84, height: 0.30 };
  return {
    x: Math.round(width * region.x),
    y: Math.round(height * region.y),
    width: Math.round(width * region.width),
    height: Math.round(height * region.height)
  };
}

function improveTextContrast(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (luminance - 128) * 1.65 + 128));
    image.data[index] = contrasted;
    image.data[index + 1] = contrasted;
    image.data[index + 2] = contrasted;
  }
  context.putImageData(image, 0, 0);
}

export async function recognizeTextFromVideo(video, { stage = 'PLATE', onProgress } = {}) {
  if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('The live camera is not ready yet. Wait one second and scan again.');
  }
  if (!window.Tesseract?.recognize) {
    throw new Error('The OCR engine could not load. Check the internet connection and refresh the page.');
  }

  const crop = cropForStage(video, stage);
  const scale = Math.max(1.5, Math.min(2.5, 1200 / crop.width));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
  improveTextContrast(canvas);

  const result = await window.Tesseract.recognize(canvas, 'eng', {
    logger(message) {
      if (message.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(Number(message.progress || 0) * 100));
      }
    }
  });

  return {
    text: String(result?.data?.text || '').replace(/\s+/g, ' ').trim(),
    confidence: Math.max(0, Math.min(100, Math.round(Number(result?.data?.confidence || 0)))),
    capturedAt: new Date().toISOString()
  };
}
