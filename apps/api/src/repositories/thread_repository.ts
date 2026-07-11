import { randomUUID } from 'node:crypto'
import type { TascoAskResponse, TascoThreadResponse } from '@hackathon/shared'
import { query } from '../db/pool.js'

interface ThreadRow {
  id: string
  user_id: string
  language: 'en' | 'vi'
  title: string
}

interface MessageRow {
  id: string
  role: TascoThreadResponse['messages'][number]['role']
  content: string
  response: TascoAskResponse | null
  created_at: Date | string
}

export default class ThreadRepository {
  public async appendExchange(input: {
    threadId?: string
    userId: string
    language: 'en' | 'vi'
    question: string
    response: TascoAskResponse
  }): Promise<{ threadId: string; messageId: string }> {
    const threadId = input.threadId ?? randomUUID()
    if (input.threadId) {
      const existing = await query<{ id: string }>(
        'SELECT id FROM tasco_threads WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [threadId, 'tasco-demo', input.userId]
      )
      if (!existing.rows[0]) throw new Error('Unknown or unauthorized Tasco thread')
    } else {
      await query(
        `INSERT INTO tasco_threads (id, tenant_id, user_id, language, title) VALUES ($1, $2, $3, $4, $5)`,
        [threadId, 'tasco-demo', input.userId, input.language, input.question.slice(0, 255)]
      )
    }

    await query(
      `INSERT INTO tasco_messages (id, thread_id, role, content) VALUES ($1, $2, 'user', $3)`,
      [randomUUID(), threadId, input.question]
    )
    const messageId = randomUUID()
    await query(
      `INSERT INTO tasco_messages (id, thread_id, role, content, response) VALUES ($1, $2, $3, $4, $5)`,
      [messageId, threadId, input.response.state === 'answered' ? 'assistant' : 'refusal', input.response.answer, input.response]
    )
    await query('UPDATE tasco_threads SET updated_at = now(), language = $2 WHERE id = $1', [threadId, input.language])
    return { threadId, messageId }
  }

  public async find(threadId: string, userId: string): Promise<TascoThreadResponse | null> {
    const threadResult = await query<ThreadRow>(
      'SELECT id, user_id, language, title FROM tasco_threads WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
      [threadId, 'tasco-demo', userId]
    )
    const thread = threadResult.rows[0]
    if (!thread) return null
    const messageResult = await query<MessageRow>(
      'SELECT id, role, content, response, created_at FROM tasco_messages WHERE thread_id = $1 ORDER BY created_at, id',
      [threadId]
    )
    return {
      id: thread.id,
      userId: thread.user_id,
      language: thread.language,
      title: thread.title,
      messages: messageResult.rows.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        response: message.response ?? undefined,
        createdAt: message.created_at instanceof Date ? message.created_at.toISOString() : message.created_at,
      })),
    }
  }
}
