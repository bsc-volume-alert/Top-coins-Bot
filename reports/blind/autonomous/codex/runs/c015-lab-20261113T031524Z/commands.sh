# Common cache with prior run folders as siblings; approved development data only.
# If absent, regenerate c012 trade_ledger.json with its unchanged lab.py and c010 trade_ledger.json with its unchanged lab.py.
python c015-lab-20261113T031524Z/prepare.py
python c015-lab-20261113T031524Z/audit_marks.py > c015-lab-20261113T031524Z/audit.log 2>&1
python c015-lab-20261113T031524Z/make_lab.py
python c015-lab-20261113T031524Z/lab.py > c015-lab-20261113T031524Z/lab.log 2>&1
python c015-lab-20261113T031524Z/analyze_lab.py > c015-lab-20261113T031524Z/lab_analysis.log 2>&1
# In run directory:
sha256sum -c ARTIFACT_SHA256SUMS.txt
