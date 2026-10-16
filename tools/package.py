"""Build an offline preview, a test CCX and a source ZIP.

For release installation validation, repack using Adobe UXP Developer Tool > Package.
"""
from pathlib import Path
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / 'plugin'
OUT = ROOT / 'dist'
OUT.mkdir(exist_ok=True)
version = json.loads((PLUGIN / 'manifest.json').read_text(encoding='utf-8'))['version']
license_text = (ROOT / 'LICENSE').read_text(encoding='utf-8')

html = (PLUGIN / 'ui/index.html').read_text(encoding='utf-8')
html = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">',
                    '<style>' + (PLUGIN / 'ui/styles.css').read_text(encoding='utf-8') + '</style>')
for src in ['../data/catalog.js', '../renderer.js', 'app.js']:
    js = (PLUGIN / 'ui' / src).resolve().read_text(encoding='utf-8').replace('</script', '<\\/script')
    html = html.replace('<script src="' + src + '"></script>', '<script>' + js + '</script>')
notices = [license_text]
for name in ['ATTRIBUTION.txt', 'Tabler-MIT.txt', 'FontAwesome-Free.txt']:
    notices.append((PLUGIN / 'licenses' / name).read_text(encoding='utf-8'))
html = '<!--\n' + '\n\n'.join(notices).replace('--', '- -') + '\n-->\n' + html
(ROOT / 'ABRIR-VISTA-PREVIA.html').write_text(html, encoding='utf-8')

ccx = ROOT / f'Icono-{version}.ccx'
with zipfile.ZipFile(ccx, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in sorted(PLUGIN.rglob('*')):
        if not file.is_file() or '__pycache__' in file.parts:
            continue
        if file.name.endswith(('-icons.json', '-info.json', '.pyc')):
            continue
        archive.write(file, file.relative_to(PLUGIN))
    archive.writestr('licenses/Icono-MIT.txt', license_text)

source_zip = OUT / f'Icono-Photoshop-Windows-v{version}.zip'
source_files = [ROOT / name for name in [
    'README.md', 'LICENSE', 'INSTRUCCIONES.txt', 'package.json', 'package-lock.json',
    '.gitignore', '.gitattributes', 'ABRIR-VISTA-PREVIA.html', ccx.name,
]]
for directory in ['plugin', 'tests', 'tools', 'docs']:
    source_files.extend(sorted((ROOT / directory).rglob('*')))
with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as archive:
    for file in source_files:
        if not file.is_file() or '__pycache__' in file.parts or file.suffix == '.pyc':
            continue
        archive.write(file, Path('Icono') / file.relative_to(ROOT))

for file in [ccx, source_zip]:
    with zipfile.ZipFile(file) as archive:
        assert archive.testzip() is None
    print(file.relative_to(ROOT), file.stat().st_size)
