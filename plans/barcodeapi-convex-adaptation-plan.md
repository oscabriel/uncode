# BarcodeAPI To Convex Adaptation Plan

## Goal

Expand Uncode from a Code 128 POC into a Convex-native barcode platform that duplicates the useful parts of `barcodeapi/server` while preserving Convex constraints, TypeScript type safety, and the current frontend product direction.

The target system should support:

- type-driven barcode generation
- explicit and automatic symbology selection
- direct embeddable HTTP image URLs
- app-facing Convex actions for encode, render, decode, and batch workflows
- stored run history for authenticated users
- optional shares, usage limits, and generated-asset caching
- a frontend UI that can discover supported barcode types and render type-specific controls

## Source Systems

### BarcodeAPI Reference

Local clone:

- `/Users/oscargabriel/Developer/clones/github/barcodeapi/server`

Key BarcodeAPI files to mirror conceptually:

- `src/main/java/org/barcodeapi/core/ServerLauncher.java`
- `src/main/java/org/barcodeapi/server/core/RestHandler.java`
- `src/main/java/org/barcodeapi/server/core/RequestContext.java`
- `src/main/java/org/barcodeapi/server/core/CodeType.java`
- `src/main/java/org/barcodeapi/server/core/CodeTypes.java`
- `src/main/java/org/barcodeapi/server/core/TypeSelector.java`
- `src/main/java/org/barcodeapi/server/gen/BarcodeRequest.java`
- `src/main/java/org/barcodeapi/server/gen/BarcodeGenerator.java`
- `src/main/java/org/barcodeapi/server/gen/CodeGenerator.java`
- `src/main/java/org/barcodeapi/server/api/BarcodeAPIHandler.java`
- `src/main/java/org/barcodeapi/server/api/BulkHandler.java`
- `src/main/java/org/barcodeapi/server/api/DecodeHandler.java`
- `src/main/java/org/barcodeapi/server/api/TypeHandler.java`
- `src/main/java/org/barcodeapi/server/api/ShareHandler.java`
- `config/community/app.json`
- `config/types/*.json`

### Current Uncode Backend

Current Convex backend anchors:

- `packages/backend/convex/schema.ts`
- `packages/backend/convex/http.ts`
- `packages/backend/convex/barcodeHttp.ts`
- `packages/backend/convex/barcodeActions.ts`
- `packages/backend/convex/barcodeNode.ts`
- `packages/backend/convex/barcodes.ts`
- `packages/backend/convex/lib/barcodeTypes.ts`
- `packages/backend/convex/lib/code128.ts`
- `packages/backend/convex/lib/code128Libre.ts`
- `packages/backend/convex/lib/renderSvg.ts`
- `packages/backend/lib/renderPng.ts`
- `packages/backend/lib/decodeImage.ts`

Current frontend anchors:

- `apps/web/src/routes/workbench.tsx`
- `apps/web/src/routes/history.tsx`
- `apps/web/src/components/barcode-result-card.tsx`
- `apps/web/src/components/barcode-history-list.tsx`

## Convex Rules To Prioritize

Follow `packages/backend/convex/_generated/ai/guidelines.md` throughout this migration.

Implementation rules:

- All Convex functions must include argument validators.
- Use `query`, `mutation`, and `action` only for public APIs.
- Use `internalQuery`, `internalMutation`, and `internalAction` for private implementation functions.
- Never use `ctx.db` inside actions. Actions must call mutations/queries through `ctx.runMutation` and `ctx.runQuery`.
- Add `"use node";` only to files that export Node-runtime actions, and never mix Node actions with queries or mutations in the same file.
- Prefer `identity.tokenIdentifier` over `identity.subject` for ownership and history records.
- Do not accept user IDs as arguments for authorization. Resolve identity server-side.
- Avoid unbounded arrays in documents. Use child tables for share items, batch items, and generated artifacts.
- Query with indexes instead of `filter`.
- Keep query result sets bounded or paginated.
- Use Convex storage as `Blob` in and out.
- Read `_storage` metadata through `ctx.db.system.get`, not deprecated storage metadata APIs.

