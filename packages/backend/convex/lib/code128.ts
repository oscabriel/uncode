import type { Code128CodeSet, Code128Encoding, Code128Transition } from "./barcodeTypes";

type EncodingPlan = {
  codeValues: number[];
  transitions: Code128Transition[];
  symbolCount: number;
};

const START_CODE_VALUES: Record<Code128CodeSet, number> = {
  A: 103,
  B: 104,
  C: 105,
};

const SWITCH_CODE_VALUES: Record<Code128CodeSet, number> = {
  A: 101,
  B: 100,
  C: 99,
};

export const CODE128_STOP_VALUE = 106;

export const CODE128_PATTERNS = [
  "11011001100",
  "11001101100",
  "11001100110",
  "10010011000",
  "10010001100",
  "10001001100",
  "10011001000",
  "10011000100",
  "10001100100",
  "11001001000",
  "11001000100",
  "11000100100",
  "10110011100",
  "10011011100",
  "10011001110",
  "10111001100",
  "10011101100",
  "10011100110",
  "11001110010",
  "11001011100",
  "11001001110",
  "11011100100",
  "11001110100",
  "11101101110",
  "11101001100",
  "11100101100",
  "11100100110",
  "11101100100",
  "11100110100",
  "11100110010",
  "11011011000",
  "11011000110",
  "11000110110",
  "10100011000",
  "10001011000",
  "10001000110",
  "10110001000",
  "10001101000",
  "10001100010",
  "11010001000",
  "11000101000",
  "11000100010",
  "10110111000",
  "10110001110",
  "10001101110",
  "10111011000",
  "10111000110",
  "10001110110",
  "11101110110",
  "11010001110",
  "11000101110",
  "11011101000",
  "11011100010",
  "11011101110",
  "11101011000",
  "11101000110",
  "11100010110",
  "11101101000",
  "11101100010",
  "11100011010",
  "11101111010",
  "11001000010",
  "11110001010",
  "10100110000",
  "10100001100",
  "10010110000",
  "10010000110",
  "10000101100",
  "10000100110",
  "10110010000",
  "10110000100",
  "10011010000",
  "10011000010",
  "10000110100",
  "10000110010",
  "11000010010",
  "11001010000",
  "11110111010",
  "11000010100",
  "10001111010",
  "10100111100",
  "10010111100",
  "10010011110",
  "10111100100",
  "10011110100",
  "10011110010",
  "11110100100",
  "11110010100",
  "11110010010",
  "11011011110",
  "11011110110",
  "11110110110",
  "10101111000",
  "10100011110",
  "10001011110",
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
  "11010000100",
  "11010010000",
  "11010011100",
  "1100011101011",
] as const;

const EMPTY_PLAN: EncodingPlan = {
  codeValues: [],
  transitions: [],
  symbolCount: 0,
};

function assertSupportedInput(plaintext: string) {
  if (plaintext.length === 0) {
    throw new Error("Plaintext is required for Code 128 encoding.");
  }

  for (const character of plaintext) {
    const codePoint = character.charCodeAt(0);
    if (codePoint < 0 || codePoint > 126) {
      throw new Error(
        `Unsupported character ${JSON.stringify(character)}. Code 128 encoding currently supports ASCII 0-126.`,
      );
    }
  }
}

function isNumericPair(plaintext: string, index: number) {
  return /^\d{2}$/.test(plaintext.slice(index, index + 2));
}

function codeValueForCodeSetB(character: string) {
  return character.charCodeAt(0) - 32;
}

function canEncodeInCodeSetA(character: string) {
  return character.charCodeAt(0) <= 95;
}

function canEncodeInCodeSetB(character: string) {
  const codePoint = character.charCodeAt(0);
  return codePoint >= 32 && codePoint <= 126;
}

function codeValueForCodeSetA(character: string) {
  const codePoint = character.charCodeAt(0);
  return codePoint < 32 ? codePoint + 64 : codePoint - 32;
}

function codeValueForCodeSetC(plaintext: string, index: number) {
  return Number(plaintext.slice(index, index + 2));
}

function chooseBetterPlan(
  currentPlan: EncodingPlan | null,
  candidatePlan: EncodingPlan,
  preferCandidateOnTie = false,
) {
  if (!currentPlan) {
    return candidatePlan;
  }

  if (candidatePlan.symbolCount < currentPlan.symbolCount) {
    return candidatePlan;
  }

  if (candidatePlan.symbolCount === currentPlan.symbolCount && preferCandidateOnTie) {
    return candidatePlan;
  }

  return currentPlan;
}

