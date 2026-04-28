import { httpRouter } from "convex/server";

import { authComponent, createAuth } from "./auth";
import { barcodeTypes, code128Png, code128Svg } from "./barcodeHttp";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
http.route({
  path: "/barcode/code128.svg",
  method: "GET",
  handler: code128Svg,
});
http.route({
  path: "/barcode/code128.png",
  method: "GET",
  handler: code128Png,
});
http.route({
  path: "/barcode/render.svg",
  method: "GET",
  handler: code128Svg,
});
http.route({
  path: "/barcode/render.png",
  method: "GET",
  handler: code128Png,
});
http.route({
  path: "/barcode/types",
  method: "GET",
  handler: barcodeTypes,
});

export default http;
