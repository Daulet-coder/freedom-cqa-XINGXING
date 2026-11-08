"""Optional local Voxtral transcription. It never overwrites official transcripts or scores."""
from pathlib import Path
import hashlib
import math

MODEL_ID = 'mistralai/Voxtral-Mini-4B-Realtime-2602'


class VoxtralTranscriber:
    def __init__(self, device='cuda:1', model_id=MODEL_ID):
        import torch
        from transformers import VoxtralRealtimeForConditionalGeneration
        from transformers.tokenization_mistral_common import MistralCommonBackend
        from transformers.models.voxtral_realtime.processing_voxtral_realtime import VoxtralRealtimeProcessor
        from transformers.models.voxtral_realtime.feature_extraction_voxtral_realtime import VoxtralRealtimeFeatureExtractor
        # Explicit backend: AutoProcessor in the tested environment selected an incompatible tokenizer.
        self.processor = VoxtralRealtimeProcessor(
            feature_extractor=VoxtralRealtimeFeatureExtractor.from_pretrained(model_id),
            tokenizer=MistralCommonBackend.from_pretrained(model_id))
        self.model = VoxtralRealtimeForConditionalGeneration.from_pretrained(
            model_id, device_map={'': device}, dtype=torch.float16, attn_implementation='sdpa')
        self.model.eval()
        self.device = device
        self.model_id = model_id

    def transcribe(self, local_audio_path, language='RU', start_seconds=0, duration_seconds=30):
        # Restrict this project's verified language scope; KZ needs its own evaluation.
        if language not in {'RU', 'EN'}:
            return {'status': 'unsupported_language', 'language': language,
                    'affects_score': False, 'review_required': True}
        if start_seconds < 0 or not 0 < duration_seconds <= 60:
            raise ValueError('Use a nonnegative start and a 1–60 second review window')
        import numpy as np
        import soundfile as sf
        import torch
        from scipy.signal import resample_poly
        path = Path(local_audio_path)
        if not path.is_file():
            raise FileNotFoundError(path)
        with sf.SoundFile(path) as audio_file:
            rate = audio_file.samplerate
            audio_file.seek(min(int(start_seconds * rate), len(audio_file)))
            samples = audio_file.read(int(duration_seconds * rate), dtype='float32', always_2d=True)
        if not len(samples):
            raise ValueError('Empty audio window')
        audio = samples.mean(axis=1)
        if rate != 16000:
            divisor = math.gcd(rate, 16000)
            audio = resample_poly(audio, 16000 // divisor, rate // divisor).astype(np.float32)
        inputs = self.processor(audio, return_tensors='pt')
        inputs = inputs.to(self.device, dtype=self.model.dtype)
        with torch.inference_mode():
            outputs = self.model.generate(**inputs, do_sample=False)
        text = self.processor.batch_decode(outputs, skip_special_tokens=True)[0]
        hasher = hashlib.sha256()
        with path.open('rb') as source:
            for block in iter(lambda: source.read(1024 * 1024), b''):
                hasher.update(block)
        return {'status': 'ok', 'model': self.model_id, 'language': language, 'text': text,
                'start_seconds': start_seconds, 'duration_seconds': len(audio) / 16000,
                'sample_rate': 16000, 'audio_sha256': hasher.hexdigest(),
                'affects_score': False, 'review_required': True,
                'role_alignment': 'not assigned; original transcript turn numbering is retained',
                'scope': 'ASR comparison only; no inferred emotion or automatic diction score'}