function encodeFromCodeSetB(
  plaintext: string,
  index: number,
  memoA: Map<number, EncodingPlan>,
  memoB: Map<number, EncodingPlan>,
  memoC: Map<number, EncodingPlan>,
): EncodingPlan {
  if (index >= plaintext.length) {
    return EMPTY_PLAN;
  }

  const cachedPlan = memoB.get(index);
  if (cachedPlan) {
    return cachedPlan;
  }

  let bestPlan: EncodingPlan | null = null;

  if (canEncodeInCodeSetB(plaintext[index]!)) {
    const nextPlan = encodeFromCodeSetB(plaintext, index + 1, memoA, memoB, memoC);
    bestPlan = {
      codeValues: [codeValueForCodeSetB(plaintext[index]!), ...nextPlan.codeValues],
      transitions: nextPlan.transitions,
      symbolCount: 1 + nextPlan.symbolCount,
    };
  }

  if (isNumericPair(plaintext, index)) {
    const afterSwitchPlan = encodeFromCodeSetC(plaintext, index + 2, memoA, memoB, memoC);
    const switchPlan: EncodingPlan = {
      codeValues: [
        SWITCH_CODE_VALUES.C,
        codeValueForCodeSetC(plaintext, index),
        ...afterSwitchPlan.codeValues,
      ],
      transitions: [{ atInputIndex: index, toCodeSet: "C" }, ...afterSwitchPlan.transitions],
      symbolCount: 2 + afterSwitchPlan.symbolCount,
    };

    bestPlan = chooseBetterPlan(bestPlan, switchPlan);
  }

  if (canEncodeInCodeSetA(plaintext[index]!)) {
    const afterSwitchPlan = encodeFromCodeSetA(plaintext, index + 1, memoA, memoB, memoC);
    const switchPlan: EncodingPlan = {
      codeValues: [
        SWITCH_CODE_VALUES.A,
        codeValueForCodeSetA(plaintext[index]!),
        ...afterSwitchPlan.codeValues,
      ],
      transitions: [{ atInputIndex: index, toCodeSet: "A" }, ...afterSwitchPlan.transitions],
      symbolCount: 2 + afterSwitchPlan.symbolCount,
    };

    bestPlan = chooseBetterPlan(bestPlan, switchPlan);
  }

  if (!bestPlan) {
    throw new Error(`Unsupported character ${JSON.stringify(plaintext[index])}.`);
  }

  memoB.set(index, bestPlan);
  return bestPlan;
}

function encodeFromCodeSetA(
  plaintext: string,
  index: number,
  memoA: Map<number, EncodingPlan>,
  memoB: Map<number, EncodingPlan>,
  memoC: Map<number, EncodingPlan>,
): EncodingPlan {
  if (index >= plaintext.length) {
    return EMPTY_PLAN;
  }

  const cachedPlan = memoA.get(index);
  if (cachedPlan) {
    return cachedPlan;
  }

  let bestPlan: EncodingPlan | null = null;

  if (canEncodeInCodeSetA(plaintext[index]!)) {
    const nextPlan = encodeFromCodeSetA(plaintext, index + 1, memoA, memoB, memoC);
    bestPlan = {
      codeValues: [codeValueForCodeSetA(plaintext[index]!), ...nextPlan.codeValues],
      transitions: nextPlan.transitions,
      symbolCount: 1 + nextPlan.symbolCount,
    };
  }

  if (canEncodeInCodeSetB(plaintext[index]!)) {
    const afterSwitchPlan = encodeFromCodeSetB(plaintext, index + 1, memoA, memoB, memoC);
    const switchPlan: EncodingPlan = {
      codeValues: [
        SWITCH_CODE_VALUES.B,
        codeValueForCodeSetB(plaintext[index]!),
        ...afterSwitchPlan.codeValues,
      ],
      transitions: [{ atInputIndex: index, toCodeSet: "B" }, ...afterSwitchPlan.transitions],
      symbolCount: 2 + afterSwitchPlan.symbolCount,
    };
    bestPlan = chooseBetterPlan(bestPlan, switchPlan);
  }

  if (isNumericPair(plaintext, index)) {
    const afterSwitchPlan = encodeFromCodeSetC(plaintext, index + 2, memoA, memoB, memoC);
    const switchPlan: EncodingPlan = {
      codeValues: [
        SWITCH_CODE_VALUES.C,
        codeValueForCodeSetC(plaintext, index),
        ...afterSwitchPlan.codeValues,
      ],
      transitions: [{ atInputIndex: index, toCodeSet: "C" }, ...afterSwitchPlan.transitions],
      symbolCount: 2 + afterSwitchPlan.symbolCount,
    };
    bestPlan = chooseBetterPlan(bestPlan, switchPlan);
  }

  if (!bestPlan) {
    throw new Error(`Unsupported character ${JSON.stringify(plaintext[index])}.`);
  }

  memoA.set(index, bestPlan);
  return bestPlan;
}

