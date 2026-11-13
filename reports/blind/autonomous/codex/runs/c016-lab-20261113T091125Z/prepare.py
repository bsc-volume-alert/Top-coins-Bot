import urllib.request,pathlib,json
r=pathlib.Path(__file__).parent
p=json.load(urllib.request.urlopen('https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/fc5119749dac79a800853abd4eab034f64e5138b'));(r/'parent.json').write_text(json.dumps(p));print('TREE',p['tree']['sha'])
