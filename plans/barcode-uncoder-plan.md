# Barcode Uncoder POC Plan

## Goal

Turn the current TanStack Start + Convex scaffold into a fullstack barcode "uncoder" focused on Code 128 for the POC.

The app should let a user:

1. enter plaintext and receive:
   - a rendered barcode image
   - a copyable font-encoded text string for `Libre Barcode 128`
   - canonical Code 128 encoding metadata
2. upload a barcode image and receive:
   - decoded plaintext
   - decode status and validation details

## POC Scope

### In scope

- Code 128 only
- Plaintext to encoded text
- Plaintext to SVG/PNG barcode rendering
- Uploaded barcode image to decoded plaintext
- Convex-backed API and persistence for recent runs
- Copyable `encodedText` output targeted to `Libre Barcode 128`

### Out of scope for the POC

- Other barcode symbologies
- Camera scanning / live video decoding
- GS1-128 / FNC-heavy workflows
- Arbitrary Unicode input beyond Code 128 practical support
- Production-grade photo cleanup for badly skewed or blurred images
- Barcode font rendering inside our app

## Product Outputs

For each successful encode/generate request, the backend should return four useful representations of the same value:

- `plaintext`: original input, such as `WO20070317`
- `encodedText`: copyable font-oriented string for `Libre Barcode 128`
- `svg` and/or `png`: rendered scannable barcode image produced by our own renderer
- `canonicalEncoding`: implementation-level data used to verify correctness and support rendering

The important architectural distinction is:

- the barcode itself is defined by Code 128 code values, checksum, and bar/space modules
- the copyable `encodedText` is font-specific glyph mapping layered on top of the canonical barcode encoding

That means the app should treat `encodedText` as a derived compatibility output, not the source of truth.

## Current Repo Fit

The existing repo already gives us the right scaffolding:

- `apps/web` contains the TanStack Start frontend
- `packages/backend/convex` contains the Convex backend
- `packages/ui` contains shared UI primitives
- auth already exists through Better Auth and Convex integration

The main current files that anchor this work are:

- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/dashboard.tsx`
- `apps/web/src/components/header.tsx`
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/http.ts`

## Architecture Overview

### Frontend

The frontend should become a single barcode workbench with three primary flows:

1. encode plaintext to `encodedText`
2. generate barcode images from plaintext
3. decode uploaded barcode images back to plaintext

### Backend

Convex should own the barcode API, persistence, storage integration, and processing orchestration.

The backend should be split into:

- normal Convex functions for CRUD, query responses, and storage URLs
- Node-runtime Convex actions for heavier barcode/image processing
- pure TypeScript helper modules for Code 128 encoding and our rendering logic

### Rendering strategy

We will implement our own Code 128 rendering API for SVG and PNG.

This means:

- we compute the canonical Code 128 modules ourselves
- we turn those modules into SVG rectangles ourselves
- we rasterize the same module stream into PNG pixels ourselves

We should not rely on a barcode generation library for rendering.

### Decoding strategy

We should still use a decoding library for uploaded images because barcode image decoding is the fragile part of the system.

Recommended approach:

- use `@zxing/library` for Code 128 decode attempts
- use a Node-runtime image loader / pixel extraction library as needed to feed pixel data into the decoder

## Canonical Code 128 Engine

## Purpose

Build a pure TypeScript encoder that becomes the source of truth for every other output.

### Responsibilities

- validate input for POC-safe Code 128 support
- choose Code Set B and Code Set C transitions as needed
- compute start code
- compute data code values
- compute checksum
- append stop code
- emit module width patterns for rendering

### Recommended file

- `packages/backend/convex/lib/code128.ts`

### Suggested output shape

```ts
type Code128Encoding = {
  plaintext: string;
  codeValues: number[];
  checksumValue: number;
  startCode: "A" | "B" | "C";
  codeSetTransitions: Array<{
    atInputIndex: number;
    toCodeSet: "A" | "B" | "C";
  }>;
  symbolPatterns: string[];
  moduleWidths: number[][];
  moduleCount: number;
};
```

