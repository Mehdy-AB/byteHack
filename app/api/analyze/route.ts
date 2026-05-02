import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/auth'
import { explainTask } from '@/lib/gemini'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    
    // Check if this is an explanation request
    if (payload.mode === 'explain') {
      try {
        const explanation = await explainTask(payload.taskData)
        return NextResponse.json({ 
          incident_type: 'Task Interpretation',
          summary: explanation.summary,
          adminAnalysis: explanation.adminAnalysis,
          rhAnalysis: explanation.rhAnalysis,
          retrieval: {
            chunks_found: 1,
            grouped: { "AI Analysis": [{ content: "Analysis generated via Gemini 1.5 Flash", topic: "Expert System", similarity: 1 }] }
          }
        })
      } catch (err: any) {
        console.error('Gemini explanation failed:', err)
        return NextResponse.json({ error: 'Gemini analysis failed. Please check your API key.' }, { status: 503 })
      }
    }

    // Default to localhost:8000 for original log analysis if mode is not explain
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000'
    const analyzeUrl = `${backendUrl}/analyze`

    const response = await fetch(analyzeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.detail || 'Backend analysis failed' }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error: any) {
    console.error('Error in /api/analyze:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
