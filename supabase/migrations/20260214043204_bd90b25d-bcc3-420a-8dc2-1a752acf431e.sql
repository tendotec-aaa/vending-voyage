
-- Create storage bucket for item photos
INSERT INTO storage.buckets (id, name, public) VALUES ('item-photos', 'item-photos', true);

-- Allow authenticated users to upload item photos
CREATE POLICY "Authenticated users can upload item photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'item-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update item photos
CREATE POLICY "Authenticated users can update item photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'item-photos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete item photos
CREATE POLICY "Authenticated users can delete item photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'item-photos' AND auth.role() = 'authenticated');

-- Allow public read access to item photos
CREATE POLICY "Item photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'item-photos');
