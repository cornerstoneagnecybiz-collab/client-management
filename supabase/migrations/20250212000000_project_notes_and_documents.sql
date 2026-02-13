-- Project notes (chat/notes with tagging) and project documents (text + sheet, PDF export)

-- =============================================================================
-- PROJECT NOTES
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID NULL,  -- auth.users.id when we have it
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id ON project_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_notes_created_at ON project_notes(created_at DESC);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read write project_notes" ON project_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER project_notes_updated_at
  BEFORE UPDATE ON project_notes FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- =============================================================================
-- PROJECT DOCUMENTS (text doc = Notion-like, sheet = CSV/grid)
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  doc_type TEXT NOT NULL CHECK (doc_type IN ('text', 'sheet')),
  content_json JSONB NULL,  -- rich text state or sheet rows
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read write project_documents" ON project_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER project_documents_updated_at
  BEFORE UPDATE ON project_documents FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
