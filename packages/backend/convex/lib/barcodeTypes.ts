export type BarcodeSymbology = "code128" | "qr" | "ean13" | "ean8" | "upca";

export type BarcodeOutputFormat = "svg" | "png" | "json";

export type BarcodeFontEncoding = "libre-barcode-128";

export type BarcodeRunKind = "encode" | "decode" | "render";

export type BarcodeRunStatus =
  | "success"
  | "validation_error"
  | "not_found"
  | "unsupported_format"
  | "invalid_image";

export type Code128CodeSet = "A" | "B" | "C";

export type Code128Transition = {
  atInputIndex: number;
  toCodeSet: Code128CodeSet;
};

export type Code128Encoding = {
  plaintext: string;
  codeValues: number[];
  checksumValue: number;
  startCode: Code128CodeSet;
  codeSetTransitions: Code128Transition[];
  symbolPatterns: string[];
  moduleWidths: number[][];
  moduleCount: number;
};

export type Code128SvgRenderOptions = {
  moduleWidth?: number;
  barcodeHeight?: number;
  quietZoneModules?: number;
  foreground?: string;
  background?: string;
  labelText?: string;
  labelGap?: number;
  labelFontSize?: number;
  labelFontFamily?: string;
};

export type Code128SvgRender = {
  svg: string;
  width: number;
  height: number;
};

export type Code128PngRenderOptions = {
  moduleWidth?: number;
  barcodeHeight?: number;
  quietZoneModules?: number;
  foreground?: string;
  background?: string;
};

export type Code128PngRender = {
  pngBytes: Uint8Array;
  width: number;
  height: number;
};

export type LibreCode128Text = {
  encodedText: string;
  fontEncoding: BarcodeFontEncoding;
};

export type BarcodeBaseResult = {
  kind: BarcodeRunKind;
  symbology: BarcodeSymbology;
  status: BarcodeRunStatus;
  errorMessage?: string;
};

export type BarcodeEncodeResult = BarcodeBaseResult & {
  kind: "encode";
  plaintext?: string;
  encodedText?: string;
  fontEncoding?: BarcodeFontEncoding;
  canonicalEncoding?: Code128Encoding;
};

export type BarcodeRenderResult = BarcodeBaseResult & {
  kind: "render";
  plaintext?: string;
  encodedText?: string;
  fontEncoding?: BarcodeFontEncoding;
  checksumValue?: number;
  imageStorageId?: string;
  imageUrl?: string | null;
  svg?: string;
  pngBase64?: string;
  canonicalEncoding?: Code128Encoding;
  outputFormat?: BarcodeOutputFormat;
  runId?: string;
};

export type BarcodeDecodeResult = BarcodeBaseResult & {
  kind: "decode";
  plaintext?: string;
  format?: string;
  imageStorageId?: string;
  imageUrl?: string | null;
  runId?: string;
};

export type BarcodeEncodeActionResult = BarcodeEncodeResult & {
  runId?: string;
};
