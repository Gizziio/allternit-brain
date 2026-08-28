.PHONY: brain-pipeline session-start session-end audit links watch

brain-pipeline:
	python3 scripts/brain-pipeline.py --write

session-start:
	python3 scripts/session-sync.py --start

session-end:
	python3 scripts/session-sync.py --end

audit:
	node Ops/scripts/audit-brain.js

links:
	node Ops/scripts/validate-links.js

watch:
	node Ops/scripts/watch-brain.js --write
