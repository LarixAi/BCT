-- Allow common mobile camera MIME variants (Samsung / Android gallery).

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/octet-stream'
]
where id = 'driver-documents';
