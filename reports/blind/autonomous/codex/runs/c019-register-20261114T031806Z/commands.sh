# From /workspace/research-audit; approved cached data only.
python -I c019-register-20261114T031806Z/register.py > c019-register-20261114T031806Z/register.log 2>&1
# First local run used L003 overlap only. initial_overlap_counts.json preserves those feature-only results for validation.
python -I c019-register-20261114T031806Z/validate.py > c019-register-20261114T031806Z/validation.log 2>&1
# Public immutable GitHub metadata read only; default sandbox failed, approved escalation succeeded.
python c019-register-20261114T031806Z/prepare_public.py
python c019-register-20261114T031806Z/package_artifacts.py
# In run folder: sha256sum -c ARTIFACT_SHA256SUMS.txt
# NO scoring command: R91/R92 prohibit a new development-window trade test.
