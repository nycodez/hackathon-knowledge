import { randomUUID } from 'node:crypto'
import type { TascoAskResponse, TascoThreadResponse, TascoThreadSummary } from '../../../../packages/shared/src/index.js'
import { query, transaction } from '../db/pool.js'

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
    return transaction(async (client) => {
      if (input.threadId) {
        const existing = await client.query<{ id: string }>(
        'SELECT id FROM tasco_threads WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
        [threadId, 'tasco-demo', input.userId]
      )
        if (!existing.rows[0]) throw new Error('Unknown or unauthorized Tasco thread')
      } else {
        await client.query(
          `INSERT INTO tasco_threads (id, tenant_id, user_id, identity_type, language, title)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [threadId, 'tasco-demo', input.userId, input.userId.startsWith('AUTO-') ? 'demo_persona' : 'sponsor_user', input.language, input.question.slice(0, 255)]
        )
      }

      await client.query(
      `INSERT INTO tasco_messages (id, thread_id, role, content) VALUES ($1, $2, 'user', $3)`,
      [randomUUID(), threadId, input.question]
      )
      const messageId = randomUUID()
      await client.query(
      `INSERT INTO tasco_messages (id, thread_id, role, content, response) VALUES ($1, $2, $3, $4, $5)`,
      [messageId, threadId, input.response.state === 'answered' ? 'assistant' : 'refusal', input.response.answer, input.response]
      )
      await client.query('UPDATE tasco_threads SET updated_at = now(), language = $2 WHERE id = $1', [threadId, input.language])
      return { threadId, messageId }
    })
  }

  public async list(userId: string): Promise<TascoThreadSummary[]> {
    const result = await query<{
      id: string
      user_id: string
      language: 'en' | 'vi'
      title: string
      preview: string | null
      message_count: string | number
      updated_at: Date | string
    }>(
      `
        SELECT t.id, t.user_id, t.language, t.title,
               latest.content AS preview, count(m.id) AS message_count, t.updated_at
        FROM tasco_threads t
        LEFT JOIN tasco_messages m ON m.thread_id = t.id
        LEFT JOIN LATERAL (
          SELECT content FROM tasco_messages
          WHERE thread_id = t.id AND role IN ('assistant', 'refusal')
          ORDER BY created_at DESC, id DESC LIMIT 1
        ) latest ON true
        WHERE t.tenant_id = 'tasco-demo' AND t.user_id = $1
        GROUP BY t.id, latest.content
        ORDER BY t.updated_at DESC
        LIMIT 20
      `,
      [userId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      language: row.language,
      title: row.title,
      preview: row.preview ?? '',
      messageCount: Number(row.message_count),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    }))
  }

  public async find(threadId: string, userId: string): Promise<TascoThreadResponse | null> {
    const threadResult = await query<ThreadRow>(
      'SELECT id, user_id, language, title FROM tasco_threads WHERE id = $1 AND tenant_id = $2 AND user_id = $3',
      [threadId, 'tasco-demo', userId]
    )
    const thread = threadResult.rows[0]
    if (!thread) return null
    const messageResult = await query<MessageRow>(
      `SELECT id, role, content, response, created_at
       FROM tasco_messages
       WHERE thread_id = $1
       ORDER BY created_at, CASE WHEN role = 'user' THEN 0 ELSE 1 END, id`,
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
