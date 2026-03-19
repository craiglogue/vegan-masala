#!/bin/zsh

cd "/Users/craiglogue/Desktop/vegan-masala" || exit 1

echo "----- $(date) -----" >> generated/scheduler.log

curl -s -X POST "http://localhost:3000/api/admin/social/queue/run" \
-H "x-scheduler-secret: vegan-masala-local-scheduler-2026" \
-H "Content-Type: application/json" \
>> generated/scheduler.log

echo "" >> generated/scheduler.log
