#!/usr/bin/env python3
"""
Download React, TypeScript, and Vite documentation pages.
Saves cleaned text to backend/docs/{source}/*.md

Requirements:
    pip install httpx beautifulsoup4

Run once (or when you want to refresh the docs):
    python backend/scripts/fetch_docs.py
"""

import os
import re
import time
from typing import Optional, List, Set
import httpx
from bs4 import BeautifulSoup, Tag

DOCS_DIR = os.path.join(os.path.dirname(__file__), '..', 'docs')

DOCS_TO_FETCH = {
    'react': [
        ('quick-start',          'https://react.dev/learn'),
        ('describing-the-ui',    'https://react.dev/learn/describing-the-ui'),
        ('adding-interactivity', 'https://react.dev/learn/adding-interactivity'),
        ('managing-state',       'https://react.dev/learn/managing-state'),
        ('escape-hatches',       'https://react.dev/learn/escape-hatches'),
        ('useState',             'https://react.dev/reference/react/useState'),
        ('useEffect',            'https://react.dev/reference/react/useEffect'),
        ('useContext',           'https://react.dev/reference/react/useContext'),
        ('useRef',               'https://react.dev/reference/react/useRef'),
        ('useMemo',              'https://react.dev/reference/react/useMemo'),
        ('useCallback',          'https://react.dev/reference/react/useCallback'),
        ('useReducer',           'https://react.dev/reference/react/useReducer'),
        ('memo',                 'https://react.dev/reference/react/memo'),
        ('createContext',        'https://react.dev/reference/react/createContext'),
    ],
    'typescript': [
        ('basic-types',          'https://www.typescriptlang.org/docs/handbook/2/basic-types.html'),
        ('everyday-types',       'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html'),
        ('functions',            'https://www.typescriptlang.org/docs/handbook/2/functions.html'),
        ('object-types',         'https://www.typescriptlang.org/docs/handbook/2/object-types.html'),
        ('generics',             'https://www.typescriptlang.org/docs/handbook/2/generics.html'),
        ('narrowing',            'https://www.typescriptlang.org/docs/handbook/2/narrowing.html'),
        ('modules',              'https://www.typescriptlang.org/docs/handbook/2/modules.html'),
        ('classes',              'https://www.typescriptlang.org/docs/handbook/2/classes.html'),
        ('keyof-types',          'https://www.typescriptlang.org/docs/handbook/2/keyof-types.html'),
        ('typeof-types',         'https://www.typescriptlang.org/docs/handbook/2/typeof-types.html'),
        ('conditional-types',    'https://www.typescriptlang.org/docs/handbook/2/conditional-types.html'),
        ('utility-types',        'https://www.typescriptlang.org/docs/handbook/utility-types.html'),
        ('interfaces',           'https://www.typescriptlang.org/docs/handbook/2/objects.html'),
    ],
    'vite': [
        ('getting-started',      'https://vitejs.dev/guide/'),
        ('features',             'https://vitejs.dev/guide/features.html'),
        ('env-and-mode',         'https://vitejs.dev/guide/env-and-mode.html'),
        ('build',                'https://vitejs.dev/guide/build.html'),
        ('assets',               'https://vitejs.dev/guide/assets.html'),
        ('config-overview',      'https://vitejs.dev/config/'),
        ('shared-options',       'https://vitejs.dev/config/shared-options.html'),
        ('build-options',        'https://vitejs.dev/config/build-options.html'),
        ('server-options',       'https://vitejs.dev/config/server-options.html'),
        ('backend-integration',  'https://vitejs.dev/guide/backend-integration.html'),
        ('ssr',                  'https://vitejs.dev/guide/ssr.html'),
    ],
    'fastapi': [
        ('intro',                'https://fastapi.tiangolo.com/'),
        ('first-steps',          'https://fastapi.tiangolo.com/tutorial/first-steps/'),
        ('path-params',          'https://fastapi.tiangolo.com/tutorial/path-params/'),
        ('query-params',         'https://fastapi.tiangolo.com/tutorial/query-params/'),
        ('request-body',         'https://fastapi.tiangolo.com/tutorial/body/'),
        ('response-model',       'https://fastapi.tiangolo.com/tutorial/response-model/'),
        ('dependencies',         'https://fastapi.tiangolo.com/tutorial/dependencies/'),
        ('security',             'https://fastapi.tiangolo.com/tutorial/security/'),
        ('middleware',           'https://fastapi.tiangolo.com/tutorial/middleware/'),
        ('cors',                 'https://fastapi.tiangolo.com/tutorial/cors/'),
        ('background-tasks',     'https://fastapi.tiangolo.com/tutorial/background-tasks/'),
        ('websockets',           'https://fastapi.tiangolo.com/advanced/websockets/'),
        ('streaming-response',   'https://fastapi.tiangolo.com/advanced/custom-response/'),
        ('testing',              'https://fastapi.tiangolo.com/tutorial/testing/'),
    ],
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 portfolio-rag/1.0',
    'Accept': 'text/html,application/xhtml+xml',
}


