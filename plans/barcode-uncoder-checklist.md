# Barcode Uncoder Execution Checklist

## 1. Project setup

- [ ] Review current scripts in `package.json`, `apps/web/package.json`, and `packages/backend/package.json`
- [ ] Add any missing dependencies for image decoding, PNG serialization, and test execution
- [ ] Add a test runner and scripts for unit tests
- [ ] Confirm Convex Node runtime support is configured for backend actions

## 2. Backend data model

- [ ] Update `packages/backend/convex/schema.ts` with a `barcodeRuns` table
- [ ] Add indexes needed for recent runs and per-user lookup
- [ ] Define shared TypeScript result types for encode, render, and decode operations

## 3. Core Code 128 engine

- [ ] Create `packages/backend/convex/lib/code128.ts`
- [ ] Implement input validation for POC-safe Code 128 input
- [ ] Implement Code Set B logic
- [ ] Implement Code Set C switching logic for numeric runs
- [ ] Implement start code selection
- [ ] Implement checksum calculation
- [ ] Emit canonical code values
- [ ] Emit symbol patterns / module widths for rendering
- [ ] Add unit tests for known inputs and checksums

## 4. Libre Barcode 128 text mapping

- [ ] Create `packages/backend/convex/lib/code128-libre.ts`
- [ ] Map canonical code values to `Libre Barcode 128` glyphs
- [ ] Return copyable plain text `encodedText`
- [ ] Add tests for known font-encoded outputs
- [ ] Document that this output is font-specific

## 5. Custom SVG renderer

- [ ] Create `packages/backend/convex/lib/render-svg.ts`
- [ ] Render bars from module widths using SVG `<rect>` elements
- [ ] Add quiet zones and configurable dimensions
- [ ] Support foreground/background colors
- [ ] Optionally support human-readable text label output
- [ ] Add tests for dimensions and bar placement

## 6. Custom PNG renderer

- [ ] Create `packages/backend/convex/lib/render-png.ts`
- [ ] Rasterize module widths into an RGBA pixel buffer
- [ ] Serialize the pixel buffer to PNG bytes
- [ ] Add tests for output dimensions and basic integrity
- [ ] Verify the PNG output scans correctly

## 7. Convex barcode API

- [ ] Create `packages/backend/convex/barcodes.ts`
- [ ] Add `generateUploadUrl`
- [ ] Add recent-runs query
- [ ] Add barcode-run lookup query
- [ ] Add internal mutations for storing successful and failed runs

## 8. Node-runtime processing actions

- [ ] Create `packages/backend/convex/barcodeNode.ts`
- [ ] Add `encodeCode128` action
- [ ] Add `generateCode128Svg` action
- [ ] Add `generateCode128Png` action
- [ ] Add `decodeCode128Image` action
- [ ] Ensure actions persist results through internal mutations

## 9. HTTP endpoints

- [ ] Update `packages/backend/convex/http.ts`
- [ ] Add `/barcode/code128.svg` endpoint
- [ ] Add `/barcode/code128.png` endpoint
- [ ] Return proper content types and error responses
- [ ] Keep auth behavior explicit for public vs signed-in usage

## 10. Image upload and decode pipeline

- [ ] Create `packages/backend/convex/lib/decode-image.ts`
- [ ] Load uploaded image blobs from Convex storage
- [ ] Convert image data to the pixel format required by the decoder
- [ ] Decode only Code 128 successfully for the POC
- [ ] Return structured failure states for invalid image / not found / wrong format
- [ ] Add decode fixture tests with known-good barcode images

## 11. Frontend workbench

- [ ] Replace starter content in `apps/web/src/routes/index.tsx`
- [ ] Add encode/generate form component
- [ ] Add image upload / decode form component
- [ ] Add results panel showing plaintext, `encodedText`, and rendered barcode preview
- [ ] Add copy button for `encodedText`
- [ ] Add download actions for SVG and PNG
- [ ] Add recent history section
- [ ] Make the layout responsive on desktop and mobile

## 12. UI polish and navigation

- [ ] Update `apps/web/src/components/header.tsx` for product-oriented navigation
- [ ] Reuse shared UI primitives from `packages/ui`
- [ ] Add loading, success, and error states for all workflows
- [ ] Make the distinction between plaintext and font-encoded text obvious in the UI

## 13. Persistence and storage

- [ ] Store generated barcode assets in Convex storage when useful
- [ ] Store uploaded source images in Convex storage
- [ ] Persist metadata for encode, render, and decode operations
- [ ] Expose stable URLs for saved barcode outputs when appropriate

## 14. Validation and testing

- [ ] Add unit tests for encoding and font mapping
- [ ] Add unit tests for SVG and PNG rendering
- [ ] Add decode tests for uploaded fixtures
- [ ] Add roundtrip tests: plaintext -> render -> decode -> plaintext
- [ ] Test example inputs like `WO20070317`
- [ ] Test numeric-heavy inputs that should switch into Code Set C
- [ ] Test unsupported inputs and broken images

## 15. Final verification

- [ ] Run type checks
- [ ] Run the test suite
- [ ] Manually verify that copied `encodedText` renders correctly with `Libre Barcode 128` in an external tool
- [ ] Manually verify that generated SVG and PNG outputs are scannable
- [ ] Manually verify that uploaded clean Code 128 images decode successfully
- [ ] Review the user-facing wording so `Libre Barcode 128` specificity is clearly explained