### POC encoding rules

- prefer Code Set B for general text
- switch into Code Set C for numeric runs where it reduces symbol count
- reject unsupported control-character-heavy inputs for the first version
- keep logic deterministic and well tested

## Libre Barcode 128 Mapping

## Purpose

Convert canonical Code 128 output into copyable `encodedText` that users can paste into other programs which render with `Libre Barcode 128`.

### Important note

This mapping is specific to `Libre Barcode 128`. Another barcode font may require a different string while still representing the same barcode.

### Recommended file

- `packages/backend/convex/lib/code128-libre.ts`

### Responsibilities

- map start / data / checksum / stop symbols into `Libre Barcode 128` glyphs
- return a plain JavaScript string that can be copied directly
- keep mapping isolated from the canonical encoding logic

### Output shape

```ts
type LibreCode128Text = {
  encodedText: string;
  fontEncoding: "libre-barcode-128";
};
```

## Custom SVG Rendering API

## Purpose

Render a scannable barcode from our canonical module widths without using a barcode rendering library.

### Recommended file

- `packages/backend/convex/lib/render-svg.ts`

### Responsibilities

- apply left/right quiet zones
- convert module widths into bar rectangles
- support configurable module width, height, margin, and foreground/background colors
- optionally include human-readable label text
- return deterministic SVG markup

### Suggested rendering model

- treat each symbol as alternating bar and space widths
- expand module widths into x positions
- draw only bars as `<rect>` elements
- calculate viewBox and width/height directly from total module count

### Optional HTTP delivery

Expose direct URLs for generated SVGs in `packages/backend/convex/http.ts`, for example:

- `/barcode/code128.svg?text=WO20070317`

This is useful for embedding or downloading without going through the full app UI.

## Custom PNG Rendering API

## Purpose

Produce PNG output from the same canonical module stream.

### Recommended file

- `packages/backend/convex/lib/render-png.ts`

### Responsibilities

- rasterize bars into an RGBA pixel buffer
- scale by module width and barcode height
- serialize that pixel buffer into PNG bytes

### Practical implementation detail

We should own the barcode rasterization logic ourselves. If needed, we can still use a generic PNG encoder package to serialize pixels into the PNG file format rather than hand-writing PNG chunks.

That still keeps the barcode generation logic fully ours.

### Optional HTTP delivery

- `/barcode/code128.png?text=WO20070317`

## Decode Pipeline

## Purpose

Let users upload barcode images and recover Code 128 plaintext through the Convex API.

### Recommended files

- `packages/backend/convex/barcodeNode.ts`
- `packages/backend/convex/lib/decode-image.ts`

### Responsibilities

- accept an uploaded image stored in Convex storage
- load and decode pixel data in Node runtime
- run Code 128 decode attempt using `@zxing/library`
- return decoded plaintext or a structured failure response
- confirm the detected symbology is `CODE_128`

### Upload flow

1. frontend requests a Convex upload URL
2. frontend uploads image to Convex storage
3. frontend calls decode action with `storageId`
4. action reads image blob, decodes it, stores result metadata, returns structured response

## Convex API Design

## Recommended backend files

- `packages/backend/convex/barcodes.ts`
- `packages/backend/convex/barcodeNode.ts`
- `packages/backend/convex/schema.ts`
- `packages/backend/convex/http.ts`

### `barcodes.ts`

Use for public app-facing queries, mutations, and lightweight orchestration.

Suggested responsibilities:

- `generateUploadUrl`
- `listRecentRuns`
- `getBarcodeRun`
- internal mutations for persisting encode/decode results

### `barcodeNode.ts`

Use Node-runtime Convex actions for:

- `encodeCode128`
- `generateCode128Svg`
- `generateCode128Png`
- `decodeCode128Image`

### API response shape

```ts
type BarcodeResult = {
  symbology: "code128";
  plaintext: string;
  encodedText?: string;
  fontEncoding?: "libre-barcode-128";
  checksumValue?: number;
  codeValues?: number[];
  moduleWidths?: number[][];
  svg?: string;
  imageStorageId?: string;
  imageUrl?: string | null;
  decodeStatus?: "success" | "not_found" | "unsupported_format" | "invalid_image";
};
```

