# Marianas Open API

Rails 8 JSON API for the public platform and invite-only administration console.

## Setup

```bash
bundle install
bin/rails db:prepare
bin/rails server
```

Ruby `3.3.7` is declared in `.ruby-version`. PostgreSQL and an Active Storage service are required. Clerk protects admin endpoints; public event, sponsor, ranking, video, and content endpoints remain unauthenticated.

## Test and safety checks

```bash
bin/rails test
bin/rails zeitwerk:check
bundle exec brakeman -q --no-pager
```

Database migrations create seasons, safe event lineage, sponsor placements, publishing constraints, and audit logs. Deployments must run `bin/rails db:migrate` before serving the new admin console.
