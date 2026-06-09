import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json({ message: "Fitur AI Assistant telah dinonaktifkan." }, { status: 410 });
}