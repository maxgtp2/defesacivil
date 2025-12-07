-- Tabela de configurações do site
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usuários/colaboradores
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'collaborator' CHECK (role IN ('master', 'admin', 'collaborator')),
  permissions JSONB DEFAULT '{"can_manage_users": false, "can_manage_posts": true, "can_manage_ads": false, "can_manage_settings": false}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de postagens/notícias
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  external_link TEXT,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de propagandas/anúncios
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  position TEXT NOT NULL CHECK (position IN ('sidebar_left', 'sidebar_right', 'between_posts', 'header', 'footer')),
  size TEXT DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large', 'custom')),
  custom_width INTEGER,
  custom_height INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contador de visitas
CREATE TABLE IF NOT EXISTS visit_counter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count BIGINT DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de elementos ocultos do site
CREATE TABLE IF NOT EXISTS hidden_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  element_key TEXT UNIQUE NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  hidden_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de links de acesso rápido
CREATE TABLE IF NOT EXISTS quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,
  is_visible BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir contador inicial
INSERT INTO visit_counter (count) VALUES (0) ON CONFLICT DO NOTHING;

-- Inserir configurações padrão do site
INSERT INTO site_settings (key, value) VALUES 
  ('colors', '{"primary": "#f97316", "secondary": "#1e40af", "accent": "#059669", "background": "#ffffff", "text": "#1f2937"}'::jsonb),
  ('logo', '{"url": "/images/logo2.png", "alt": "Defesa Civil Cidade Ocidental"}'::jsonb),
  ('contact', '{"phone": "199", "email": "defesacivil@cidadeocidental.go.gov.br", "address": "Cidade Ocidental - GO"}'::jsonb),
  ('social', '{"instagram": "https://www.instagram.com/defesacivil_co/", "facebook": "", "twitter": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Inserir links de acesso rápido padrão
INSERT INTO quick_links (title, url, icon, display_order) VALUES
  ('Ouvidoria', 'https://www.cidadeocidental.go.gov.br/ouvidoria', 'MessageSquare', 1),
  ('IPTU', 'https://www.cidadeocidental.go.gov.br/iptu', 'Home', 2),
  ('Diário Oficial', 'https://www.cidadeocidental.go.gov.br/diario-oficial', 'FileText', 3),
  ('Portal do Servidor', 'https://www.cidadeocidental.go.gov.br/portal-servidor', 'Users', 4),
  ('Licitações', 'https://www.cidadeocidental.go.gov.br/licitacoes', 'Briefcase', 5),
  ('Transparência', 'https://www.cidadeocidental.go.gov.br/transparencia', 'Eye', 6)
ON CONFLICT DO NOTHING;

-- Habilitar RLS em todas as tabelas
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para leitura pública (site público)
CREATE POLICY "Public read site_settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (is_visible = true);
CREATE POLICY "Public read advertisements" ON advertisements FOR SELECT USING (is_active = true);
CREATE POLICY "Public read visit_counter" ON visit_counter FOR SELECT USING (true);
CREATE POLICY "Public read quick_links" ON quick_links FOR SELECT USING (is_visible = true);
CREATE POLICY "Public read hidden_elements" ON hidden_elements FOR SELECT USING (true);

-- Políticas RLS para escrita (apenas usuários autenticados)
CREATE POLICY "Auth update visit_counter" ON visit_counter FOR UPDATE USING (true);
CREATE POLICY "Auth insert visit_counter" ON visit_counter FOR INSERT WITH CHECK (true);

-- Políticas para usuários autenticados (admin)
CREATE POLICY "Auth users read all" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update" ON users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users delete" ON users FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth posts all" ON posts FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth advertisements all" ON advertisements FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth site_settings all" ON site_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth hidden_elements all" ON hidden_elements FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth quick_links all" ON quick_links FOR ALL TO authenticated USING (true);
