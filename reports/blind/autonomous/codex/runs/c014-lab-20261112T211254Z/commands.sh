# Run from a common cache with prior Codex run folders as siblings; approved datasets only.
# If absent, regenerate C009 records.json with unchanged c009/autopsy.py and C010 trade_ledger.json with unchanged c010/lab.py.
python c014-lab-20261112T211254Z/prepare.py
python c014-lab-20261112T211254Z/audit_runners.py > c014-lab-20261112T211254Z/audit.log 2>&1
python c014-lab-20261112T211254Z/make_lab.py
python c014-lab-20261112T211254Z/lab.py > c014-lab-20261112T211254Z/lab.log 2>&1
python c014-lab-20261112T211254Z/analyze_lab.py > c014-lab-20261112T211254Z/lab_analysis.log 2>&1
# In run directory:
sha256sum -c ARTIFACT_SHA256SUMS.txt
