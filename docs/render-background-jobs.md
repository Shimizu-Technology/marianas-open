# Render Background Jobs

Production image uploads must process gallery variants outside the Puma web service.
The web process should enqueue jobs with Solid Queue, and a separate Render worker
should run them from the same database-backed queue.

## Web service

- Keep the existing web start command.
- Do not set `SOLID_QUEUE_IN_PUMA` to a truthy value (`true`, `1`, or `yes`).
- Set the build command to install dependencies only, for example `bundle install`
  or `./bin/render-build.sh`.
- Set the Pre-Deploy command to `./bin/render-predeploy.sh`.
- Keep the web service as the only Render service that runs migrations.

## Worker service

Create a Render Background Worker using the API service environment:

```sh
bundle exec bin/jobs
```

Use the same root directory and environment variables as the API service, including
`DATABASE_URL`, `RAILS_MASTER_KEY`, and the AWS S3 variables. Leave `JOB_THREADS`
and `JOB_CONCURRENCY` unset at first so gallery image processing runs one job at a
time. Increase them only after uploads are stable on the chosen instance size.

Do not configure a worker Pre-Deploy command for migrations. The worker build and
the web deploy can overlap, and Rails will abort with
`ActiveRecord::ConcurrentMigrationError` if two deploy processes try to migrate at
the same time.

## Native image support

Gallery uploads normalize source images, including HEIC/HEIF, into browser-safe
JPEG variants in the background worker. The API and worker services both need the
native packages listed in `api/Aptfile` so Rails can use libvips with libheif.

After native packages are installed, verify the image stack with:

```sh
bundle exec rake image_processing:verify
```
