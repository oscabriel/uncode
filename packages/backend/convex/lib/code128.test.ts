import { describe, expect, it } from "vitest";

import { encodeCode128 } from "./code128";

describe("encodeCode128", () => {
  it("encodes mixed input and switches into Code Set C for long numeric runs", () => {
    const encoding = encodeCode128("WO20070317");

    expect(encoding.startCode).toBe("B");
    expect(encoding.codeSetTransitions).toEqual([{ atInputIndex: 2, toCodeSet: "C" }]);
    expect(encoding.checksumValue).toBe(81);
    expect(encoding.codeValues).toEqual([104, 55, 47, 99, 20, 7, 3, 17, 81, 106]);
    expect(encoding.moduleWidths[0]).toEqual([2, 1, 1, 2, 1, 4]);
    expect(encoding.moduleWidths[encoding.moduleWidths.length - 1]).toEqual([2, 3, 3, 1, 1, 1, 2]);
    expect(encoding.moduleCount).toBe(112);
  });

  it("starts in Code Set C for numeric-only payloads", () => {
    const encoding = encodeCode128("81936910422665342067");

    expect(encoding.startCode).toBe("C");
    expect(encoding.codeSetTransitions).toEqual([]);
    expect(encoding.checksumValue).toBe(90);
    expect(encoding.codeValues).toEqual([105, 81, 93, 69, 10, 42, 26, 65, 34, 20, 67, 90, 106]);
  });

  it("switches into Code Set C when a numeric run makes the encoding shorter", () => {
    const encoding = encodeCode128("abc7777");

    expect(encoding.startCode).toBe("B");
    expect(encoding.codeSetTransitions).toEqual([{ atInputIndex: 3, toCodeSet: "C" }]);
    expect(encoding.codeValues).toEqual([104, 65, 66, 67, 99, 77, 77, 97, 106]);
  });

  it("uses Code Set A for ASCII control characters", () => {
    const encoding = encodeCode128("A\nB");

    expect(encoding.startCode).toBe("A");
    expect(encoding.codeSetTransitions).toEqual([]);
    expect(encoding.checksumValue).toBe(77);
    expect(encoding.codeValues).toEqual([103, 33, 74, 34, 77, 106]);
  });

  it("switches between Code Set B and A for mixed printable/control payloads", () => {
    const encoding = encodeCode128("hello\nworld");

    expect(encoding.startCode).toBe("B");
    expect(encoding.codeSetTransitions).toEqual([
      { atInputIndex: 5, toCodeSet: "A" },
      { atInputIndex: 6, toCodeSet: "B" },
    ]);
    expect(encoding.codeValues).toEqual([
      104, 72, 69, 76, 76, 79, 101, 74, 100, 87, 79, 82, 76, 68, 20, 106,
    ]);
  });

  it("rejects characters outside the supported ASCII range", () => {
    expect(() => encodeCode128("caf\u00e9")).toThrow(
      "Code 128 encoding currently supports ASCII 0-126",
    );
  });
});
