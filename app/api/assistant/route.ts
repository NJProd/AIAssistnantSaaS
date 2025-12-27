import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { askAssistant } from '@/lib/ai'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify auth
    const token = request.cookies.get('token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { question } = await request.json()
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required' },
        { status: 400 }
      )
    }

    // Get products from store
    const products = await prisma.product.findMany({
      where: {
        storeId: payload.storeId,
        stock: { gt: 0 },
      },
      select: {
        sku: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        aisle: true,
        bin: true,
        attributes: true,
      },
    })

    // Get AI response
    const response = await askAssistant(
      question,
      products.map((p) => ({ ...p, price: Number(p.price) }))
    )

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Assistant error:', error)
    return NextResponse.json(
      { error: 'Failed to get response' },
      { status: 500 }
    )
  }
}
