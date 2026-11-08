# Freedom CQA: модель и адаптеры

Базовая Qwen3.5-9B, без fine-tuning и QLoRA. Главная инструкция и статус: [MODEL_INTEGRATION.md](../MODEL_INTEGRATION.md).

## Реальные точки входа

- CUDA: установить подходящий PyTorch и `requirements-gpu.txt`, затем из этой папки `python service.py --port 9000`. Worker проверяет локальный NF4 checkpoint либо загружает базовую модель.
- Mac: из корня `./start_model_mac.command`. Это отдельная Qwen GGUF + BM25 через Ollama, не CUDA v43.1.
- Контракт обоих сервисов: `POST /evaluate` с conversation/checklist; доступность: `GET /health`.
- Импорт результатов: `python import_freedom_results.py --project /path/to/Freedom --results results/results.json`; по умолчанию проверка без записи. `--apply` сохраняет с архивом предыдущих результатов и защитой пересмотренных оценок.

## Файлы

`worker.py`, `cqa_runtime.py` - CUDA-пайплайн Qwen NF4 с E5/BM25/BGE RAG. `cqa_engine.py` - расчёт и проверка значений. `attention_t4.py` - SDPA для T4. `checkpoint.py` - проверка файлов весов. `service.py` - HTTP-адаптер. `ollama_service.py` - отдельная Mac-ветка. `refresh_communication.py` - частичный пересмотр критериев с сохранением остальных из baseline. `audio.py` - необязательный Voxtral ASR.

`assets/` содержит 530 FAQ-фрагментов и E5-эмбеддинги. `release_manifest.json` связывает код с весами. Большие веса и локальные inference_audits исключены из Git.

## Как понимать текущие результаты

В `results/` находятся 65 результатов: коммуникационные изменения 43.1 поверх остальных оценок v42. `summary.json` и `manifest.json` показывают, что именно пересчитано. Ноль ошибок исполнения не означает идеальную точность. `partial_regression_report.json` использует частичные метки, составленные агентом, а не официальный или человеческий Ground Truth. `production_smoke.json` - один проверочный запрос, не полный регрессионный прогон. Voxtral-пилот включает IVR и не доказывает улучшение оценки оператора.

Проверки приложения: из корня `.venv/bin/python -m unittest discover -s tests -v`. Проверки чистых правил не загружают CUDA и не измеряют качество извлечения фактов моделью. Подробный сценарий защиты находится в `../docs/`.

## Новый основной Mac-адаптер 43.1

`ollama431_service.py` запускается из корня через `./start_model_mac431.command` на порту 9001. Он использует общий runtime 43.1 и E5/BM25/BGE, заменяя генерацию NF4 на Ollama GGUF/Metal. E5 и BGE работают на CPU. Упрощённый старый `ollama_service.py` на 9000 остаётся отдельной веткой. Настройки приложения должны указывать на нужный сервис.