function encodeFromCodeSetC(
  plaintext: string,
  index: number,
  memoA: Map<number, EncodingPlan>,
  memoB: Map<number, EncodingPlan>,
  memoC: Map<number, EncodingPlan>,
): EncodingPlan {
  if (index >= plaintext.length) {
    return EMPTY_PLAN;
  }

  const cachedPlan = memoC.get(index);
  if (cachedPlan) {
    return cachedPlan;
  }

  let bestPlan: EncodingPlan | null = null;

  if (isNumericPair(plaintext, index)) {
    const nextPlan = encodeFromCodeSetC(plaintext, index + 2, memoA, memoB, memoC);
    bestPlan = {
      codeValues: [codeValueForCodeSetC(plaintext, index), ...nextPlan.codeValues],
      transitions: nextPlan.transitions,
      symbolCount: 1 + nextPlan.symbolCount,
    };
  }

  if (canEncodeInCodeSetB(plaintext[index]!)) {
    const afterSwitchPlan = encodeFromCodeSetB(plaintext, index + 1, memoA, memoB, memoC);
    const switchPlan: EncodingPlan = {
      codeValues: [
        SWITCH_CODE_VALUES.B,
        codeValueForCodeSetB(plaintext[index]!),
        ...afterSwitchPlan.codeValues,
      ],
      transitions: [{ atInputIndex: index, toCodeSet: "B" }, ...afterSwitchPlan.transitions],
      symbolCount: 2 + afterSwitchPlan.symbolCount,
    };

    bestPlan = chooseBetterPlan(bestPlan, switchPlan);
  }

  if (canEncodeInCodeSetA(plaintext[index]!)) {
    const afterSwitchPlan = encodeFromCodeSetA(plaintext, index + 1, memoA, memoB, memoC);
    const switchPlan: EncodingPlan = {
      codeValues: [
        SWITCH_CODE_VALUES.A,
        codeValueForCodeSetA(plaintext[index]!),
        ...afterSwitchPlan.codeValues,
      ],
      transitions: [{ atInputIndex: index, toCodeSet: "A" }, ...afterSwitchPlan.transitions],
      symbolCount: 2 + afterSwitchPlan.symbolCount,
    };

    bestPlan = chooseBetterPlan(bestPlan, switchPlan);
  }

  if (!bestPlan) {
    throw new Error(`Unsupported character ${JSON.stringify(plaintext[index])}.`);
  }
  memoC.set(index, bestPlan);
  return bestPlan;
}

function calculateChecksum(codeValues: number[]) {
  let checksum = codeValues[0] ?? 0;

  for (let index = 1; index < codeValues.length; index += 1) {
    checksum += codeValues[index]! * index;
  }

  return checksum % 103;
}

function patternToModuleWidths(pattern: string) {
  const moduleWidths: number[] = [];
  let currentBit = pattern[0];
  let currentWidth = 0;

  for (const bit of pattern) {
    if (bit === currentBit) {
      currentWidth += 1;
      continue;
    }

    moduleWidths.push(currentWidth);
    currentBit = bit;
    currentWidth = 1;
  }

  moduleWidths.push(currentWidth);
  return moduleWidths;
}

export function encodeCode128(plaintext: string): Code128Encoding {
  assertSupportedInput(plaintext);

  const memoA = new Map<number, EncodingPlan>();
  const memoB = new Map<number, EncodingPlan>();
  const memoC = new Map<number, EncodingPlan>();

  const startInCodeSetB = canEncodeInCodeSetB(plaintext[0]!)
    ? encodeFromCodeSetB(plaintext, 0, memoA, memoB, memoC)
    : null;
  const startInCodeSetA = canEncodeInCodeSetA(plaintext[0]!)
    ? encodeFromCodeSetA(plaintext, 0, memoA, memoB, memoC)
    : null;
  let startCode: Code128CodeSet = startInCodeSetB ? "B" : "A";
  let bestPlan = startInCodeSetB ?? startInCodeSetA;

  if (!bestPlan) {
    throw new Error(`Unsupported character ${JSON.stringify(plaintext[0])}.`);
  }

  if (startInCodeSetA) {
    bestPlan = chooseBetterPlan(bestPlan, startInCodeSetA);
    if (
      bestPlan === startInCodeSetA &&
      (!startInCodeSetB || startInCodeSetA.symbolCount < startInCodeSetB.symbolCount)
    ) {
      startCode = "A";
    }
  }

  if (isNumericPair(plaintext, 0)) {
    const previousBestPlan = bestPlan;
    const startInCodeSetC = encodeFromCodeSetC(plaintext, 0, memoA, memoB, memoC);
    bestPlan = chooseBetterPlan(bestPlan, startInCodeSetC);

    if (
      bestPlan === startInCodeSetC &&
      startInCodeSetC.symbolCount < previousBestPlan.symbolCount
    ) {
      startCode = "C";
    }
  }

  const codeValuesWithoutChecksum = [START_CODE_VALUES[startCode], ...bestPlan.codeValues];
  const checksumValue = calculateChecksum(codeValuesWithoutChecksum);
  const codeValues = [...codeValuesWithoutChecksum, checksumValue, CODE128_STOP_VALUE];
  const symbolPatterns = codeValues.map((codeValue) => CODE128_PATTERNS[codeValue]!);
  const moduleWidths = symbolPatterns.map(patternToModuleWidths);
  const moduleCount = moduleWidths.reduce(
    (totalWidth, widths) => totalWidth + widths.reduce((sum, width) => sum + width, 0),
    0,
  );

  return {
    plaintext,
    codeValues,
    checksumValue,
    startCode,
    codeSetTransitions: bestPlan.transitions,
    symbolPatterns,
    moduleWidths,
    moduleCount,
  };
}