## High-Level Architecture

Do not port BarcodeAPI's Jetty server, object pools, local disk snapshots, or Java provider classes directly.

Instead, adapt the architecture like this:

| BarcodeAPI Concept                | Convex/TypeScript Implementation                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------- |
| `ServerLauncher`                  | `convex/http.ts` route registration plus public actions                             |
| `RestHandler`                     | shared HTTP helpers for responses, errors, content negotiation, cache headers       |
| `RequestContext`                  | small helpers for actor resolution, request parsing, accepted format, rate identity |
| `config/types/*.json`             | typed registry in `convex/barcode/types.ts`                                         |
| `CodeType`                        | `BarcodeTypeDefinition` TypeScript type                                             |
| `CodeTypes`                       | registry map and exported listing helpers                                           |
| `TypeSelector`                    | `selectBarcodeType` and `resolveBarcodeTypeAlias`                                   |
| `BarcodeRequest`                  | `parseBarcodeRequest` / `normalizeBarcodeRequest`                                   |
| `CodeGenerator`                   | `BarcodeGeneratorDefinition` interface                                              |
| `BarcodeGenerator.requestBarcode` | `generateBarcode` dispatcher                                                        |
| `BarcodeAPIHandler`               | generic HTTP render endpoints and action handlers                                   |
| `BulkHandler`                     | batch action first, optional ZIP HTTP action later                                  |
| `DecodeHandler`                   | generalized Node action using ZXing                                                 |
| `TypeHandler`                     | `/barcode/types` HTTP endpoint and `barcodeTypes.list` query                        |
| `ShareHandler`                    | `barcodeShares` and `barcodeShareItems` tables                                      |
| `ObjectCache`                     | HTTP cache headers, Convex storage, optional `barcodeArtifacts` table               |
| limiter caches                    | `barcodeUsageBuckets` table if product needs usage limits                           |
| background tasks                  | `convex/crons.ts` for cleanup jobs                                                  |

## Proposed File Layout

Use a directory-based backend structure for the expanded barcode system.

```text
packages/backend/convex/
  barcode/
    actions.ts
    batch.ts
    decode.ts
    generate.ts
    http.ts
    limits.ts
    request.ts
    runs.ts
    shares.ts
    types.ts
    validators.ts
    symbologies/
      code128.ts
      qr.ts
      ean13.ts
      ean8.ts
      upca.ts
  barcodeNode.ts
  barcodeHttp.ts
  barcodes.ts
  http.ts
  schema.ts
```

Migration can be incremental. Existing top-level files can delegate into `convex/barcode/*` before being removed or renamed.

## Phase 1: Normalize Identity And Current Code128 Domain

### Backend Work

Update owner identity from `identity.subject` to `identity.tokenIdentifier` in:

- `packages/backend/convex/barcodeActions.ts`
- `packages/backend/convex/barcodeNode.ts`
- `packages/backend/convex/barcodes.ts`

Keep the current external behavior unchanged.

Concrete changes:

- `resolveActor` should return `identity.tokenIdentifier` for authenticated users.
- `listRecentRuns` should query `barcodeRuns.by_created_by_created_at` using `identity.tokenIdentifier`.
- `getBarcodeRun` should compare `barcodeRun.createdBy` with `identity.tokenIdentifier`.

Convex reason:

- `tokenIdentifier` is the canonical stable identity key per project guidelines.

TypeScript reason:

- Keep actor identity as an explicit `Actor` type, not a loose string passed through UI arguments.

### Frontend Work

No visible UI changes required.

Verify:

- authenticated history still appears
- anonymous session history still works

## Phase 2: Introduce A Barcode Type Registry

### BarcodeAPI Source Mapping

Mirror these concepts:

- `config/types/*.json`
- `CodeType.java`
- `CodeTypes.java`
- `TypeSelector.java`

Do not load JSON at runtime. Use TypeScript objects so validators, UI metadata, and generator dispatch stay type-safe.

### New Types

Add or replace in `packages/backend/convex/lib/barcodeTypes.ts` or new `packages/backend/convex/barcode/types.ts`:

