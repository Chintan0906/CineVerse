const DEFAULT_AURA_RGB = "94, 234, 212";
const auraCache = new Map();

/**
 * Extracts a vibrant, balanced dominant RGB triplet ("r, g, b") from a poster/backdrop URL.
 * Falls back cleanly if CORS or image decoding fails.
 */
export async function extractAuraRgb(imageUrl) {
  if (!imageUrl || typeof window === "undefined") {
    return DEFAULT_AURA_RGB;
  }

  if (auraCache.has(imageUrl)) {
    return auraCache.get(imageUrl);
  }

  try {
    const rgb = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";

      const timer = setTimeout(() => resolve(DEFAULT_AURA_RGB), 2800);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement("canvas");
          const size = 18;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            resolve(DEFAULT_AURA_RGB);
            return;
          }
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);

          let bestWeight = 0;
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            if (a < 140) continue;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const lum = (max + min) / 510;
            const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255) || 1);

            // Skip near-black or near-white pixels so the ambient aura has rich color
            if (lum < 0.14 || lum > 0.9) continue;

            const weight = 0.25 + sat * 2.4;
            sumR += r * weight;
            sumG += g * weight;
            sumB += b * weight;
            bestWeight += weight;
          }

          if (bestWeight <= 0) {
            resolve(DEFAULT_AURA_RGB);
            return;
          }

          // Lift slightly if dark so ambient glow remains visible on #0b0b0c
          let avgR = Math.round(sumR / bestWeight);
          let avgG = Math.round(sumG / bestWeight);
          let avgB = Math.round(sumB / bestWeight);
          const peak = Math.max(avgR, avgG, avgB);
          if (peak > 0 && peak < 155) {
            const boost = 155 / peak;
            avgR = Math.min(255, Math.round(avgR * boost));
            avgG = Math.min(255, Math.round(avgG * boost));
            avgB = Math.min(255, Math.round(avgB * boost));
          }

          resolve(`${avgR}, ${avgG}, ${avgB}`);
        } catch (_) {
          resolve(DEFAULT_AURA_RGB);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(DEFAULT_AURA_RGB);
      };

      img.src = imageUrl;
    });

    auraCache.set(imageUrl, rgb);
    return rgb;
  } catch (_) {
    return DEFAULT_AURA_RGB;
  }
}
