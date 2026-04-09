#!/bin/bash
# Sync benchmark results to the web app data directory
# Run this periodically or after benchmark completes

RESULTS_DIR="/workspace/benchmark/results"
WEB_DATA_DIR="/workspace/web/src/data"

if [ -f "$RESULTS_DIR/benchmark_summary.json" ]; then
    cp "$RESULTS_DIR/benchmark_summary.json" "$WEB_DATA_DIR/benchmark-results.json"
    echo "✅ Synced benchmark results to web app"
    echo "   Debates: $(python3 -c "import json; d=json.load(open('$WEB_DATA_DIR/benchmark-results.json')); print(d['total_debates'])")"
else
    echo "⚠️ No benchmark results found yet"
fi