```ts
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
```

### Initial Registry

Create `packages/backend/convex/barcode/types.ts`:

```ts
export const BARCODE_TYPES = {
  code128: {
    symbology: "code128",
    displayName: "Code 128",
    aliases: ["128", "code-128", "code128"],
    autoPattern: /^[\x20-\x7e]{1,128}$/,
    extendedPattern: /^[\x20-\x7e]{1,1024}$/,
    priority: 50,
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
    },
  },
} satisfies Record<BarcodeSymbology, BarcodeTypeDefinition>;
```

Add helpers:

- `listBarcodeTypesForClient()` returns JSON-safe metadata without `RegExp` values.
- `resolveBarcodeTypeAlias(alias: string)` matches `TypeSelector.getTypeFromString`.
- `selectBarcodeTypeFromData(data: string)` matches `TypeSelector.getTypeFromData` with priority.

### Frontend Work

Add type discovery before adding new symbologies.

New query or HTTP endpoint:

- `api.barcodeTypes.list` or `/barcode/types`

Update `apps/web/src/routes/workbench.tsx` to stop hardcoding Code128 labels where possible:

- add a symbology select control
- populate options from backend type metadata
- default to `code128`
- keep existing Code128 behavior unchanged

## Phase 3: Normalize Barcode Requests

### BarcodeAPI Source Mapping

Mirror `BarcodeRequest.fromURI` and `CodeUtils.parseOptions`.

### Backend Work

Create `packages/backend/convex/barcode/request.ts`.

Define:

```ts
export type NormalizedBarcodeRequest = {
  symbology: BarcodeSymbology;
  plaintext: string;
  outputFormat: BarcodeOutputFormat;
  options: Record<string, string | number | boolean>;
  isCustom: boolean;
  cost: number;
};
```

Implement:

- `normalizeBarcodeRequest(args)` for Convex actions.
- `normalizeBarcodeHttpRequest(request)` for HTTP endpoints.
- `parseBarcodeOptions(type, rawOptions)`.
- `validateBarcodeData(type, plaintext)`.

Behavior to copy from BarcodeAPI:

- explicit type aliases win when valid
- `auto` triggers data-based selection
- missing type can auto-detect when safe
- reject empty data
- reject values not matching the selected type's extended pattern
- drop options whose value equals the type default
- mark requests with non-default options as custom
- calculate cost from basic/custom type cost

Behavior to improve for Convex/TypeScript:

- reject unknown options instead of silently carrying them into barcode text
- validate option ranges centrally
- return typed errors with stable status codes
- preserve the original plaintext exactly after URL decoding

### Frontend Work

Update workbench submit flow to pass:

```ts
{
  symbology: selectedSymbology,
  plaintext,
  options,
}
```

Instead of only:

```ts
{
  plaintext;
}
```

Keep compatibility wrappers for current `generateCode128Svg` until the generic action is stable.

## Phase 4: Generalize Generation Dispatch

### BarcodeAPI Source Mapping

Mirror:

- `CodeGenerator.java`
- `BarcodeGenerator.java`
- `DefaultBarcode4JProvider.java` only conceptually, not as a dependency
- `DefaultZXingProvider.java` only where useful for decoding or QR implementation references

### Backend Work

Create `packages/backend/convex/barcode/generate.ts`.

Define a generator interface:

```ts
export type BarcodeGeneratorDefinition = {
  encode?: (request: NormalizedBarcodeRequest) => unknown;
  renderSvg?: (request: NormalizedBarcodeRequest) => string;
  renderPng?: (request: NormalizedBarcodeRequest) => Uint8Array | Promise<Uint8Array>;
};
```

Add dispatcher:

```ts
export async function generateBarcode(request: NormalizedBarcodeRequest) {
  const generator = BARCODE_GENERATORS[request.symbology];
  if (!generator) throw new Error(`Unsupported barcode type: ${request.symbology}`);
  // dispatch by outputFormat
}
```

Move Code128-specific glue into `packages/backend/convex/barcode/symbologies/code128.ts`:

