-- Create the photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  date TIMESTAMPTZ NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (but allow all operations for now)
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read photos (public viewing)
CREATE POLICY "Anyone can view photos" ON photos
  FOR SELECT USING (true);

-- Allow anyone to insert photos (for simplicity - you can add auth later)
CREATE POLICY "Anyone can insert photos" ON photos
  FOR INSERT WITH CHECK (true);

-- Allow anyone to delete photos
CREATE POLICY "Anyone can delete photos" ON photos
  FOR DELETE USING (true);

-- Allow anyone to update photos
CREATE POLICY "Anyone can update photos" ON photos
  FOR UPDATE USING (true);

-- Create storage bucket for photos (run this in the Storage section or via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to the photos bucket
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos');

CREATE POLICY "Anyone can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos');

CREATE POLICY "Anyone can delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos');
