# Render Background Jobs

Production image uploads must process gallery variants outside the Puma web service.
The web process should enqueue jobs with Solid Queue, and a separate Render worker
should run them from the same database-backed queue.

## Web service

- Keep the existing web start command.
- Do not set `SOLID_QUEUE_IN_PUMA` to a truthy value (`true`, `1`, or `yes`).
- Run migrations during deploy so the `solid_queue_*` tables exist.

## Worker service

Create a Render Background Worker using the API service environment:

```sh
bundle exec bin/jobs
```

Use the same root directory and environment variables as the API service, including
`DATABASE_URL`, `RAILS_MASTER_KEY`, and the AWS S3 variables. Leave `JOB_THREADS`
and `JOB_CONCURRENCY` unset at first so gallery image processing runs one job at a
time. Increase them only after uploads are stable on the chosen instance size.
