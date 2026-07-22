import { NextResponse } from 'next/server';
import {
  getReviewsFromSheet,
  appendReviewToSheet,
  deleteReviewFromSheet,
} from '@/lib/googleSheetsServer';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReviewItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

export async function GET() {
  try {
    const reviews = await getReviewsFromSheet();
    return NextResponse.json(reviews);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Review GET error:', message);
    return NextResponse.json(
      { error: `Gagal membaca ulasan dari Google Sheets: ${message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, role, quote } = body as Partial<ReviewItem>;

    if (!name || !role || !quote) {
      return NextResponse.json(
        { error: 'Nama, jabatan, dan ulasan wajib diisi.' },
        { status: 400 }
      );
    }

    await appendReviewToSheet({ name, role, quote });

    return NextResponse.json({ message: 'Ulasan berhasil disimpan.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Review POST error:', message);
    return NextResponse.json(
      { error: `Gagal menyimpan ulasan ke Google Sheets: ${message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID ulasan diperlukan untuk menghapus.' },
        { status: 400 }
      );
    }

    const deleted = await deleteReviewFromSheet(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Ulasan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Ulasan berhasil dihapus.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Review DELETE error:', message);
    return NextResponse.json(
      { error: `Gagal menghapus ulasan dari Google Sheets: ${message}` },
      { status: 500 }
    );
  }
}