- use current `encodeCode128`
- use current `toLibreBarcode128Text`
- use current `renderCode128Svg`
- use current Node PNG renderer through a Node action path

Important runtime split:

- SVG and Code128 encoding stay in default Convex runtime when possible.
- PNG and image decode stay in Node runtime.
- Do not import `packages/backend/lib/renderPng.ts` into default-runtime files if it depends on Node or non-V8 packages.

### Frontend Work

Add a generic result type union in the frontend imported from backend types.

`BarcodeResultCard` should display:

- symbology display name
- plaintext
- encoded/font text only when available
- checksum only when available
- image preview if SVG/PNG exists
- unsupported feature message when a symbology does not support a requested output

## Phase 5: Expand Schema For Multi-Type Runs

### Backend Work

Update `packages/backend/convex/schema.ts`.

Current hardcoded fields:

- `symbology: v.literal("code128")`
- `fontEncoding: v.optional(v.literal("libre-barcode-128"))`

Replace with validators:

```ts
const barcodeSymbology = v.union(
  v.literal("code128"),
  v.literal("qr"),
  v.literal("ean13"),
  v.literal("ean8"),
  v.literal("upca"),
);

const barcodeOutputFormat = v.union(v.literal("svg"), v.literal("png"), v.literal("json"));

const barcodeFontEncoding = v.union(v.literal("libre-barcode-128"));
```

Add fields:

- `outputFormat: v.optional(barcodeOutputFormat)`
- `optionsJson: v.optional(v.string())`
- `typeAlias: v.optional(v.string())`

Indexes:

- keep `by_created_by_created_at`
- add `by_symbology_created_at` as `['symbology', 'createdAt']`
- consider `by_created_by_symbology_created_at` if the UI filters history by type

Avoid unbounded arrays for batch results or shares.

### Backend Mutation Work

Update `barcodes.ts` internal mutations:

- accept `symbology` as an argument
- accept `outputFormat` as optional
- accept `optionsJson` as optional
- stop forcing `symbology: "code128"`

Add shared validators in `barcode/validators.ts` so actions and mutations reuse them.

### Frontend Work

Update history components to display symbology.

`BarcodeHistoryList` should show:

- Code 128 / QR / EAN etc.
- encode/render/decode kind
- status
- plaintext or error

Optionally add a filter dropdown by symbology after backend index exists.

## Phase 6: Generic HTTP Image API

### BarcodeAPI Source Mapping

Mirror `BarcodeAPIHandler` and `TypeHandler`.

### Backend Work

Keep existing routes for compatibility:

- `/barcode/code128.svg`
- `/barcode/code128.png`

Add generic routes in `packages/backend/convex/http.ts`:

- `/barcode/render.svg`
- `/barcode/render.png`
- `/barcode/types`

Route behavior:

```text
/barcode/render.svg?type=code128&text=ABC123
/barcode/render.png?type=code128&text=ABC123
/barcode/render.svg?type=auto&text=ABC123
```

Headers to return:

- `Content-Type`
- `Cache-Control`
- `X-Barcode-Type`
- `X-Barcode-Content`
- `X-Barcode-Cost` if usage limits are enabled later
- `X-Error-Message` for failures where useful

Error response policy:

- Unlike BarcodeAPI, do not return a barcode image for errors by default.
- Return JSON errors for invalid requests.
- Consider an `errorImage=true` option later if image-compatible error responses are important.

### Frontend Work

Replace `buildBarcodeAssetUrl(format, plaintext)` in `workbench.tsx` with a generic builder:

```ts
function buildBarcodeAssetUrl(args: {
  format: "svg" | "png";
  symbology: string;
  plaintext: string;
  options?: Record<string, string | number | boolean>;
});
```

Use `/barcode/render.${format}` for new flows.

Keep existing Code128 URLs only for backward compatibility if users may have copied them.

## Phase 7: Add QR Code Support

### BarcodeAPI Source Mapping

Reference:

