import { apiSuccess, apiError, apiServerError } from '@/lib/api-helpers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBoardBySlug, getPins } from '@/lib/boardService'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const board = await getBoardBySlug(slug)
    if (!board) {
      return apiError("Board not found", 404)
    }

    const { searchParams } = new URL(_request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const includeExpired = searchParams.get('includeExpired') === 'true'

    const pinsResult = await getPins({ boardId: board.id, includeExpired, page })

    return NextResponse.json({ board, ...pinsResult })
  } catch (error) {
    console.error('GET /api/boards/[slug]:', error)
    return apiError("Internal server error", 500)
  }
}
