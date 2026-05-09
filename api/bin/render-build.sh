#!/usr/bin/env bash
set -o errexit

bundle install

# Run database migrations from the Render web service Pre-Deploy command only.
# Builds can run for both web and worker services, so migrations do not belong here.
