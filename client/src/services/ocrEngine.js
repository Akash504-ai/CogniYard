function cropForStage(video, stage) {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (stage === 'DRIVER_ID') {
    return {
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.25),
      width: Math.round(width * 0.84),
      height: Math.round(height * 0.55)
    };
  }

  return {
    x: Math.round(width * 0.05),
    y: Math.round(height * 0.20),
    width: Math.round(width * 0.90),
    height: Math.round(height * 0.65)
  };
}

function normalizeOCRText(text) {
  return String(text || '')
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function cleanOCRText(text, stage) {
  let value = String(text || '')
    .normalize('NFKD')
    .toUpperCase()
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const compact = value.replace(/[^A-Z0-9]/g, '');

  if (stage === 'DRIVER_ID') {
    const driverMatch = compact.match(/DRV[O0]?[0-9]{3,6}/);

    if (driverMatch) {
      return `DRV-${driverMatch[0].replace(/^DRVO/, 'DRV')}`;
    }

    const numberMatch = compact.match(/[0-9]{3,6}/);

    if (numberMatch) {
      return `DRV-${numberMatch[0]}`;
    }
  }

  if (stage === 'PLATE') {
    const plateMatch = compact.match(/[A-Z]{2}[0-9]{3,4}/);

    if (plateMatch) {
      return `${plateMatch[0].slice(0, 2)}-${plateMatch[0].slice(2)}`;
    }
  }

  return value;
}

function preprocess(canvas, mode = 'normal') {
  const context = canvas.getContext('2d', {
    willReadFrequently: true
  });

  const image = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let gray =
      r * 0.299 +
      g * 0.587 +
      b * 0.114;

    if (mode === 'strong') {
      gray = (gray - 128) * 2.2 + 128;
    }

    if (mode === 'soft') {
      gray = (gray - 128) * 1.45 + 128;
    }

    gray = Math.max(0, Math.min(255, gray));

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  context.putImageData(image, 0, 0);
}

function createCapture(video, crop, mode = 'normal') {
  const scale = Math.max(
    2.5,
    Math.min(4, 1800 / crop.width)
  );

  const canvas = document.createElement('canvas');

  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);

  const context = canvas.getContext('2d', {
    willReadFrequently: true
  });

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  context.drawImage(
    video,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  preprocess(canvas, mode);

  return canvas;
}

async function runOCR(
  canvas,
  stage,
  onProgress,
  progressStart = 0,
  progressEnd = 100
) {
  const result = await window.Tesseract.recognize(
    canvas,
    'eng',
    {
      logger(message) {
        if (
          message.status === 'recognizing text' &&
          onProgress
        ) {
          const localProgress = Number(
            message.progress || 0
          );

          const progress =
            progressStart +
            localProgress *
              (progressEnd - progressStart);

          onProgress(Math.round(progress));
        }
      },

      tessedit_pageseg_mode:
        stage === 'DRIVER_ID'
          ? 7
          : 7,

      tessedit_char_whitelist:
        stage === 'DRIVER_ID'
          ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
          : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',

      preserve_interword_spaces: '0',

      user_defined_dpi: '300'
    }
  );

  return {
    text: String(
      result?.data?.text || ''
    ).trim(),

    confidence: Number(
      result?.data?.confidence || 0
    )
  };
}

function scoreResult(text, confidence, stage) {
  const normalized = normalizeOCRText(text);

  if (!normalized) {
    return 0;
  }

  let score = Number(confidence || 0);

  if (stage === 'DRIVER_ID') {
    if (/^DRV\d{3,6}$/.test(normalized)) {
      score += 100;
    }

    if (/^DRVO\d{3,6}$/.test(normalized)) {
      score += 90;
    }

    if (/^\d{3,6}$/.test(normalized)) {
      score += 50;
    }

    if (
      normalized.length >= 5 &&
      normalized.length <= 9
    ) {
      score += 20;
    }
  }

  if (stage === 'PLATE') {
    if (/^[A-Z]{2}\d{3,4}$/.test(normalized)) {
      score += 100;
    }

    if (
      normalized.length >= 5 &&
      normalized.length <= 10
    ) {
      score += 20;
    }
  }

  return score;
}

export async function recognizeTextFromVideo(
  video,
  {
    stage = 'PLATE',
    onProgress
  } = {}
) {
  if (
    !video ||
    video.readyState < 2 ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    throw new Error(
      'The live camera is not ready yet. Wait one second and scan again.'
    );
  }

  if (!window.Tesseract?.recognize) {
    throw new Error(
      'The OCR engine could not load. Check the internet connection and refresh the page.'
    );
  }

  const crop = cropForStage(
    video,
    stage
  );

  const modes =
    stage === 'DRIVER_ID'
      ? ['normal', 'soft', 'strong']
      : ['normal', 'soft', 'strong'];

  const results = [];

  for (
    let i = 0;
    i < modes.length;
    i += 1
  ) {
    const mode = modes[i];

    const progressStart =
      Math.round(
        (i / modes.length) * 90
      );

    const progressEnd =
      Math.round(
        ((i + 1) / modes.length) * 90
      );

    const canvas = createCapture(
      video,
      crop,
      mode
    );

    try {
      const result = await runOCR(
        canvas,
        stage,
        onProgress,
        progressStart,
        progressEnd
      );

      const cleanedText =
        cleanOCRText(
          result.text,
          stage
        );

      results.push({
        text: cleanedText,

        confidence: Math.max(
          0,
          Math.min(
            100,
            Math.round(
              result.confidence
            )
          )
        ),

        score: scoreResult(
          cleanedText,
          result.confidence,
          stage
        ),

        mode
      });
    } catch (error) {
      console.warn(
        `OCR mode "${mode}" failed:`,
        error
      );
    }
  }

  onProgress?.(100);

  if (!results.length) {
    throw new Error(
      'OCR could not process the captured image.'
    );
  }

  results.sort(
    (a, b) => b.score - a.score
  );

  const best = results[0];

  if (!best.text) {
    throw new Error(
      'No readable text was captured. Move the ID closer and scan again.'
    );
  }

  return {
    text: best.text,

    normalizedText:
      normalizeOCRText(best.text),

    confidence: best.confidence,

    capturedAt:
      new Date().toISOString()
  };
}