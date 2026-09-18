const spoilageKeywords = [
  'spoiled',
  'spoilt',
  'rotten',
  'rotting',
  'rot',
  'mold',
  'mould',
  'moldy',
  'mouldy',
  'fungus',
  'fungal',
  'fungi',
  'mildew',
  'decayed',
  'decay',
  'decomposed',
  'soft spots',
  'soft patch',
  'black spots',
  'black patch',
  'brown spots',
  'white growth',
  'green growth',
  'fuzzy growth',
  'discolored',
  'discolour',
  'wilting',
  'bruised',
  'bad smell',
  'sour smell',
  'foul smell',
  'mushy',
  'leaking',
  'slimy'
];

const containsSpoilageSignal = (listing = {}) => {
  const haystack = [
    listing?.name,
    listing?.description,
    listing?.harvest,
    listing?.pickedStatus,
    listing?.productionMethod,
    listing?.category
  ].filter(Boolean).join(' ').toLowerCase();

  const normalized = haystack.replace(/[._-]+/g, ' ');
  return spoilageKeywords.some((keyword) => normalized.includes(keyword));
};

const analyzeImageForSpoilage = async (photo) => {
  if (!photo || typeof photo !== 'string' || !photo.startsWith('data:image/')) return false;
  if (typeof document === 'undefined') return false;

  try {
    const image = new Image();
    image.decoding = 'async';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = photo;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return false;

    const sampleSize = Math.max(1, Math.floor(Math.min(image.width, image.height) / 20));
    canvas.width = Math.max(1, Math.floor(image.width / sampleSize));
    canvas.height = Math.max(1, Math.floor(image.height / sampleSize));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    let suspiciousPixels = 0;
    let totalPixels = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];
      if (alpha < 128) continue;

      totalPixels += 1;
      const brightness = (red + green + blue) / 3;
      const variance = Math.abs(red - green) + Math.abs(green - blue) + Math.abs(red - blue);
      const isDark = brightness < 160;
      const isMoldTone = green > red && green > blue && brightness < 200 && variance < 120;
      const isRottenTone = red > 80 && green < 120 && blue < 120 && brightness < 200;
      const isDull = variance < 60 && brightness < 170;

      if ((isDark && (isMoldTone || isRottenTone || isDull)) || (brightness < 100 && variance < 90)) {
        suspiciousPixels += 1;
      }
    }

    return totalPixels > 0 && (suspiciousPixels / totalPixels) > 0.22;
  } catch {
    return false;
  }
};

export const calculateAiFreshnessScore = (listing = {}) => {
  const safeListing = {
    pickedStatus: listing?.pickedStatus || 'Picked just now',
    productionMethod: listing?.productionMethod || (listing?.organic ? 'Organic' : 'Conventional'),
    expiryDate: listing?.expiryDate || '',
    photo: Boolean(listing?.photo)
  };

  if (containsSpoilageSignal(listing)) return 0;

  const pickedScore = {
    'Picked just now': 25,
    'Picked today': 20,
    'Picked before 2 days': 12,
    'Picked before 3 days': 6,
    'Harvested this week': 0
  }[safeListing.pickedStatus] ?? 0;

  let expiryScore = 0;
  if (safeListing.expiryDate) {
    const expiryDate = new Date(`${safeListing.expiryDate}T23:59:59`);
    if (!Number.isNaN(expiryDate.getTime())) {
      const expiryDays = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
      expiryScore = expiryDays >= 5 ? 20 : expiryDays >= 3 ? 15 : expiryDays >= 1 ? 8 : expiryDays >= 0 ? 4 : 0;
      if (expiryDate.getTime() < Date.now()) return 0;
    }
  }

  const methodScore = ['Organic', 'Natural'].includes(safeListing.productionMethod) ? 8 : 4;
  const baseScore = 42;
  return Math.min(100, Math.max(0, baseScore + pickedScore + expiryScore + methodScore + (safeListing.photo ? 8 : 0)));
};

export const analyzeProduceScan = async (listing = {}) => {
  const baseScore = calculateAiFreshnessScore(listing);
  if (baseScore === 0) {
    return { score: 0, rejected: true, reason: 'AI safety scan detected spoilage, fungus, or an expired item.' };
  }

  if (listing?.photo) {
    const imageSpoilage = await analyzeImageForSpoilage(listing.photo);
    if (imageSpoilage) {
      return { score: 0, rejected: true, reason: 'AI safety scan detected fungus or spoilage in the uploaded image.' };
    }
  }

  return {
    score: baseScore,
    rejected: baseScore < 75,
    reason: baseScore >= 75 ? 'Freshness looks acceptable.' : 'Produce needs to be fresher or the expiry details must be corrected.'
  };
};

export const isFreshnessPublishEligible = (listing = {}) => {
  const score = calculateAiFreshnessScore(listing);
  if (score <= 0) return false;
  return score >= 75;
};