## Data Model

Update `packages/backend/convex/schema.ts` with a table for barcode history.

### Suggested table: `barcodeRuns`

Suggested fields:

- `kind`: `"encode" | "decode" | "render"`
- `symbology`: `"code128"`
- `plaintext`
- `encodedText`
- `fontEncoding`
- `checksumValue`
- `inputImageStorageId`
- `resultImageStorageId`
- `status`
- `errorMessage`
- `createdBy`
- `createdAt`

### Why persist runs

- supports recent history in the UI
- makes debugging easier during the POC
- gives us a path to analytics and auditability later

## Frontend Experience

## Primary route

Replace the starter content in `apps/web/src/routes/index.tsx` with a barcode workbench.

### Recommended UI sections

1. plaintext encode/generate form
2. upload-and-decode form
3. result panel
4. recent activity/history panel

### Recommended components

- `apps/web/src/components/barcode-encode-form.tsx`
- `apps/web/src/components/barcode-decode-form.tsx`
- `apps/web/src/components/barcode-result-card.tsx`
- `apps/web/src/components/barcode-history-list.tsx`

### UX requirements

- easy copy button for `encodedText`
- visible distinction between plaintext and font-encoded output
- barcode preview from returned SVG
- download button for SVG/PNG
- clear validation/error messaging
- responsive layout for desktop and mobile

### Header update

Update `apps/web/src/components/header.tsx` so the app is presented as a barcode product rather than a scaffold.

## Dependency Recommendations

### Use custom implementation for

- Code 128 encoding logic
- Libre font mapping logic
- SVG rendering logic
- PNG rasterization logic

### Use libraries for

- image decoding / pixel extraction if needed
- barcode decoding from uploaded images
- PNG file serialization if a generic encoder is the fastest stable route

This gives us full ownership of the encoding and rendering API while avoiding unnecessary computer-vision complexity.

## Testing Strategy

The repo currently lacks a configured test runner, so part of the implementation should be to add one.

### Testing priorities

1. canonical Code 128 encoding correctness
2. checksum correctness
3. Code Set B/C switching correctness
4. `Libre Barcode 128` string mapping correctness
5. SVG rendering dimensions and bar placement correctness
6. decode success on known-good fixtures
7. roundtrip tests: plaintext -> render -> decode -> plaintext

### Test fixture ideas

- `WO20070317`
- mixed alphanumeric examples
- long numeric examples that should switch to Code Set C
- invalid images
- images with a non-Code-128 barcode

## Risks and Constraints

### Highest-risk area

Decoding uploaded images is the least deterministic part of the product.

### Lower-risk areas

- canonical Code 128 encoding
- font mapping once target font is fixed
- SVG rendering from module widths
- PNG rasterization from the same module widths

### Practical constraints

- `encodedText` must be documented as `Libre Barcode 128`-specific
- decode success will be best on clean PNG/JPEG uploads first
- Node-runtime actions should be used carefully for heavier work

## Delivery Phases

### Phase 1: foundations

- add test setup
- add schema
- add core encoder and Libre mapper

### Phase 2: custom rendering

- implement SVG renderer
- implement PNG rasterizer / serializer path
- add HTTP endpoints and Convex actions

### Phase 3: decode support

- add upload flow
- add decode action
- add failure states and validation

### Phase 4: UI integration

- replace landing page with barcode workbench
- wire encode/generate/decode flows
- add copy/download/history UX

### Phase 5: hardening

- add fixtures and roundtrip tests
- improve errors, sizing options, and edge-case handling

## Success Criteria

The POC is successful when:

- a user can enter plaintext and get back a copyable `Libre Barcode 128` `encodedText`
- a user can get a correctly rendered SVG or PNG barcode produced by our own renderer
- a user can upload a clean Code 128 image and get decoded plaintext back from Convex
- the system persists recent runs and exposes a coherent fullstack workflow in the existing app
