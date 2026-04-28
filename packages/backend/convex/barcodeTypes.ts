import { query } from "./_generated/server";
import { listBarcodeTypesForClient } from "./barcode/types";

export const list = query({
  args: {},
  handler: async () => {
    return listBarcodeTypesForClient();
  },
});
