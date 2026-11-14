"""Read only public immutable parent-tree metadata for authorized publication."""
import pathlib,json,urllib.request
r=pathlib.Path(__file__).parent
x=json.load(urllib.request.urlopen('https://api.github.com/repos/bsc-volume-alert/Top-coins-Bot/git/commits/122657ffed04f4df5234ba356b0a6e225e540f8c',timeout=30))
(r/'parent.json').write_text(json.dumps(x));print(x['tree']['sha'])
