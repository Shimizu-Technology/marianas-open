#!/usr/bin/env bash
set -o errexit

bundle exec rails db:migrate
