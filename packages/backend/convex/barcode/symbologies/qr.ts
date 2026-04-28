import {
  BarcodeFormat,
  EncodeHintType,
  QRCodeDecoderErrorCorrectionLevel,
  QRCodeWriter,
} from "@zxing/library";

import type { NormalizedBarcodeRequest } from "../request";

export type BarcodeMatrix = {
  width: number;
  height: number;
  get: (x: number, y: number) => boolean;
};

export function encodeQrMatrix(request: NormalizedBarcodeRequest): BarcodeMatrix {
  const size = Number(request.options.size ?? 275);
  const quietZone = Number(request.options.qz ?? 2);
  const correction = String(request.options.correction ?? "M");
  const hints = new Map<EncodeHintType, unknown>();
  hints.set(EncodeHintType.MARGIN, quietZone);
  hints.set(
    EncodeHintType.ERROR_CORRECTION,
    QRCodeDecoderErrorCorrectionLevel.fromString(correction),
  );

  const matrix = new QRCodeWriter().encode(
    request.plaintext,
    BarcodeFormat.QR_CODE,
    size,
    size,
    hints,
  );
  return {
    width: matrix.getWidth(),
    height: matrix.getHeight(),
    get: (x, y) => matrix.get(x, y),
  };
}
