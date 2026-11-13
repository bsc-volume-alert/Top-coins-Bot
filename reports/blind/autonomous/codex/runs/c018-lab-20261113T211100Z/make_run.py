"""Reuse F014's exact frozen-evaluator execution functions, change only entry veto."""
import pathlib,hashlib,json
r=pathlib.Path(__file__).parent;p=r/'peer_f014/run_f014.py';s=p.read_text();assert hashlib.sha256(p.read_bytes()).hexdigest()=='e4db0e13b4d77d016a37fa8716d4437e983f3958783e67d42bfbcd2ac3857fee'
s=s[s.index('import sys, os, pathlib'):s.index('stats = {"mints_streamed"')]
s=s.replace('os.path.dirname(os.path.abspath(__file__)))','os.path.join(os.path.dirname(os.path.abspath(__file__)),"peer_f014"))').replace('; T = 60.0','')
(r/'run_c018.py').write_text('"""C018 new >=5SOL creator-size entry veto; original F014 run_eval arithmetic unchanged."""\n'+s+'\n'+(r/'score_body.py').read_text())
(r/'execution_source.json').write_text(json.dumps({'peer_commit':'a27c504dfe240fecf132123bcfc5c18cb2dd4091','peer_file':'run_f014.py','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'run_eval_and_retained_functions_copied_verbatim':True,'new_loop':'score_body.py','changed_arithmetic':False},indent=2)+'\n')
