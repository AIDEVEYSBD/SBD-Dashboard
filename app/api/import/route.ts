import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { runImport, type ImportInput } from "@/lib/import";

// Bump if you have larger Excel files. Default Next route handler limit is ~4MB.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const skipExisting = formData.get("skipExisting") === "true";
    const inputs: ImportInput[] = [];

    const icaaFile = formData.get("icaa");
    if (icaaFile instanceof File && icaaFile.size > 0) {
      inputs.push({
        kindHint: "ICAA",
        filename: icaaFile.name,
        buffer: Buffer.from(await icaaFile.arrayBuffer()),
      });
    }

    const isaFile = formData.get("isa");
    if (isaFile instanceof File && isaFile.size > 0) {
      inputs.push({
        kindHint: "ISA",
        filename: isaFile.name,
        buffer: Buffer.from(await isaFile.arrayBuffer()),
      });
    }

    if (inputs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Choose at least one file." },
        { status: 400 },
      );
    }

    const result = await runImport(inputs, { skipExisting });

    // Bust the cache so dashboard pages re-render with fresh data.
    revalidatePath("/", "layout");

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import failed";
    console.error("Import error:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
