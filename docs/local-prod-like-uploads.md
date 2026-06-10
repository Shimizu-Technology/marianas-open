# Production-like local gallery upload testing

Use this when testing the event gallery upload flow before merging upload-related PRs. The normal Rails development environment still uses disk storage and async jobs for day-to-day work; this mode intentionally mirrors production by using S3 direct uploads and Solid Queue.

## What this mode matches

- Active Storage service: `amazon` (same S3 direct-upload path as production)
- Active Job adapter: `solid_queue`
- Background processing: separate `bin/jobs` worker process
- Upload concurrency: unchanged frontend behavior

## Prerequisites

1. `api/.env` has valid AWS variables:

   ```sh
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=...
   AWS_S3_BUCKET=...
   ```

   Prefer a dedicated dev/test bucket when possible. If using the production bucket, delete test gallery uploads from the admin after testing.

2. The S3 bucket CORS allows local browser origins. Direct browser-to-S3 upload will fall back to the Rails API unless the bucket allows the Vite origin.

   Required local origins for the default script:

   ```text
   http://localhost:5173
   http://127.0.0.1:5173
   ```

   Keep the production origins too:

   ```text
   https://marianasopen.com
   https://www.marianasopen.com
   ```

   Example CORS shape:

   ```json
   {
     "CORSRules": [
       {
         "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
         "AllowedOrigins": [
           "https://marianasopen.com",
           "https://www.marianasopen.com",
           "http://localhost:5173",
           "http://127.0.0.1:5173"
         ],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["ETag"]
       }
     ]
   }
   ```

3. Native image processing is available:

   ```sh
   cd api
   bundle exec rake image_processing:verify
   ```

## Run it

Stop any other local apps using ports `3000` or `5173`, then run:

```sh
./scripts/dev-prod-like-uploads.sh
```

Optional ports:

```sh
API_PORT=3001 WEB_PORT=5174 ./scripts/dev-prod-like-uploads.sh
```

If you change `WEB_PORT`, add that origin to the S3 bucket CORS too.

## Upload test checklist

1. Open `http://localhost:5173/admin/events`.
2. Edit an event and upload a small batch of gallery images.
3. In the floating panel, confirm:
   - Mode shows `Direct S3`.
   - transferred bytes increase during upload.
   - average speed and ETA populate after upload starts.
   - files move from hashing/preparing/uploading/saving to complete.
4. Watch the worker logs for image processing.
5. If the panel shows `Server fallback`, direct S3 is not working locally. Check S3 CORS first.

## Reading bottlenecks

- `Direct S3` + low average speed: likely bandwidth or original file size.
- `Server fallback`: direct upload/CORS/S3 config problem.
- Upload completes fast but images stay processing: Solid Queue/libvips/variant processing bottleneck.
- Long hashing/preparing before bytes move: client checksum or presign latency.