- `config/types/QRCode.json`
- `src/main/java/org/barcodeapi/server/gen/types/QRCodeGenerator.java`
- `src/main/java/org/barcodeapi/server/gen/impl/DefaultZXingProvider.java`

BarcodeAPI QR behavior:

- aliases: `qr`, `qr-code`, `qrcode`
- auto pattern: `^.{1,64}$`
- extended pattern: `^.{1,65535}$`
- options: `size`, `qz`, `correction`
- current Java provider applies margin but has error-correction lines commented out

Convex adaptation:

- Add `qr` to `BarcodeSymbology`.
- Add QR type definition to registry.
- Choose a TypeScript QR implementation strategy.

Preferred implementation options:

1. Add a pure TypeScript QR encoder library if acceptable.
2. Implement SVG/PNG QR rendering in Node action if the chosen library is Node-oriented.
3. If using ZXing JS for encoding is viable in V8, keep SVG generation in default runtime.

Do not manually implement QR encoding from scratch in the first expansion. QR has mode selection, Reed-Solomon error correction, masking, and version sizing; this is meaningfully more complex than Code128.

Backend files:

- `packages/backend/convex/barcode/symbologies/qr.ts`
- optionally `packages/backend/lib/qrPng.ts` if Node-only rendering is needed

Frontend changes:

- The symbology select should show QR automatically from type metadata.
- Type-specific options should render `size`, `quiet zone`, and `correction` controls.
- Hide font-encoded text outputs for QR because there is no Libre Barcode 128 mapping.

## Phase 8: Add EAN/UPC Support

### BarcodeAPI Source Mapping

Reference:

- `config/types/EAN13.json`
- `config/types/EAN8.json`
- `config/types/UPC_A.json`
- `config/types/UPC_E.json`
- `src/main/java/org/barcodeapi/server/gen/types/Ean13Generator.java`
- `src/main/java/org/barcodeapi/server/gen/types/Ean8Generator.java`
- `src/main/java/org/barcodeapi/server/gen/types/UPCAGenerator.java`
- `src/main/java/org/barcodeapi/server/gen/types/UPCEGenerator.java`
- `CodeUtils.calculateChecksum`
- `BarcodeRequest.fromURI` checksum enforcement block

Algorithm work to port directly:

- checksum calculation for UPC/EAN-style numeric barcodes
- auto-append check digit when input is one digit short if product wants BarcodeAPI-compatible behavior
- reject invalid supplied checksum when full length is provided
- numeric pattern validation from type definitions

Convex adaptation:

- Add pure TypeScript helpers for EAN/UPC checksum.
- Add known symbol pattern tables for EAN/UPC rendering if implementing custom rendering.
- Keep validation pure and unit tested.

Recommended files:

- `packages/backend/convex/barcode/symbologies/ean.ts`
- `packages/backend/convex/barcode/symbologies/upc.ts`
- `packages/backend/convex/barcode/lib/checksum.ts`

Frontend changes:

- For EAN/UPC selected types, show checksum behavior in helper text.
- Add validation feedback for invalid lengths/check digits.
- Hide Code128-only canonical metadata and Libre font output.

## Phase 9: Generalize Decode

### BarcodeAPI Source Mapping

Mirror `DecodeHandler.java` but improve error handling.

Current BarcodeAPI behavior:

- accepts multipart `image`
- validates broad size constraints
- uses ZXing `MultiFormatReader`
- returns text and detected format
- has TODO paths that silently return for invalid uploads

Current Uncode behavior:

- upload to Convex storage through `generateUploadUrl`
- call `barcodeNode.decodeCode128Image`
- decode Code128 only

Backend plan:

- Rename or wrap `decodeCode128ImageFromBlob` as `decodeBarcodeImageFromBlob`.
- Return ZXing format and mapped `BarcodeSymbology`.
- Store detected symbology in `barcodeRuns`.
- Return stable failure states:
  - `not_found`
  - `unsupported_format`
  - `invalid_image`
  - `validation_error`

Node runtime remains required.

Frontend plan:

- Decode UI should show detected type.
- If decoded type is unsupported by render flow, still show plaintext.
- Offer “generate this barcode” only when the decoded symbology is renderable.

