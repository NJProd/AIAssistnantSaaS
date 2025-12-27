import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface Product {
  sku: string
  name: string
  description: string
  price: number
  stock: number
  aisle: string
  bin: string | null
  attributes: string
}

export async function askAssistant(
  question: string,
  products: Product[]
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const productList = products
    .map(
      (p) =>
        `- ${p.sku}: ${p.name} ($${p.price}) - ${p.stock} in stock at ${p.aisle}${p.bin ? ` Bin ${p.bin}` : ''}\n  ${p.description}\n  Specs: ${p.attributes}`
    )
    .join('\n')

  const prompt = `You are a helpful hardware store assistant. A customer asks: "${question}"

Based ONLY on these available products, recommend the best options. If no products match, say so honestly.

AVAILABLE PRODUCTS:
${productList}

Instructions:
- Only recommend products from the list above
- Include the product location (aisle/bin)
- Explain why each product works for their needs
- Be concise and helpful
- If you're unsure, ask a clarifying question`

  try {
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (error) {
    console.error('Gemini API error:', error)
    return "I'm sorry, I couldn't process your request. Please try again."
  }
}
