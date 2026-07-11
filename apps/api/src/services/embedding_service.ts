import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { getOptionalEnv } from '../config/env.js'

const DEFAULT_MODEL = 'cohere.embed-multilingual-v3'
const EXPECTED_DIMENSIONS = 1024

interface CohereEmbedResponse {
  embeddings?: number[][] | {
    float?: number[][]
  }
}

export default class EmbeddingService {
  private client?: BedrockRuntimeClient
  private readonly queryCache = new Map<string, number[]>()

  public isEnabled(): boolean {
    return getOptionalEnv('EMBEDDINGS_ENABLED') === 'true'
  }

  public model(): string {
    return getOptionalEnv('EMBEDDING_MODEL') ?? DEFAULT_MODEL
  }

  public async embedSearchText(text: string): Promise<number[] | null> {
    const key = text.trim().toLocaleLowerCase('vi-VN')
    if (!key) return null
    const cached = this.queryCache.get(key)
    if (cached) return cached
    const [embedding] = await this.embedMany([text], 'search_query')
    if (embedding) {
      this.queryCache.set(key, embedding)
      if (this.queryCache.size > 100) this.queryCache.delete(this.queryCache.keys().next().value ?? key)
    }
    return embedding ?? null
  }

  public async embedDocumentText(text: string): Promise<number[] | null> {
    const [embedding] = await this.embedMany([text], 'search_document')
    return embedding ?? null
  }

  public async embedDocumentTexts(texts: string[]): Promise<Array<number[] | null>> {
    if (!this.isEnabled()) return texts.map(() => null)
    const result: Array<number[] | null> = []
    for (let offset = 0; offset < texts.length; offset += 96) {
      result.push(...await this.embedMany(texts.slice(offset, offset + 96), 'search_document'))
    }
    return result
  }

  public toVectorLiteral(embedding: number[]): string {
    return `[${embedding.map((value) => Number(value).toFixed(8)).join(',')}]`
  }

  private async embedMany(texts: string[], inputType: 'search_query' | 'search_document'): Promise<Array<number[] | null>> {
    if (!this.isEnabled()) return texts.map(() => null)
    const nonEmpty = texts.map((text) => text.trim())
    if (nonEmpty.some((text) => !text)) return texts.map(() => null)

    const response = await this.getClient().send(
      new InvokeModelCommand({
        modelId: this.model(),
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          texts: nonEmpty,
          input_type: inputType,
          embedding_types: ['float'],
        }),
      })
    )

    const body = response.body ? JSON.parse(new TextDecoder().decode(response.body)) as CohereEmbedResponse : {}
    const embeddings = Array.isArray(body.embeddings) ? body.embeddings : body.embeddings?.float
    return texts.map((_, index) => {
      const embedding = embeddings?.[index]
      return embedding?.length === EXPECTED_DIMENSIONS ? embedding : null
    })
  }

  private getClient(): BedrockRuntimeClient {
    if (!this.client) {
      this.client = new BedrockRuntimeClient({
        region: getOptionalEnv('AWS_REGION') ?? getOptionalEnv('AWS_DEFAULT_REGION') ?? 'us-east-1',
      })
    }

    return this.client
  }
}
