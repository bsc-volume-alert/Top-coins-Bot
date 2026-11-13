# Approved caches and prior Codex run folders are siblings. No tracker source or protected data.
python c016-lab-20261113T091125Z/prepare.py
python c016-lab-20261113T091125Z/audit_provenance.py > c016-lab-20261113T091125Z/provenance.log 2>&1
python c016-lab-20261113T091125Z/audit_cross_table.py > c016-lab-20261113T091125Z/cross_table.log 2>&1
python c016-lab-20261113T091125Z/audit_nested_checks.py > c016-lab-20261113T091125Z/nested_checks.log 2>&1
# This precheck reads only causal features/identities; its count was published before the original scoring run.
python c016-lab-20261113T091125Z/precheck.py > c016-lab-20261113T091125Z/precheck.log 2>&1
python c016-lab-20261113T091125Z/make_lab.py
python c016-lab-20261113T091125Z/lab.py > c016-lab-20261113T091125Z/lab.log 2>&1
# Regenerate prior C010 trade_ledger.json with its unchanged lab.py if needed for the baseline field check.
python c016-lab-20261113T091125Z/analyze_lab.py > c016-lab-20261113T091125Z/lab_analysis.log 2>&1
# In run directory:
sha256sum -c ARTIFACT_SHA256SUMS.txt
