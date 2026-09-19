"""docs/*.md 매뉴얼을 PDF로 만든다 (Markdown → HTML → Edge headless 인쇄).

사용: python scripts/build-manuals.py
출력: docs/미용SOS_사용자매뉴얼.pdf, docs/미용SOS_관리자매뉴얼.pdf
필요: pip install markdown, Microsoft Edge 또는 Chrome
"""
import datetime
import pathlib
import re
import subprocess
import sys
import tempfile

import markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]

MANUALS = [
    ("user-manual.md", "미용SOS_사용자매뉴얼.pdf", "미용 SOS 사용자 매뉴얼", "회원 · 전문가용"),
    ("admin-manual.md", "미용SOS_관리자매뉴얼.pdf", "미용 SOS 관리자 매뉴얼", "운영자용"),
]

CSS = """
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }
* { box-sizing: border-box; }
body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; font-size: 10.5pt; line-height: 1.65; color: #1f2328; }
.cover { text-align: center; padding: 70mm 0 0 0; page-break-after: always; }
.cover .brand { color: #e11d48; font-weight: 700; letter-spacing: 2px; font-size: 13pt; }
.cover h1 { font-size: 30pt; margin: 8mm 0 4mm; border: 0; }
.cover .sub { font-size: 13pt; color: #555; }
.cover .meta { margin-top: 40mm; font-size: 10pt; color: #777; }
h1 { font-size: 20pt; border-bottom: 2px solid #e11d48; padding-bottom: 4px; margin: 0 0 10px; }
h2 { font-size: 15pt; color: #be123c; margin: 22px 0 8px; border-bottom: 1px solid #f0c8d0; padding-bottom: 3px; page-break-after: avoid; }
h3 { font-size: 12pt; margin: 16px 0 6px; page-break-after: avoid; }
p { margin: 6px 0; }
ul, ol { margin: 6px 0 6px 0; padding-left: 22px; }
li { margin: 2px 0; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.8pt; page-break-inside: avoid; }
th, td { border: 1px solid #d0d7de; padding: 5px 8px; vertical-align: top; text-align: left; }
th { background: #fdf2f4; }
blockquote { margin: 10px 0; padding: 6px 12px; background: #fff8e6; border-left: 4px solid #f59e0b; color: #5c4400; page-break-inside: avoid; }
code { font-family: Consolas, 'Malgun Gothic', monospace; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
pre { background: #f6f8fa; border: 1px solid #e1e4e8; border-radius: 4px; padding: 8px 10px; overflow-wrap: anywhere; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
hr { border: 0; border-top: 1px solid #e5e7eb; margin: 16px 0; }
"""


def find_browser() -> str:
    for b in BROWSERS:
        if pathlib.Path(b).exists():
            return b
    sys.exit("Edge 또는 Chrome을 찾지 못했어요.")


def render(md_name: str, title: str, audience: str) -> str:
    text = (DOCS / md_name).read_text(encoding="utf-8")
    text = re.sub(r"^(\s*)- \[ \] ", r"\1- ☐ ", text, flags=re.M)  # 체크리스트
    text = re.sub(r"^# .*\n+", "", text, count=1)  # 표지에 제목이 있으므로 첫 H1 제거
    body = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])
    today = datetime.date.today().strftime("%Y-%m-%d")
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body>
<section class="cover"><div class="brand">미용 SOS</div><h1>{title.replace('미용 SOS ', '')}</h1><div class="sub">{audience}</div>
<div class="meta">https://mentor.sean2022.one:3004<br>작성일 {today}</div></section>
{body}</body></html>"""


def main():
    browser = find_browser()
    for md_name, pdf_name, title, audience in MANUALS:
        with tempfile.TemporaryDirectory() as tmp:
            html = pathlib.Path(tmp) / "m.html"
            html.write_text(render(md_name, title, audience), encoding="utf-8")
            out = DOCS / pdf_name
            subprocess.run(
                [browser, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--print-to-pdf-no-header-footer",
                 f"--print-to-pdf={out}", html.as_uri()],
                check=True, capture_output=True, timeout=120,
            )
        print("생성:", out)


if __name__ == "__main__":
    main()
