# Локальные веса

Большие веса хранятся локально и исключены из Git. Исходники загрузчиков, проверка SHA-256 и манифест экспорта включены в репозиторий.

- `qwen3.5-9b-nf4/`: экспорт базовой Qwen3.5-9B NF4 из Kaggle, 4 safetensors shards и tokenizer; требуется CUDA. Это не fine-tuning. Сверить можно через `model_service/checkpoint.py`.
- `ollama/`: GGUF и manifests Ollama. Загружаются командой `./start_model_mac.command`; это отдельная квантизация базовой модели, с отдельным BM25-поиском FAQ.

Артефакт Kaggle: https://www.kaggle.com/code/dauletsabdenov/notebook2e13d18e93?scriptVersionId=366687792

Положите распакованный экспорт в `models/qwen3.5-9b-nf4` (доступ к приватному Kaggle нужен владельцу), затем:

```bash
python -c "from model_service.checkpoint import verify_weights; print(verify_weights('models/qwen3.5-9b-nf4')['base_model'])"
```

Не копируйте каталог Ollama поверх NF4: форматы не взаимозаменяемы.
