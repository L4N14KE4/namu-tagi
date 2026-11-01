#!/usr/bin/env python3
# 팝업을 크롬 확장 밖에서(localhost) 열어 보는 시험용 페이지를 만든다.
#   python3 e2e/popup-harness/build.py <빈 폴더>
#   cd <빈 폴더> && python3 -m http.server 8765
#   http://localhost:8765/popup-test.html?theme=dark        (dead=1은 탭 연결 끊김 화면, intro=1은 처음 여는 팝업의 짧은 설명 화면)
# 팝업 코드를 고칠 때마다 다시 만든다(popup.html과 스크립트를 복사해 오므로).
import json, pathlib, shutil, sys

here = pathlib.Path(__file__).parent
ext = here.parent.parent / 'extension'
out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
for f in ['popup.js', 'intro.js', 'words.js', 'hubs.js', 'wordmark.svg']:
    shutil.copy(ext / f, out / f)
shutil.copytree(ext / 'fonts', out / 'fonts', dirs_exist_ok=True)
html = (ext / 'popup.html').read_text(encoding='utf8')
tag = '<script src="popup.js"></script>'
assert html.count(tag) == 1, 'popup.html의 popup.js 스크립트 태그를 찾지 못했다'
version = json.loads((ext / 'manifest.json').read_text(encoding='utf8'))['version']
stub = '<script>\n' + (here / 'stub.js').read_text(encoding='utf8').replace('__VERSION__', version) + '</script>\n'
(out / 'popup-test.html').write_text(html.replace(tag, stub + tag), encoding='utf8')
print('만들었어요:', out / 'popup-test.html')
