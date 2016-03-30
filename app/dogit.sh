#!/bin/bash -e
git add -u .
git status
git commit -m "$*"
git push GitHub master