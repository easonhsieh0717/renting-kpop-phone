import { NextRequest, NextResponse } from 'next/server'
import { getPhonesWithAvailability } from '../../../lib/search'

// 添加運行時配置
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const model = searchParams.get('model')

    const phones = await getPhonesWithAvailability({ from, to, model })
    
    return NextResponse.json(phones)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 })
  }
} 