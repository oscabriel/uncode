import { FileImage, Upload } from "lucide-react";
import { Button } from "@uncode/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@uncode/ui/components/card";
import { Label } from "@uncode/ui/components/label";

export default function BarcodeDecodeForm({
  selectedFile,
  previewUrl,
  onFileChange,
  onDecode,
  isDecoding,
}: {
  selectedFile: File | null;
  previewUrl?: string;
  onFileChange: (file: File | null) => void;
  onDecode: () => void;
  isDecoding: boolean;
}) {
  return (
    <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-sm">
      <CardHeader className="gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-fuchsia-200/80">
          <FileImage className="size-4" />
          Upload + decode
        </div>
        <CardTitle className="text-white" style={{ fontFamily: '"Chakra Petch", sans-serif' }}>
          Drop in a clean barcode image and recover its plaintext.
        </CardTitle>
        <CardDescription className="text-zinc-400">
          The file is uploaded to Convex storage first, then a Node-runtime action loads pixels and
          runs ZXing against the image.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="space-y-2">
          <Label htmlFor="barcode-image" className="text-zinc-300">
            Barcode image
          </Label>
          <input
            id="barcode-image"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            className="block w-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300 file:mr-4 file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-950 hover:file:bg-cyan-200"
          />
          <p className="text-xs text-zinc-500">
            Best results come from clean PNG or JPEG uploads with good contrast.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
          <div className="overflow-hidden border border-white/10 bg-black/20">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded barcode preview"
                className="h-44 w-full object-contain bg-white p-3"
              />
            ) : (
              <div className="flex h-44 items-center justify-center text-sm text-zinc-500">
                No file selected yet.
              </div>
            )}
          </div>

          <div className="space-y-3 border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Selected file</p>
            <p className="text-sm text-white" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
              {selectedFile
                ? `${selectedFile.name} (${Math.max(1, Math.round(selectedFile.size / 1024))} KB)`
                : "Waiting for an image upload."}
            </p>
            <p className="text-sm text-zinc-400">
              Successful decode returns plaintext plus validation status. If the image contains no
              barcode or the wrong symbology, you will get an explicit failure state instead of a
              vague error.
            </p>
            <Button
              type="button"
              onClick={onDecode}
              disabled={!selectedFile || isDecoding}
              className="h-11 w-full bg-fuchsia-300 text-zinc-950 hover:bg-fuchsia-200"
            >
              <Upload className="size-4" />
              {isDecoding ? "Uploading + decoding..." : "Upload image and decode"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
