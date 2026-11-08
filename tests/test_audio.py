import unittest
from unittest.mock import patch
from io import BytesIO
from backend.audio import resolve_source, AudioSources

class AudioTests(unittest.TestCase):
    def test_only_audio_source_extracted(self):
        p=AudioSources();p.feed('<script>malicious()</script><audio><source src="https://media.example/clip.mp3?a=1&amp;b=2"></audio>')
        self.assertEqual(p.sources,['https://media.example/clip.mp3?a=1&b=2'])
    def test_imported_url_not_fetched_by_server(self):
        with patch('backend.audio.urlopen') as opener:
            self.assertEqual(resolve_source('https://example.test/audio.mp3',set()),'https://example.test/audio.mp3')
            opener.assert_not_called()
    def test_organizer_wrapper_resolved(self):
        page=BytesIO(b'<audio><source src="https://media.test/clip.mp3"></audio>');page.headers={'Content-Type':'text/html'}
        with patch('backend.audio.urlopen',return_value=page):
            self.assertEqual(resolve_source('https://organizer.test/player',{'https://organizer.test/player'}),'https://media.test/clip.mp3')
    def test_unsafe_protocol_rejected(self):
        with self.assertRaises(ValueError):resolve_source('file:///etc/passwd',set())
    def test_missing_source_is_error(self):
        page=BytesIO(b'<html>No audio</html>');page.headers={'Content-Type':'text/html'}
        with patch('backend.audio.urlopen',return_value=page):
            with self.assertRaises(ValueError):resolve_source('https://organizer.test/player',{'https://organizer.test/player'})
