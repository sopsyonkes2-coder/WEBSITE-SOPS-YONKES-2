import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ReviewItem = {
  id: string;
  name: string;
  role: string;
  quote: string;
};

const reviewsFile = path.join(process.cwd(), 'data', 'reviews.json');

function generateId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function writeReviews(reviews: ReviewItem[]) {
  await fs.mkdir(path.dirname(reviewsFile), { recursive: true });
  await fs.writeFile(reviewsFile, JSON.stringify(reviews, null, 2), 'utf-8');
}

async function readReviews(): Promise<ReviewItem[]> {
  try {
    const file = await fs.readFile(reviewsFile, 'utf-8');
    const parsed = JSON.parse(file);
    if (!Array.isArray(parsed)) return [];

    let changed = false;
    const reviews = parsed.map((item: any) => {
      const id = item?.id || generateId();
      if (!item?.id) changed = true;

      return {
        id,
        name: item?.name || '',
        role: item?.role || '',
        quote: item?.quote || '',
      };
    });

    if (changed) {
      await writeReviews(reviews);
    }

    return reviews;
  } catch {
    return [];
  }
}

export async function GET() {
  const reviews = await readReviews();
  return NextResponse.json(reviews);
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

    const reviews = await readReviews();
    const nextReviews = [
      {
        id: generateId(),
        name,
        role,
        quote,
      },
      ...reviews,
    ];

    await writeReviews(nextReviews);

    return NextResponse.json({ message: 'Ulasan berhasil disimpan.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal menyimpan ulasan.' },
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

    const reviews = await readReviews();
    const nextReviews = reviews.filter((review) => review.id !== id);

    if (nextReviews.length === reviews.length) {
      return NextResponse.json(
        { error: 'Ulasan tidak ditemukan.' },
        { status: 404 }
      );
    }

    await writeReviews(nextReviews);
    return NextResponse.json({ message: 'Ulasan berhasil dihapus.' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Gagal menghapus ulasan.' },
      { status: 500 }
    );
  }
}
