import { query } from '../db/pool.js'

export interface SeedChecksumInput {
  id: string
  tenantId: string
  seedName: string
  checksum: string
  counts: Record<string, number>
  metadata: Record<string, unknown>
}

export default class SeedIntegrityRepository {
  public async upsert(input: SeedChecksumInput): Promise<void> {
    await query(
      `
        INSERT INTO tasco_seed_checksums (id, tenant_id, seed_name, checksum, counts, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, seed_name) DO UPDATE SET
          checksum = EXCLUDED.checksum,
          counts = EXCLUDED.counts,
          metadata = EXCLUDED.metadata,
          updated_at = now()
      `,
      [
        input.id,
        input.tenantId,
        input.seedName,
        input.checksum,
        input.counts,
        input.metadata,
      ]
    )
  }
}
