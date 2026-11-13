"""f004 — runs the frozen eval-1.1 CLI (main) UNCHANGED, after asking its streaming reader to keep the export's price_sol column (the registered
triggers read the trade price; the frozen KEEP list drops it, which makes every spec abstain). Nothing else is touched; scoring is the evaluator's.
Usage: F006P2_EVAL=<evaluate.py> python3 -I s1_wrapper.py --data <replay> --rules ... --from ... --to ... --out results_s1.json"""
import os, sys, hashlib, importlib.util
p = os.environ["F006P2_EVAL"]; assert hashlib.sha256(open(p, "rb").read()).hexdigest() == "f5686511fcae09c1c191ca5ffee167c6ad1421cddbb1be8b1c4f0f3eb4cc8a86"
spec = importlib.util.spec_from_file_location("ev_cli", p); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
ev.KEEP = ev.KEEP + ("price_sol",)
ev.main(sys.argv[1:])
