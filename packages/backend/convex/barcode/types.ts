export type BarcodeSymbology = "code128" | "qr" | "ean13" | "ean8" | "upca";

export type BarcodeOutputFormat = "svg" | "png" | "json";

export type BarcodeOptionDefinition =
  | {
      kind: "number";
      label: string;
      default: number;
      min: number;
      max: number;
    }
  | {
      kind: "string";
      label: string;
      default: string;
      maxLength: number;
    }
  | {
      kind: "color";
      label: string;
      default: string;
    }
  | {
      kind: "enum";
      label: string;
      default: string;
      values: string[];
    }
  | {
      kind: "boolean";
      label: string;
      default: boolean;
    };

export type BarcodeTypeDefinition = {
  symbology: BarcodeSymbology;
  displayName: string;
  aliases: string[];
  autoPattern: RegExp;
  extendedPattern: RegExp;
  priority: number;
  supportsEncode: boolean;
  supportsDecode: boolean;
  supportsSvg: boolean;
  supportsPng: boolean;
  cacheable: boolean;
  cost: {
    basic: number;
    custom: number;
  };
  examples: string[];
  options: Record<string, BarcodeOptionDefinition>;
};

const CODE128_EXTENDED_PATTERN = new RegExp(
  `^[${String.fromCharCode(0)}-${String.fromCharCode(126)}]{1,1024}$`,
);

export const BARCODE_TYPES = {
  code128: {
    symbology: "code128",
    displayName: "Code 128",
    aliases: ["128", "code-128", "code128"],
    autoPattern: /^[ !#$()*./0-9=?A-Za-z~]{1,12}$/,
    extendedPattern: CODE128_EXTENDED_PATTERN,
    priority: 65,
    supportsEncode: true,
    supportsDecode: true,
    supportsSvg: true,
    supportsPng: true,
    cacheable: true,
    cost: { basic: 2, custom: 3 },
    examples: ["WO20070317", "SKU12345"],
    options: {
      moduleWidth: { kind: "number", label: "Module width", default: 2, min: 1, max: 20 },
      barcodeHeight: { kind: "number", label: "Barcode height", default: 72, min: 20, max: 500 },
      quietZoneModules: { kind: "number", label: "Quiet zone", default: 10, min: 0, max: 50 },
      foreground: { kind: "color", label: "Foreground", default: "#111111" },
      background: { kind: "color", label: "Background", default: "#ffffff" },
      labelText: { kind: "string", label: "Label", default: "", maxLength: 256 },
      labelGap: { kind: "number", label: "Label gap", default: 8, min: 0, max: 80 },
      labelFontSize: { kind: "number", label: "Label size", default: 14, min: 6, max: 80 },
      labelFontFamily: { kind: "string", label: "Label font", default: "monospace", maxLength: 80 },
    },
  },
  qr: {
    symbology: "qr",
    displayName: "QR Code",
    aliases: ["qr", "qr-code", "qrcode"],
    autoPattern: /^.{1,64}$/,
    extendedPattern: /^.{1,65535}$/,
    priority: 58,
    supportsEncode: true,
    supportsDecode: true,
    supportsSvg: true,
    supportsPng: true,
    cacheable: true,
    cost: { basic: 3, custom: 3 },
    examples: ["QR Barcode"],
    options: {
      size: { kind: "number", label: "Size", default: 275, min: 50, max: 500 },
      qz: { kind: "number", label: "Quiet zone", default: 2, min: 0, max: 8 },
      correction: {
        kind: "enum",
        label: "Error correction",
        default: "M",
        values: ["M", "L", "H", "Q"],
      },
      foreground: { kind: "color", label: "Foreground", default: "#111111" },
      background: { kind: "color", label: "Background", default: "#ffffff" },
    },
  },
  ean13: {
    symbology: "ean13",
    displayName: "EAN 13",
    aliases: ["13", "ean-13", "ean13"],
    autoPattern: /^[0-9]{13}$/,
    extendedPattern: /^[0-9]{12,13}(\+(([0-9]{2})|([0-9]{5}))){0,1}$/,
    priority: 85,
    supportsEncode: true,
    supportsDecode: true,
    supportsSvg: true,
    supportsPng: true,
    cacheable: true,
    cost: { basic: 1, custom: 2 },
    examples: ["1234567890128", "1123332122321+11252"],
    options: linearOptions(),
  },
  ean8: {
    symbology: "ean8",
    displayName: "EAN 8",
    aliases: ["8", "ean-8", "ean8"],
    autoPattern: /^[0-9]{8}$/,
    extendedPattern: /^[0-9]{7,8}(\+(([0-9]{2})|([0-9]{5}))){0,1}$/,
    priority: 88,
    supportsEncode: true,
    supportsDecode: true,
    supportsSvg: true,
    supportsPng: true,
    cacheable: true,
    cost: { basic: 1, custom: 2 },
    examples: ["01234565"],
    options: linearOptions(),
  },
  upca: {
    symbology: "upca",
    displayName: "UPC A",
    aliases: ["a", "upc-a", "upca", "upc"],
    autoPattern: /^[0-9]{12}$/,
    extendedPattern: /^[0-9]{11,12}(\+(([0-9]{2})|([0-9]{5}))){0,1}$/,
    priority: 95,
    supportsEncode: true,
    supportsDecode: true,
    supportsSvg: true,
    supportsPng: true,
    cacheable: true,
    cost: { basic: 1, custom: 3 },
    examples: ["123456789012"],
    options: linearOptions(),
  },
} satisfies Partial<Record<BarcodeSymbology, BarcodeTypeDefinition>>;

function linearOptions(): Record<string, BarcodeOptionDefinition> {
  return {
    moduleWidth: { kind: "number", label: "Module width", default: 2, min: 1, max: 20 },
    barcodeHeight: { kind: "number", label: "Barcode height", default: 72, min: 20, max: 500 },
    quietZoneModules: { kind: "number", label: "Quiet zone", default: 10, min: 0, max: 50 },
    foreground: { kind: "color", label: "Foreground", default: "#111111" },
    background: { kind: "color", label: "Background", default: "#ffffff" },
  };
}

export type BarcodeTypeClientDefinition = Omit<
  BarcodeTypeDefinition,
  "autoPattern" | "extendedPattern"
>;

export function listBarcodeTypesForClient(): BarcodeTypeClientDefinition[] {
  return Object.values(BARCODE_TYPES)
    .sort((a, b) => b.priority - a.priority)
    .map(({ autoPattern: _autoPattern, extendedPattern: _extendedPattern, ...type }) => type);
}

export function resolveBarcodeTypeAlias(alias: string): BarcodeTypeDefinition | null {
  const normalizedAlias = alias.trim().toLowerCase();
  if (!normalizedAlias || normalizedAlias === "auto") return null;

  for (const type of Object.values(BARCODE_TYPES)) {
    if (type.symbology === normalizedAlias || type.aliases.includes(normalizedAlias)) {
      return type;
    }
  }

  return null;
}

export function selectBarcodeTypeFromData(data: string): BarcodeTypeDefinition | null {
  return (
    Object.values(BARCODE_TYPES)
      .filter((type) => type.autoPattern.test(data))
      .sort((a, b) => b.priority - a.priority)[0] ?? null
  );
}

export function getBarcodeType(symbology: BarcodeSymbology): BarcodeTypeDefinition {
  const type = (BARCODE_TYPES as Partial<Record<BarcodeSymbology, BarcodeTypeDefinition>>)[
    symbology
  ];
  if (!type) throw new Error(`Unsupported barcode type: ${symbology}`);
  return type;
}
