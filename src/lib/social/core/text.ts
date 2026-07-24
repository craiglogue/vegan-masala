export function cleanPromoText(text?: string) {
  return String(text || "")
    .replace(/\bpacked with flavour\b/gi, "")
    .replace(/\bperfect weeknight meal\b/gi, "")
    .replace(/\brestaurant-quality\b/gi, "")
    .replace(/\bcomes together beautifully\b/gi, "")
    .replace(/\bwritten in the style of\b/gi, "")
    .replace(/\bflavour-packed\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstSentence(text?: string) {
  const clean = cleanPromoText(text);
  return clean.split(/[.!?]/)[0].trim();
}

export function limitWords(text: string, maxWords: number) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export function wrapWords(text: string, maxChars: number) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function fitWrappedTextBlock(options: {
  text: string;
  baseChars: number;
  baseFontSize: number;
  baseLineHeight: number;
  maxHeight: number;
  minFontSize?: number;
  step?: number;
}) {
  const {
    text,
    baseChars,
    baseFontSize,
    baseLineHeight,
    maxHeight,
    minFontSize = 14,
    step = 2,
  } = options;

  const cleaned = cleanPromoText(text);
  if (!cleaned) {
    return {
      lines: [],
      fontSize: baseFontSize,
      lineHeight: baseLineHeight,
    };
  }

  for (let fontSize = baseFontSize; fontSize >= minFontSize; fontSize -= step) {
    const scale = fontSize / baseFontSize;
    const chars = Math.max(12, Math.floor(baseChars / scale));
    const lineHeight = Math.max(fontSize + 4, Math.round(baseLineHeight * scale));
    const lines = wrapWords(cleaned, chars);

    if (lines.length * lineHeight <= maxHeight) {
      return {
        lines,
        fontSize,
        lineHeight,
      };
    }
  }

  const fallbackFont = minFontSize;
  const fallbackScale = fallbackFont / baseFontSize;
  const fallbackChars = Math.max(12, Math.floor(baseChars / fallbackScale));
  const fallbackLineHeight = Math.max(
    fallbackFont + 4,
    Math.round(baseLineHeight * fallbackScale)
  );

  return {
    lines: wrapWords(cleaned, fallbackChars),
    fontSize: fallbackFont,
    lineHeight: fallbackLineHeight,
  };
}