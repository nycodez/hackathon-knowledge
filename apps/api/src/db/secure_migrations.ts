export const secureKnowledgeMigrations: Array<{ id: string; sql: string }> = [
  {
    id: '001_create_tasco_knowledge_core',
    sql: `
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        id varchar(180) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS tasco_users (
        id varchar(32) PRIMARY KEY,
        full_name varchar(255) NOT NULL,
        department_id varchar(32) NOT NULL,
        role varchar(32) NOT NULL,
        subsidiary_id varchar(128) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS tasco_users_scope_idx ON tasco_users (subsidiary_id, department_id, role);

      CREATE TABLE IF NOT EXISTS knowledge_sources (
        id uuid PRIMARY KEY,
        track_code varchar(32) NOT NULL DEFAULT 'tasco',
        tenant_id varchar(128) NOT NULL,
        subsidiary_id varchar(128) NOT NULL,
        source_type varchar(80) NOT NULL,
        source_record_id varchar(255) NOT NULL,
        title varchar(500) NOT NULL,
        summary text,
        status varchar(32) NOT NULL DEFAULT 'indexed',
        permission_class varchar(64) NOT NULL,
        department_id varchar(128) NOT NULL,
        owner_user_id varchar(128),
        metadata jsonb NOT NULL DEFAULT '{}',
        indexed_at timestamptz,
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tasco_knowledge_sources_unique_source UNIQUE (tenant_id, source_type, source_record_id)
      );

      CREATE INDEX IF NOT EXISTS tasco_knowledge_sources_scope_idx
        ON knowledge_sources (tenant_id, subsidiary_id, status, permission_class, department_id);
      CREATE INDEX IF NOT EXISTS tasco_knowledge_sources_deleted_idx ON knowledge_sources (deleted_at);

      CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id uuid PRIMARY KEY,
        source_id uuid NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
        tenant_id varchar(128) NOT NULL,
        subsidiary_id varchar(128) NOT NULL,
        chunk_index integer NOT NULL,
        heading_path varchar(1000),
        content text NOT NULL,
        content_hash varchar(64) NOT NULL,
        token_count integer,
        search_vector tsvector,
        embedding_provider varchar(80) NOT NULL DEFAULT 'bedrock',
        embedding_model varchar(160) NOT NULL DEFAULT 'cohere.embed-multilingual-v3',
        embedding_dimensions integer NOT NULL DEFAULT 1024,
        embedding vector(1024),
        metadata jsonb NOT NULL DEFAULT '{}',
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tasco_knowledge_chunks_source_hash_unique UNIQUE (source_id, content_hash)
      );

      CREATE INDEX IF NOT EXISTS tasco_knowledge_chunks_scope_idx
        ON knowledge_chunks (tenant_id, subsidiary_id, source_id);
      CREATE INDEX IF NOT EXISTS tasco_knowledge_chunks_search_vector_gin_idx
        ON knowledge_chunks USING gin (search_vector);
      CREATE INDEX IF NOT EXISTS tasco_knowledge_chunks_embedding_hnsw_idx
        ON knowledge_chunks USING hnsw (embedding vector_cosine_ops)
        WHERE embedding IS NOT NULL;

      CREATE TABLE IF NOT EXISTS kg_nodes (
        id uuid PRIMARY KEY,
        tenant_id varchar(128) NOT NULL,
        subsidiary_id varchar(128) NOT NULL,
        node_type varchar(80) NOT NULL,
        external_id varchar(255) NOT NULL,
        label varchar(500) NOT NULL,
        permission_class varchar(64) NOT NULL,
        department_id varchar(128) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tasco_kg_nodes_unique_external UNIQUE (tenant_id, subsidiary_id, node_type, external_id)
      );

      ALTER TABLE kg_nodes ADD COLUMN IF NOT EXISTS subsidiary_id varchar(128);

      CREATE INDEX IF NOT EXISTS tasco_kg_nodes_scope_idx ON kg_nodes (tenant_id, subsidiary_id, node_type, department_id);

      CREATE TABLE IF NOT EXISTS kg_edges (
        id uuid PRIMARY KEY,
        tenant_id varchar(128) NOT NULL,
        from_node_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
        to_node_id uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
        edge_type varchar(80) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tasco_kg_edges_unique_edge UNIQUE (tenant_id, from_node_id, edge_type, to_node_id)
      );

      CREATE TABLE IF NOT EXISTS tasco_permission_cases (
        id varchar(32) PRIMARY KEY,
        user_id varchar(32) NOT NULL,
        document_id varchar(32) NOT NULL,
        expected varchar(16) NOT NULL,
        rule_text text NOT NULL,
        enforcement_point varchar(80) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS tasco_public_eval_rows (
        id varchar(32) PRIMARY KEY,
        user_id varchar(32) NOT NULL,
        document_ids text[] NOT NULL,
        expected varchar(16) NOT NULL,
        answer_type varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS retrieval_audit_events (
        id uuid PRIMARY KEY,
        tenant_id varchar(128) NOT NULL,
        track_code varchar(32) NOT NULL DEFAULT 'tasco',
        actor_user_id varchar(128),
        event_type varchar(80) NOT NULL,
        enforcement_point varchar(120),
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS tasco_retrieval_audit_scope_idx
        ON retrieval_audit_events (tenant_id, actor_user_id, event_type);
    `,
  },
  {
    id: '002_create_tasco_eval_and_seed_integrity',
    sql: `
      CREATE TABLE IF NOT EXISTS tasco_seed_checksums (
        id uuid PRIMARY KEY,
        tenant_id varchar(128) NOT NULL,
        seed_name varchar(160) NOT NULL,
        checksum varchar(64) NOT NULL,
        counts jsonb NOT NULL DEFAULT '{}',
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tasco_seed_checksums_unique_seed UNIQUE (tenant_id, seed_name)
      );

      CREATE INDEX IF NOT EXISTS tasco_seed_checksums_tenant_idx
        ON tasco_seed_checksums (tenant_id, seed_name);

      CREATE TABLE IF NOT EXISTS tasco_eval_runs (
        id uuid PRIMARY KEY,
        tenant_id varchar(128) NOT NULL,
        track_code varchar(32) NOT NULL DEFAULT 'tasco',
        run_type varchar(80) NOT NULL,
        status varchar(32) NOT NULL,
        score integer NOT NULL,
        total integer NOT NULL,
        leaks integer NOT NULL,
        permission_cases integer NOT NULL,
        public_eval_rows integer NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS tasco_eval_runs_scope_idx
        ON tasco_eval_runs (tenant_id, track_code, created_at DESC);
      CREATE INDEX IF NOT EXISTS tasco_eval_runs_status_idx
        ON tasco_eval_runs (tenant_id, status);
    `,
  },
  {
    id: '003_harden_tasco_runtime_spine',
    sql: `
      CREATE EXTENSION IF NOT EXISTS unaccent;

      CREATE OR REPLACE FUNCTION tasco_set_search_vector()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        NEW.search_vector := to_tsvector('simple', unaccent(coalesce(NEW.content, '')));
        RETURN NEW;
      END;
      $$;

      DROP TRIGGER IF EXISTS tasco_chunks_search_vector_trigger ON knowledge_chunks;
      CREATE TRIGGER tasco_chunks_search_vector_trigger
      BEFORE INSERT OR UPDATE OF content ON knowledge_chunks
      FOR EACH ROW EXECUTE FUNCTION tasco_set_search_vector();

      UPDATE knowledge_chunks
      SET search_vector = to_tsvector('simple', unaccent(content))
      WHERE search_vector IS NULL
         OR search_vector <> to_tsvector('simple', unaccent(content));

      CREATE TABLE IF NOT EXISTS tasco_subsidiaries (
        id varchar(128) PRIMARY KEY,
        name varchar(255) NOT NULL,
        meta_en text NOT NULL,
        meta_vi text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS tasco_questions (
        id uuid PRIMARY KEY,
        document_id varchar(32) NOT NULL,
        question_en text NOT NULL,
        question_vi text NOT NULL,
        answer_en text NOT NULL,
        answer_vi text NOT NULL,
        normalized_question_en text NOT NULL,
        normalized_question_vi text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tasco_questions_unique_document UNIQUE (document_id)
      );

      CREATE INDEX IF NOT EXISTS tasco_questions_normalized_en_idx ON tasco_questions (normalized_question_en);
      CREATE INDEX IF NOT EXISTS tasco_questions_normalized_vi_idx ON tasco_questions (normalized_question_vi);

      CREATE TABLE IF NOT EXISTS tasco_threads (
        id uuid PRIMARY KEY,
        tenant_id varchar(128) NOT NULL,
        user_id varchar(32) NOT NULL REFERENCES tasco_users(id),
        language varchar(2) NOT NULL CHECK (language IN ('en', 'vi')),
        title varchar(255) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS tasco_threads_user_idx ON tasco_threads (tenant_id, user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS tasco_messages (
        id uuid PRIMARY KEY,
        thread_id uuid NOT NULL REFERENCES tasco_threads(id) ON DELETE CASCADE,
        role varchar(16) NOT NULL CHECK (role IN ('user', 'assistant', 'refusal', 'system')),
        content text NOT NULL,
        response jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS tasco_messages_thread_idx ON tasco_messages (thread_id, created_at);

      CREATE OR REPLACE FUNCTION tasco_retrieval_audit_append_only()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF current_setting('tasco.allow_audit_mutation', true) IS DISTINCT FROM 'on' THEN
          RAISE EXCEPTION 'retrieval_audit_events is append-only';
        END IF;
        RETURN OLD;
      END;
      $$;

      DROP TRIGGER IF EXISTS tasco_retrieval_audit_append_only_trigger ON retrieval_audit_events;
      CREATE TRIGGER tasco_retrieval_audit_append_only_trigger
      BEFORE UPDATE OR DELETE ON retrieval_audit_events
      FOR EACH ROW EXECUTE FUNCTION tasco_retrieval_audit_append_only();

      REVOKE UPDATE, DELETE ON retrieval_audit_events FROM PUBLIC;
    `,
  },
]
