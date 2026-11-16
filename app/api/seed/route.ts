import { NextResponse } from 'next/server';
const { runSeed } = require('@/scripts/seed');

export async function POST() {
  try {
    await runSeed();
    return NextResponse.json({ success: true, message: 'Database seeded successfully into MongoDB Atlas!' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