def _text_of(elem: Tag) -> str:
    return elem.get_text(' ', strip=True)


def extract_content(html: str) -> str:
    soup = BeautifulSoup(html, 'html.parser')

    # Remove noisy structural elements
    for tag in soup.find_all(['nav', 'footer', 'script', 'style', 'aside',
                               'header', 'noscript', 'svg', 'button']):
        tag.decompose()

    # Try main content containers in preference order
    main = (
        soup.find('article') or
        soup.find('main') or
        soup.find(id='content') or
        soup.find(class_=re.compile(r'\bcontent\b|\barticle\b', re.I)) or
        soup.body
    )
    if not main:
        return ''

    lines: List[str] = []
    seen: Set[str] = set()

    for elem in main.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'pre', 'code', 'td', 'th']):
        text = _text_of(elem)
        if not text or text in seen:
            continue
        seen.add(text)

        tag = elem.name
        if tag == 'h1':
            lines.append(f'\n# {text}\n')
        elif tag == 'h2':
            lines.append(f'\n## {text}\n')
        elif tag == 'h3':
            lines.append(f'\n### {text}\n')
        elif tag == 'h4':
            lines.append(f'\n#### {text}\n')
        elif tag == 'pre':
            lines.append(f'\n```\n{text}\n```\n')
        elif tag in ('p', 'li', 'td', 'th'):
            lines.append(text)

    content = '\n'.join(lines)
    content = re.sub(r'\n{3,}', '\n\n', content)
    return content.strip()


def fetch_doc(name: str, url: str) -> Optional[str]:
    try:
        resp = httpx.get(url, headers=HEADERS, timeout=20, follow_redirects=True)
        if resp.status_code != 200:
            print(f'  [skip] {name}: HTTP {resp.status_code}')
            return None
        return extract_content(resp.text)
    except Exception as e:
        print(f'  [error] {name}: {e}')
        return None


def main():
    for source, pages in DOCS_TO_FETCH.items():
        out_dir = os.path.join(DOCS_DIR, source)
        os.makedirs(out_dir, exist_ok=True)
        print(f'\n── {source.upper()} {"─" * 50}')
        for name, url in pages:
            out_path = os.path.join(out_dir, f'{name}.md')
            if os.path.exists(out_path):
                size = os.path.getsize(out_path)
                if size > 500:
                    print(f'  [cached] {name}  ({size:,} bytes)')
                    continue
            print(f'  Fetching {name}...', end=' ', flush=True)
            content = fetch_doc(name, url)
            if content and len(content) > 300:
                with open(out_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'{len(content):,} chars')
            else:
                print('too short — skipping')
            time.sleep(0.6)

    print('\nAll done. Run build_rag_index.py next.')


if __name__ == '__main__':
    main()
