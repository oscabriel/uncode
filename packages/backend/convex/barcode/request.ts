import type { BarcodeOutputFormat, BarcodeSymbology, BarcodeTypeDefinition } from "./types";
import { getBarcodeType, resolveBarcodeTypeAlias, selectBarcodeTypeFromData } from "./types";

export type BarcodeOptionValue = string | number | boolean;

export type NormalizedBarcodeRequest = {
  symbology: BarcodeSymbology;
  plaintext: string;
  outputFormat: BarcodeOutputFormat;
  options: Record<string, BarcodeOptionValue>;
  isCustom: boolean;
  cost: number;
};

export class BarcodeRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "BarcodeRequestError";
    this.status = status;
  }
}

type RawNormalizeArgs = {
  symbology?: string;
  plaintext: string;
  outputFormat?: BarcodeOutputFormat;
  options?: Record<string, BarcodeOptionValue>;
};

function resolveBarcodeType(
  symbology: string | undefined,
  plaintext: string,
): BarcodeTypeDefinition {
  if (symbology && symbology.trim().toLowerCase() !== "auto") {
    const explicitType = resolveBarcodeTypeAlias(symbology);
    if (!explicitType) throw new BarcodeRequestError(`Unknown barcode type: ${symbology}`);
    return explicitType;
  }

  const selectedType = selectBarcodeTypeFromData(plaintext);
  if (!selectedType)
    throw new BarcodeRequestError("Unable to auto-select a barcode type for this data.");
  return selectedType;
}

function parseCode128ControlChars(data: string) {
  let parsed = "";
  for (let index = 0; index < data.length; index += 1) {
    if (data[index] === "$" && data[index + 1] === "$" && data[index + 2]) {
      parsed += String.fromCharCode(data.charCodeAt(index + 2) - 64);
      index += 2;
      continue;
    }
    parsed += data[index];
  }
  return parsed;
}

export function validateBarcodeData(type: BarcodeTypeDefinition, plaintext: string) {
  if (plaintext.length === 0) throw new BarcodeRequestError("Barcode text cannot be empty.");
  if (!type.extendedPattern.test(plaintext)) {
    throw new BarcodeRequestError(`${type.displayName} does not support the supplied text.`);
  }
}

function parseBooleanOption(name: string, value: BarcodeOptionValue) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new BarcodeRequestError(`${name} must be true or false.`);
}

function parseColorOption(name: string, value: BarcodeOptionValue) {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new BarcodeRequestError(`${name} must be a hex color like #111111.`);
  }
  return value;
}

export function parseBarcodeOptions(
  type: BarcodeTypeDefinition,
  rawOptions: Record<string, BarcodeOptionValue> = {},
) {
  const options: Record<string, BarcodeOptionValue> = {};

  for (const [name, value] of Object.entries(rawOptions)) {
    if (value === "" || value === undefined) continue;

    const definition = type.options[name];
    if (!definition)
      throw new BarcodeRequestError(`Unknown option for ${type.displayName}: ${name}`);

    let parsedValue: BarcodeOptionValue;
    switch (definition.kind) {
      case "number": {
        const numberValue = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(numberValue))
          throw new BarcodeRequestError(`${name} must be a number.`);
        if (numberValue < definition.min || numberValue > definition.max) {
          throw new BarcodeRequestError(
            `${name} must be between ${definition.min} and ${definition.max}.`,
          );
        }
        parsedValue = numberValue;
        break;
      }
      case "string": {
        if (typeof value !== "string") throw new BarcodeRequestError(`${name} must be text.`);
        if (value.length > definition.maxLength) {
          throw new BarcodeRequestError(
            `${name} must be ${definition.maxLength} characters or fewer.`,
          );
        }
        parsedValue = value;
        break;
      }
      case "color":
        parsedValue = parseColorOption(name, value);
        break;
      case "enum": {
        if (typeof value !== "string" || !definition.values.includes(value)) {
          throw new BarcodeRequestError(`${name} must be one of: ${definition.values.join(", ")}.`);
        }
        parsedValue = value;
        break;
      }
      case "boolean":
        parsedValue = parseBooleanOption(name, value);
        break;
    }

    if (parsedValue !== definition.default) options[name] = parsedValue;
  }

  return options;
}

export function normalizeBarcodeRequest(args: RawNormalizeArgs): NormalizedBarcodeRequest {
  const type = resolveBarcodeType(args.symbology, args.plaintext);
  const plaintext =
    type.symbology === "code128" ? parseCode128ControlChars(args.plaintext) : args.plaintext;
  validateBarcodeData(type, plaintext);

  const outputFormat = args.outputFormat ?? "svg";
  if (outputFormat === "svg" && !type.supportsSvg) {
    throw new BarcodeRequestError(`${type.displayName} does not support SVG output.`, 422);
  }
  if (outputFormat === "png" && !type.supportsPng) {
    throw new BarcodeRequestError(`${type.displayName} does not support PNG output.`, 422);
  }
  if (outputFormat === "json" && !type.supportsEncode) {
    throw new BarcodeRequestError(
      `${type.displayName} does not support JSON encoding output.`,
      422,
    );
  }

  const options = parseBarcodeOptions(type, args.options);
  const isCustom = Object.keys(options).length > 0;

  return {
    symbology: type.symbology,
    plaintext,
    outputFormat,
    options,
    isCustom,
    cost: isCustom ? type.cost.custom : type.cost.basic,
  };
}

export function normalizeBarcodeHttpRequest(request: Request, outputFormat: BarcodeOutputFormat) {
  const url = new URL(request.url);
  const plaintext = url.searchParams.get("text") ?? "";
  const symbology = url.searchParams.get("type") ?? undefined;
  const type = symbology ? resolveBarcodeTypeAlias(symbology) : getBarcodeType("code128");
  const rawOptions: Record<string, BarcodeOptionValue> = {};

  if (type) {
    for (const name of Object.keys(type.options)) {
      const value = url.searchParams.get(name);
      if (value !== null) rawOptions[name] = value;
    }
  }

  const label = url.searchParams.get("label");
  if (label !== null) {
    rawOptions.labelText = label === "true" ? plaintext : label === "false" ? "" : label;
  }

  return normalizeBarcodeRequest({
    symbology: symbology ?? "code128",
    plaintext,
    outputFormat,
    options: rawOptions,
  });
}