## Phase 10: Batch Workflows

### BarcodeAPI Source Mapping

Mirror `BulkHandler.java` conceptually.

Start with Convex actions, not ZIP streaming.

Backend action:

```ts
export const batchEncodeBarcodes = action({
  args: {
    items: v.array(
      v.object({
        plaintext: v.string(),
        symbology: v.optional(barcodeSymbologyValidator),
        optionsJson: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // bounded batch size, normalize each item, return per-item result
  },
});
```

Batch constraints:

- cap item count, initially 100 or less
- process in action memory only for first version
- store one run per successful or failed item for authenticated users only if the batch is reasonably small
- add an async job model later for larger exports

Optional later tables:

- `barcodeBatchJobs`
- `barcodeBatchItems`

Frontend plan:

- Current multiline input can call one batch action instead of N individual actions.
- Results table should include symbology, status, output, and error.
- Add CSV import later, matching BarcodeAPI CSV semantics: `data,type,option=value,...`.

## Phase 11: Shares

### BarcodeAPI Source Mapping

Mirror `ShareHandler.java` and `CachedShare` conceptually.

Do not store unbounded request arrays inside one Convex document.

Schema:

```ts
barcodeShares: defineTable({
  shareKey: v.string(),
  createdBy: v.optional(v.string()),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
}).index("by_share_key", ["shareKey"]),

barcodeShareItems: defineTable({
  shareId: v.id("barcodeShares"),
  position: v.number(),
  symbology: barcodeSymbology,
  plaintext: v.string(),
  outputFormat: barcodeOutputFormat,
  optionsJson: v.optional(v.string()),
}).index("by_share_id_position", ["shareId", "position"]),
```

Backend functions:

- `createShare`
- `getShareByKey`
- `deleteShare` if owner is authenticated

Frontend:

- Add “Share set” action for batch results or current generated item.
- Add route `/share/$key` to render shared barcode list.

## Phase 12: Optional Usage Limits

### BarcodeAPI Source Mapping

Mirror concepts from:

- `LimiterCache.java`
- `CachedLimiter.java`
- `plans.json`
- `BarcodeAPIHandler` token cost headers

Convex schema:

```ts
barcodeUsageBuckets: defineTable({
  actorKey: v.string(),
  bucketStart: v.number(),
  tokensSpent: v.number(),
  tokenLimit: v.number(),
}).index("by_actor_key_bucket_start", ["actorKey", "bucketStart"]),
```

Implementation:

- Use daily buckets.
- Actor key should be `identity.tokenIdentifier` for authenticated app actions.
- Public HTTP endpoints can remain unlimited initially and rely on cache headers.
- If HTTP rate limiting is required, use request headers only with care because proxy/IP reliability depends on deployment.

Frontend:

- Show remaining quota only if backend enforces it.
- Do not add quota UI before limits exist.

## Phase 13: Optional Artifact Cache

### BarcodeAPI Source Mapping

BarcodeAPI caches simple generated barcodes by type and data in `ObjectCache`.

Convex adaptation should be demand-driven.

Initial strategy:

- Use `Cache-Control` headers for deterministic HTTP image endpoints.
- Store generated assets in Convex storage only when the app action creates a user-visible artifact.

Only add a DB artifact cache if rendering cost becomes material.

Optional schema:

```ts
barcodeArtifacts: defineTable({
  cacheKey: v.string(),
  symbology: barcodeSymbology,
  plaintext: v.string(),
  outputFormat: barcodeOutputFormat,
  optionsHash: v.string(),
  storageId: v.id("_storage"),
  createdAt: v.number(),
  expiresAt: v.optional(v.number()),
}).index("by_cache_key", ["cacheKey"]),
```

Use crons for cleanup if `expiresAt` is introduced.

## Frontend Migration Plan

### Step 1: Preserve Current Workbench

Keep current Code128 workbench stable while backend generalization begins.

No route changes:

- `/workbench`
- `/history`

### Step 2: Add Symbology Metadata Query

Add a hook around type discovery:

