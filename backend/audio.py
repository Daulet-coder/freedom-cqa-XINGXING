"""Resolve organizer audio-player pages without executing their HTML or scripts."""
from html.parser import HTMLParser
from urllib.parse import urlsplit, urljoin
from urllib.request import urlopen

class AudioSources(HTMLParser):
    def __init__(self): super().__init__(); self.sources=[]
    def handle_starttag(self,tag,attrs):
        if tag in ('audio','source'):
            src=dict(attrs).get('src')
            if src: self.sources.append(src)

def resolve_source(url, trusted_pages):
    if not isinstance(url,str) or urlsplit(url).scheme not in ('http','https'):
        raise ValueError('Нет доступного URL аудиозаписи')
    # Only the explicitly supplied DEV pages are fetched server-side.
    # Other imported sources are played directly by the browser.
    if url not in trusted_pages: return url
    with urlopen(url,timeout=25) as response:
        if 'audio/' in response.headers.get('Content-Type',''): return url
        page=response.read(65536).decode('utf-8')
    parser=AudioSources(); parser.feed(page)
    if not parser.sources: raise ValueError('На странице источника не найдена аудиозапись')
    direct=urljoin(url,parser.sources[0])
    if urlsplit(direct).scheme not in ('http','https'): raise ValueError('Неверный формат аудиоссылки')
    return direct
