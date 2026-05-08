import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readConfig, writeConfig, type AppConfig } from "@/lib/config";

export async function GET() {
  return NextResponse.json(readConfig());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AppConfig>;
    const next = writeConfig({
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      role: typeof body.role === "string" ? body.role.trim() : undefined,
    });
    revalidatePath("/", "layout");
    return NextResponse.json(next);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
