import { query } from '../db/pool.js'

interface EdgePathRow {
  edge_type: string
  from_label: string
  to_label: string
  from_external_id: string
  to_external_id: string
}

export default class KgRepository {
  public async permissionPath(documentId: string, userId: string): Promise<Array<{
    edgeType: string
    from: { id: string; label: string }
    to: { id: string; label: string }
  }>> {
    const result = await query<EdgePathRow>(
      `
        SELECT e.edge_type, f.label AS from_label, t.label AS to_label,
               f.external_id AS from_external_id, t.external_id AS to_external_id
        FROM kg_edges e
        JOIN kg_nodes f ON f.id = e.from_node_id
        JOIN kg_nodes t ON t.id = e.to_node_id
        WHERE e.tenant_id = 'tasco-demo'
          AND (
            (f.node_type = 'document' AND f.external_id = $1)
            OR (f.node_type = 'user' AND f.external_id = 'user:' || $2)
          )
        ORDER BY e.edge_type, f.external_id, t.external_id
      `,
      [documentId, userId]
    )
    return result.rows.map((row) => ({
      edgeType: row.edge_type,
      from: { id: row.from_external_id, label: row.from_label },
      to: { id: row.to_external_id, label: row.to_label },
    }))
  }
}