```ts
const barcodeTypes = useQuery(api.barcodeTypes.list);
```

or fetch `/barcode/types` if using HTTP metadata.

Use metadata to render:

- symbology select
- example picker
- supported output badges
- type-specific options panel

### Step 3: Generalize Workbench State

Replace Code128-specific state with:

```ts
type WorkbenchState = {
  symbology: string;
  plaintext: string;
  outputFormat: "svg" | "png";
  options: Record<string, string | number | boolean>;
};
```

Keep the decode tab but display detected symbology when available.

### Step 4: Generalize Result Card

`BarcodeResultCard` should handle missing fields gracefully:

- Code128 may show `encodedText`, `checksumValue`, and canonical encoding.
- QR may show image and plaintext only.
- EAN/UPC may show checksum and normalized text.
- Decode may show detected format and uploaded preview.

### Step 5: Generalize Download URLs

Replace Code128-only URL builder:

```ts
/barcode/code128.svg?text=...
```

with:

```ts
/barcode/render.svg?type=code128&text=...
/barcode/render.png?type=qr&text=...
```

### Step 6: Batch UX

Replace the current per-line loop with a batch action once backend supports it.

Batch table columns:

- input
- symbology
- status
- output or error
- SVG download
- PNG download

### Step 7: Shares UX

After share tables/functions exist:

- Add “Share” button on single result.
- Add “Share batch” button on batch results.
- Add `/share/$key` route.

## Testing Plan

### Unit Tests

Keep and expand current tests:

- `packages/backend/convex/lib/code128.test.ts`
- `packages/backend/convex/lib/code128Libre.test.ts`
- `packages/backend/convex/lib/renderSvg.test.ts`
- `packages/backend/lib/renderPng.test.ts`
- `packages/backend/lib/decodeImage.test.ts`

Add tests for:

- type alias resolution
- auto type selection priority
- option parsing and range validation
- checksum validation for EAN/UPC
- request normalization
- generic generator dispatch

### Convex Function Tests

Use `convex-test` only if/when installed, following generated guidelines.

Test:

- authenticated run persistence
- anonymous result behavior
- history ownership isolation by `tokenIdentifier`
- share item lookup with bounded queries
- usage bucket mutation if limits are added

### Manual Verification

Verify:

- `/barcode/code128.svg` still works
- `/barcode/render.svg?type=code128&text=WO20070317` works
- `/barcode/render.png?type=code128&text=WO20070317` works
- app generation stores history for signed-in users
- anonymous generation remains session-only
- uploaded Code128 images decode
- frontend result card handles missing Code128-only fields for new types

## Implementation Order

1. Update identity usage to `tokenIdentifier`.
2. Add barcode type registry for existing Code128 only.
3. Add request normalization and option parsing for Code128.
4. Add generic backend actions while keeping Code128 wrappers.
5. Expand schema from Code128-only to multi-symbology.
6. Add generic HTTP render endpoints and `/barcode/types`.
7. Update frontend to use type metadata and generic URLs.
8. Add QR support.
9. Generalize decode result symbology.
10. Add EAN/UPC checksum and rendering support.
11. Add batch action.
12. Add shares.
13. Add rate limits and artifact cache only if product needs them.

## Non-Goals

- Do not port Jetty, Java object pooling, or Barcode4J directly.
- Do not implement QR encoding from scratch in the first expansion.
- Do not add a database artifact cache before there is evidence that rendering cost matters.
- Do not add public HTTP usage limiting based on unreliable IP assumptions unless deployment headers are verified.
- Do not store batch/share request arrays as unbounded document fields.

## Definition Of Done For The First Expansion

- Existing Code128 behavior still works.
- Code128 generation flows through the new registry/request/generator path.
- The frontend chooses symbology from backend metadata.
- Generic `/barcode/render.svg` and `/barcode/render.png` routes exist.
- History uses `identity.tokenIdentifier` ownership.
- Backend type checks pass.
- Existing barcode unit tests pass.
- The code structure makes adding QR a contained `symbologies/qr.ts` implementation plus registry entry.
