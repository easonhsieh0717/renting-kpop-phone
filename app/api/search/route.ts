import { NextRequest, NextResponse } from 'next/server'
import { getAvailablePhones } from '@/lib/search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const model = searchParams.get('model')

    const availablePhones = await getAvailablePhones({ from, to, model });

    return NextResponse.json(availablePhones)
  } catch (error) {
    console.error('Error in search API:', error);
    if (error instanceof Error) {
        return NextResponse.json({ message: `Internal Server Error: ${error.message}` }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 