# Supabase Storage Setup for Avatar Uploads

## Required Setup Steps

To enable avatar uploads, you need to create a storage bucket in your Supabase project.

### 1. Create the Avatars Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Enable (so avatars are publicly accessible)
   - Click **Create bucket**

### 2. Set Up Storage Policies

After creating the bucket, you need to set up RLS (Row Level Security) policies:

#### Policy 1: Allow Authenticated Users to Upload
```sql
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow Users to Update Their Own Avatars
```sql
CREATE POLICY "Users can update their own avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow Users to Delete Their Own Avatars
```sql
CREATE POLICY "Users can delete their own avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Allow Public Read Access
```sql
CREATE POLICY "Public can view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### 3. Alternative: Use Supabase Dashboard UI

You can also create these policies through the Supabase Dashboard:

1. Go to **Storage** → **Policies**
2. Click **New policy**
3. Choose a template or create custom policies
4. For authenticated uploads:
   - **Policy name**: "Authenticated users can upload avatars"
   - **Allowed operation**: INSERT
   - **Target roles**: authenticated
   - **USING expression**: `bucket_id = 'avatars'`
   - **WITH CHECK expression**: `bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text`

### 4. Verify Setup

After setting up the bucket and policies, test the upload:

1. Navigate to `/profile` in your app
2. Click "Change Avatar"
3. Select an image file (JPG, PNG, WebP, or GIF under 2MB)
4. The avatar should upload and display immediately
5. Check the Supabase Storage dashboard to see the uploaded file

### File Naming Convention

The app uses this naming pattern for avatars:
```
{userId}-{timestamp}.{extension}
```

Example: `550e8400-e29b-41d4-a716-446655440000-1710425678901.jpg`

This ensures:
- Each user's avatars are identifiable
- No filename conflicts
- Easy cleanup of old avatars

### Storage Limits

Default Supabase limits:
- **Free tier**: 1GB storage
- **Pro tier**: 100GB storage
- **Max file size**: 50MB (our app limits to 2MB)

### Troubleshooting

**Error: "new row violates row-level security policy"**
- Check that RLS policies are correctly set up
- Verify the user is authenticated
- Ensure the bucket name is exactly `avatars`

**Error: "Bucket not found"**
- Verify the bucket exists in Supabase Storage
- Check the bucket name spelling

**Upload succeeds but image doesn't display**
- Verify the bucket is set to **public**
- Check browser console for CORS errors
- Ensure the public URL is correctly generated

### Next Steps

Once the bucket is set up:
1. Test avatar upload functionality
2. Verify old avatars are deleted when uploading new ones
3. Check that avatars display correctly in the header
4. Test with different image formats and sizes
