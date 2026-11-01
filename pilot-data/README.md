# Pilot exports go here (not committed)

Put each participant's `basil-pilot-P-XXXXX-YYYY-MM-DD.json` file in this folder, then run:

```bash
npm run pilot:report
```

That writes `pilot-data/pilot-report.md`. Then ask Claude Code to analyse it with the prompt in
[`docs/pilot-feedback-analysis.md`](../docs/pilot-feedback-analysis.md).

Everything in this folder except this README is git-ignored, because the repo is public. Keep the
mapping from pilot codes to real people somewhere private, never here.
