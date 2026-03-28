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

  it("rejects characters outside the POC-safe printable ASCII range", () => {
    expect(() => encodeCode128("hello\nworld")).toThrow(
      "POC encoding currently supports printable ASCII only",
    );
    expect(() => encodeCode128("caf\u00e9")).toThrow(
      "POC encoding currently supports printable ASCII only",
    );
  });
});
