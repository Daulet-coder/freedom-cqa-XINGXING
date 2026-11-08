function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState,
  useEffect,
  useRef
} = React;
const paths = {
  home: 'M3 10 12 3l9 7 M5 9v12h5v-7h4v7h5V9',
  headphones: 'M4 14v-3a8 8 0 0 1 16 0v3 M4 13H2v7h5v-7H4Z M20 13h2v7h-5v-7h3Z',
  layers: 'm12 3 10 5-10 5L2 8l10-5Z M2 12l10 5 10-5 M2 16l10 5 10-5',
  chat: 'M4 5h16v11H9l-5 4V5Z',
  check: 'M9 12l2 2 5-5 M4 4h16v16H4Z',
  appeal: 'M12 3v17 M7 20h10 M4 7h16 M5 7l-3 7h6L5 7Z M19 7l-3 7h6l-3-7Z',
  chart: 'M5 19v-5 M12 19V9 M19 19V4',
  arrow: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  search: 'M20 20l-5-5 M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  plus: 'M12 5v14 M5 12h14',
  upload: 'M12 16V3 M7 8l5-5 5 5 M4 15v6h16v-6',
  download: 'M12 3v13 M7 11l5 5 5-5 M4 18v3h16v-3',
  back: 'm14 6-6 6 6 6',
  close: 'm6 6 12 12 M6 18 18 6',
  info: 'M12 11v6 M12 7v.1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  file: 'M14 2H5v20h14V7l-5-5Z M14 2v6h5 M8 12h8 M8 16h8',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-7l1-7',
  settings: 'M4 7h16 M4 17h16 M8 4v6 M16 14v6',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Z M8 12l3 3 5-6'
};
function Icon({
  name,
  size = 20,
  ...rest
}) {
  return React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.65",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, rest), React.createElement("path", {
    d: paths[name] || paths.file
  }));
}
async function api(path, method = 'GET', body) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      ...(body !== undefined ? {
        body: JSON.stringify(body)
      } : {})
    });
  } catch {
    throw Error('Сервер приложения недоступен. Запустите ./start.command и обновите страницу.');
  }
  let data;
  try {
    data = await res.json();
  } catch {
    throw Error('Сервер вернул некорректный ответ');
  }
  if (!res.ok) {
    const d = data.detail;
    throw Error(typeof d === 'string' ? d : d?.issues ? d.message + ': ' + d.issues.join('; ') : 'Проверьте данные запроса');
  }
  return data;
}
const fmt = n => n == null ? '—' : n.toLocaleString('ru-RU', {
  maximumFractionDigits: 2
});
const valueText = v => v === null ? 'N/A' : v === true ? 'Да' : v === false ? 'Нет' : v;
const names = {
  client: 'Клиент',
  operator: 'Оператор',
  bot: 'AI-ассистент',
  system: 'Система'
};
function timeLabel(s) {
  if (!s) return '00:00';
  if (s.includes('T')) return new Date(s).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return s;
}
function elapsed(r, m) {
  if (!m) return 0;
  let t = m.timestamp;
  if (t.includes('T')) return Math.max(0, (Date.parse(t) - Date.parse(r.transcript[0].timestamp)) / 1000);
  return t.split(':').reduce((a, b) => a * 60 + Number(b), 0) || 0;
}
function Tag({
  children,
  tone = ''
}) {
  return React.createElement("span", {
    className: 'tag ' + tone
  }, children);
}
function Modal({
  title,
  sub,
  close,
  children
}) {
  return React.createElement("div", {
    className: "modal-shade",
    onMouseDown: e => e.target === e.currentTarget && close()
  }, React.createElement("section", {
    className: "modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title
  }, React.createElement("button", {
    className: "icon-btn modal-close",
    onClick: close,
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C"
  }, React.createElement(Icon, {
    name: "close"
  })), React.createElement("h2", null, title), sub && React.createElement("p", {
    className: "muted"
  }, sub), children));
}
function Score({
  score,
  small = false
}) {
  const n = score ?? 0;
  return React.createElement("div", {
    className: 'score ' + (small ? 'small' : ''),
    style: {
      '--pct': n + '%',
      '--score-color': n < 60 ? '#ca7549' : '#62ad36'
    }
  }, React.createElement("div", null, React.createElement("strong", null, fmt(score)), React.createElement("span", null, "/ 100")));
}
function mediaClock(value) {
  const s = Math.max(0, Math.floor(Number(value) || 0));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
function AudioPanel({
  record,
  audioRef,
  activeTurn,
  onTurn
}) {
  const [local, setLocal] = useState(null),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [playing, setPlaying] = useState(false),
    [rate, setRate] = useState(1),
    [mediaError, setMediaError] = useState(''),
    [loaded, setLoaded] = useState(false),
    [peaks, setPeaks] = useState(null),
    [remoteSource, setRemoteSource] = useState(null),
    [resolving, setResolving] = useState(!!record.audio_url);
  const picker = useRef(null),
    objectUrl = useRef(null),
    decodeVersion = useRef(0);
  const source = local?.url || remoteSource || null;
  useEffect(() => {
    if (!record.audio_url) return;
    const controller = new AbortController();
    fetch('/api/conversations/' + encodeURIComponent(record.conversation_id) + '/audio-source', {
      signal: controller.signal
    }).then(async r => {
      const data = await r.json();
      if (!r.ok) throw Error(data.detail);
      setRemoteSource(data.url);
    }).catch(e => {
      if (e.name !== 'AbortError') setMediaError(e.message);
    }).finally(() => setResolving(false));
    return () => controller.abort();
  }, [record.conversation_id]);
  const timelineDuration = Math.max(1, elapsed(record, record.transcript[record.transcript.length - 1]));
  const length = duration || timelineDuration;
  const selectedStart = elapsed(record, record.transcript[activeTurn]);
  const selectedEnd = activeTurn < record.transcript.length - 1 ? elapsed(record, record.transcript[activeTurn + 1]) : length;
  useEffect(() => () => {
    decodeVersion.current++;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);
  useEffect(() => {
    if (!source) setPosition(selectedStart);
  }, [activeTurn, source]);
  async function attach(event) {
    const f = event.target.files?.[0];
    if (!f) return;
    const generation = ++decodeVersion.current;
    if (f.size > 150 * 1024 * 1024) {
      setMediaError('Выберите аудиофайл размером до 150 МБ.');
      return;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(f);
    objectUrl.current = url;
    setLocal({
      url,
      name: f.name
    });
    setPosition(0);
    setDuration(0);
    setPlaying(false);
    setLoaded(false);
    setMediaError('');
    setPeaks(null);
    onTurn(0);
    let context;
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      const buffer = await context.decodeAudioData(await f.arrayBuffer());
      const samples = buffer.getChannelData(0),
        n = 280,
        stride = Math.max(1, Math.floor(samples.length / n));
      const values = Array.from({
        length: n
      }, (_, i) => {
        let top = 0;
        for (let j = i * stride; j < Math.min(samples.length, (i + 1) * stride); j += Math.max(1, Math.floor(stride / 100))) top = Math.max(top, Math.abs(samples[j]));
        return top;
      });
      if (generation === decodeVersion.current) setPeaks(values);
    } catch {} finally {
      context?.close().catch(() => {});
    }
  }
  function seek(time) {
    const next = Math.min(length, Math.max(0, time));
    setPosition(next);
    if (audioRef.current && source) audioRef.current.currentTime = next;
    let turn = 0;
    record.transcript.forEach((m, i) => {
      if (elapsed(record, m) <= next) turn = i;
    });
    onTurn(turn);
  }
  async function toggle() {
    const a = audioRef.current;
    if (!a || !source) return;
    if (playing) {
      a.pause();
      return;
    }
    try {
      setMediaError('');
      await a.play();
    } catch {
      setMediaError('Не удалось воспроизвести запись. Можно прикрепить аудиофайл с компьютера.');
    }
  }
  function updateTime() {
    const a = audioRef.current;
    if (!a) return;
    setPosition(a.currentTime);
    let i = 0;
    record.transcript.forEach((m, j) => {
      if (elapsed(record, m) <= a.currentTime) i = j;
    });
    onTurn(i);
  }
  const visualCursor = Math.max(0, Math.min(100, 100 * (source ? position : selectedStart) / length));
  const selectionLeft = Math.max(0, Math.min(100, 100 * selectedStart / length));
  const fragmentWidth = Math.max(0, Math.min(100 - selectionLeft, 100 * Math.max(1, selectedEnd - selectedStart) / length));
  function bars(role) {
    return Array.from({
      length: 190
    }, (_, i) => {
      const at = i / 190 * length;
      let turn = -1;
      record.transcript.forEach((m, j) => {
        if (elapsed(record, m) <= at) turn = j;
      });
      const message = record.transcript[turn];
      const speaking = message?.speaker === role;
      const amplitude = peaks ? peaks[Math.min(peaks.length - 1, Math.floor(i / 190 * peaks.length))] : Math.abs(Math.sin(i * 1.91) * Math.cos(i * .29));
      const height = speaking ? Math.round(5 + amplitude * 31) : 2;
      return React.createElement("rect", {
        key: i,
        x: i * 4.5 + 1,
        y: 25 - height / 2,
        width: "2.3",
        height: height,
        rx: "1.15",
        opacity: speaking ? 1 : .22
      });
    });
  }
  return React.createElement("section", {
    className: "card audio-panel",
    "aria-label": "\u0410\u0443\u0434\u0438\u043E\u0437\u0430\u043F\u0438\u0441\u044C \u0438 \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u043F\u043E \u0434\u0438\u0430\u043B\u043E\u0433\u0443"
  }, React.createElement("div", {
    className: "audio-panel-heading"
  }, React.createElement("div", {
    className: "audio-title"
  }, React.createElement("span", {
    className: "audio-icon"
  }, React.createElement(Icon, {
    name: "chart",
    size: 18
  })), React.createElement("h3", null, source || record.audio_url ? 'Запись разговора' : 'Аудио и хронология', React.createElement("span", null, local ? local.name : record.channel === 'voice call' ? 'Клиентская поддержка · ' + record.language : 'Карта реплик · ' + record.language))), React.createElement("div", {
    className: "audio-heading-actions"
  }, React.createElement("span", {
    className: "audio-format"
  }, peaks ? 'Амплитуда аудио + роли из транскрипта' : 'Активность по таймкодам'), React.createElement("button", {
    className: "attach-audio",
    onClick: () => picker.current.click()
  }, React.createElement(Icon, {
    name: "upload",
    size: 14
  }), local ? 'Заменить аудио' : 'Прикрепить аудио'), React.createElement("input", {
    ref: picker,
    type: "file",
    accept: "audio/*,.wav,.mp3,.m4a,.ogg,.webm,.flac",
    hidden: true,
    onChange: attach
  }))), React.createElement("div", {
    className: "waveform-layout"
  }, React.createElement("div", {
    className: "wave-labels"
  }, React.createElement("span", null, React.createElement("i", {
    className: "dot client"
  }), "\u041A\u043B\u0438\u0435\u043D\u0442"), React.createElement("span", null, React.createElement("i", {
    className: "dot operator"
  }), "\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440")), React.createElement("div", {
    className: "waveform-tracks",
    role: "slider",
    tabIndex: 0,
    "aria-label": "\u041D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u044F \u043F\u043E \u0437\u0430\u043F\u0438\u0441\u0438",
    "aria-valuemin": 0,
    "aria-valuemax": Math.floor(length),
    "aria-valuenow": Math.floor(position),
    onKeyDown: e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(position + (e.key === 'ArrowRight' ? 5 : -5));
      }
    },
    onClick: e => {
      const bounds = e.currentTarget.getBoundingClientRect();
      seek((e.clientX - bounds.left) / bounds.width * length);
    }
  }, React.createElement("div", {
    className: "wave-selection",
    style: {
      left: selectionLeft + '%',
      width: fragmentWidth + '%'
    }
  }), React.createElement("svg", {
    viewBox: "0 0 855 50",
    preserveAspectRatio: "none",
    className: "wave-client",
    "aria-hidden": "true"
  }, bars('client')), React.createElement("svg", {
    viewBox: "0 0 855 50",
    preserveAspectRatio: "none",
    className: "wave-operator",
    "aria-hidden": "true"
  }, bars('operator')), React.createElement("span", {
    className: "wave-cursor",
    style: {
      left: visualCursor + '%'
    }
  }))), React.createElement("div", {
    className: "audio-controls"
  }, React.createElement("button", {
    className: "play-audio",
    disabled: !source,
    onClick: toggle,
    "aria-label": playing ? 'Пауза' : 'Воспроизвести запись',
    title: !source ? 'Прикрепите аудио или откройте звонок' : playing ? 'Пауза' : 'Воспроизвести'
  }, playing ? React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 20 20"
  }, React.createElement("path", {
    d: "M6 4v12M14 4v12",
    stroke: "currentColor",
    strokeWidth: "4"
  })) : React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 20 20"
  }, React.createElement("path", {
    d: "m6 3 11 7-11 7V3Z",
    fill: "currentColor"
  }))), React.createElement("div", {
    className: "audio-time"
  }, React.createElement("strong", null, mediaClock(position)), React.createElement("span", null, "/ ", mediaClock(length))), React.createElement("input", {
    className: "audio-seek",
    type: "range",
    "aria-label": "\u041F\u043E\u0437\u0438\u0446\u0438\u044F \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F",
    min: "0",
    max: length,
    step: "0.1",
    value: Math.min(position, length),
    onChange: e => seek(Number(e.target.value)),
    style: {
      '--progress': position / length * 100 + '%'
    }
  }), React.createElement("select", {
    className: "audio-speed",
    value: rate,
    "aria-label": "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0434\u0435\u043D\u0438\u044F",
    onChange: e => {
      const next = Number(e.target.value);
      setRate(next);
      if (audioRef.current) audioRef.current.playbackRate = next;
    }
  }, [.75, 1, 1.25, 1.5, 2].map(x => React.createElement("option", {
    key: x,
    value: x
  }, x, "\xD7"))), React.createElement("span", {
    className: "audio-ready"
  }, React.createElement("i", null), source ? loaded ? 'Аудио готово' : 'Источник подключён' : resolving ? 'Загружаем запись…' : 'Без аудиофайла')), source && React.createElement("audio", {
    key: source,
    ref: audioRef,
    src: source,
    preload: "metadata",
    onLoadedMetadata: () => {
      const d = audioRef.current?.duration;
      if (Number.isFinite(d)) {
        setDuration(d);
        setLoaded(true);
        if (position > 0 && audioRef.current) audioRef.current.currentTime = Math.min(position, d);
      }
      if (audioRef.current) audioRef.current.playbackRate = rate;
    },
    onTimeUpdate: updateTime,
    onSeeked: updateTime,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onEnded: () => setPlaying(false),
    onError: () => {
      setLoaded(false);
      setPlaying(false);
      setMediaError('Источник записи недоступен. Прикрепите локальный аудиофайл.');
    }
  }), mediaError && React.createElement("div", {
    className: "audio-error",
    role: "alert"
  }, React.createElement(Icon, {
    name: "info",
    size: 13
  }), mediaError));
}
function Overview({
  records,
  appeals,
  checklist,
  onOpen,
  onNavigate,
  onImport,
  onCritical,
  onUnrated
}) {
  const data = records.filter(r => r.dataset === 'DEV' || r.dataset === 'PROD'),
    rated = data.filter(r => r.evaluation?.status === 'ok'),
    pending = appeals.filter(a => a.status === 'pending');
  const flags = rated.filter(r => r.evaluation.score.critical_flag),
    scored = rated.filter(r => r.evaluation.score.final_score !== null),
    average = scored.length ? scored.reduce((s, r) => s + r.evaluation.score.final_score, 0) / scored.length : null;
  const percent = data.length ? Math.round(rated.length / data.length * 100) : 0,
    voice = data.filter(r => r.channel === 'voice call').length;
  const groups = [{
    label: 'Высокий балл',
    range: '80–100',
    tone: 'green',
    count: scored.filter(r => r.evaluation.score.final_score >= 80).length
  }, {
    label: 'Есть замечания',
    range: '60–79,99',
    tone: 'amber',
    count: scored.filter(r => r.evaluation.score.final_score >= 60 && r.evaluation.score.final_score < 80).length
  }, {
    label: 'Требует проверки',
    range: '0–59,99',
    tone: 'red',
    count: scored.filter(r => r.evaluation.score.final_score < 60).length
  }];
  const languages = [['RU', 'Русский', '#0d9161'], ['KZ', 'Қазақша', '#97cf65'], ['EN', 'English', '#d6e7ce']];
  const recent = [...records].filter(r => r.evaluation).sort((a, b) => b.evaluation.evaluated_at.localeCompare(a.evaluation.evaluated_at)).slice(0, 4);
  const ru = data.filter(r => r.language === 'RU').length / Math.max(1, data.length) * 100,
    kz = data.filter(r => r.language === 'KZ').length / Math.max(1, data.length) * 100;
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading overview-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, React.createElement("i", null), "CONVERSATION QUALITY ANALYTICS"), React.createElement("h1", null, "\u041E\u0431\u0437\u043E\u0440 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430"), React.createElement("p", {
    className: "subtitle"
  }, "\u0412\u0441\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0438, \u043E\u0446\u0435\u043D\u043A\u0438 \u0438 \u0440\u0435\u0448\u0435\u043D\u0438\u044F. \u041E\u0434\u043D\u043E \u0440\u0430\u0431\u043E\u0447\u0435\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E.")), React.createElement("button", {
    className: "btn primary",
    onClick: onImport
  }, React.createElement(Icon, {
    name: "plus",
    size: 17
  }), "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433\u0438")), React.createElement("section", {
    className: "work-queue",
    "aria-label": "\u0411\u044B\u0441\u0442\u0440\u044B\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F"
  }, React.createElement("div", {
    className: "queue-heading"
  }, React.createElement("div", null, React.createElement("span", {
    className: "queue-eyebrow"
  }, "\u0420\u0410\u0411\u041E\u0427\u0415\u0415 \u041F\u0420\u041E\u0421\u0422\u0420\u0410\u041D\u0421\u0422\u0412\u041E"), React.createElement("h2", null, "\u0427\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u043C \u0441\u0435\u0433\u043E\u0434\u043D\u044F?"), React.createElement("p", null, rated.length, " \u0438\u0437 ", data.length, " \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432 \u043E\u0446\u0435\u043D\u0435\u043D\u043E. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u0438\u043B\u0438 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043E\u0446\u0435\u043D\u043A\u0438.")), React.createElement("span", {
    className: "queue-check"
  }, React.createElement(Icon, {
    name: "check",
    size: 27
  }))), React.createElement("div", {
    className: "queue-actions"
  }, React.createElement("button", {
    onClick: onUnrated
  }, React.createElement("span", {
    className: "queue-action-icon"
  }, React.createElement(Icon, {
    name: "chat",
    size: 21
  })), React.createElement("span", null, React.createElement("strong", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433\u0438"), React.createElement("small", null, data.filter(r => !r.evaluation).length, " \u0431\u0435\u0437 \u043E\u0446\u0435\u043D\u043A\u0438")), React.createElement(Icon, {
    name: "arrow",
    size: 17
  })), React.createElement("button", {
    onClick: () => onNavigate('checklist')
  }, React.createElement("span", {
    className: "queue-action-icon"
  }, React.createElement(Icon, {
    name: "check",
    size: 21
  })), React.createElement("span", null, React.createElement("strong", null, "\u041D\u0430\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u0447\u0435\u043A-\u043B\u0438\u0441\u0442"), React.createElement("small", null, checklist?.criteria.length || 0, " \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0435\u0432 \xB7 \u0432\u0435\u0440\u0441\u0438\u044F ", checklist?.version || 1)), React.createElement(Icon, {
    name: "arrow",
    size: 17
  })), React.createElement("button", {
    onClick: () => onNavigate('appeals')
  }, React.createElement("span", {
    className: "queue-action-icon"
  }, React.createElement(Icon, {
    name: "appeal",
    size: 21
  })), React.createElement("span", null, React.createElement("strong", null, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0430\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438"), React.createElement("small", null, pending.length, " \u043D\u0430 \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0438")), React.createElement(Icon, {
    name: "arrow",
    size: 17
  })))), React.createElement("div", {
    className: "overview-stats"
  }, React.createElement(Metric, {
    label: "\u0414\u0438\u0430\u043B\u043E\u0433\u043E\u0432 \u0432 \u043D\u0430\u0431\u043E\u0440\u0435",
    value: data.length,
    icon: "chat",
    detail: `${data.length - voice} чатов · ${voice} звонков`
  }), React.createElement(Metric, {
    label: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u043E\u0446\u0435\u043D\u043A\u0430",
    value: fmt(average),
    icon: "chart",
    detail: rated.length ? rated.some(r => r.evaluation.mode === 'demo') ? 'Включает демо-оценки' : 'По сохранённым оценкам' : 'Появится после первой оценки',
    suffix: average !== null ? '/ 100' : ''
  }), React.createElement(Metric, {
    label: "\u041E\u0445\u0432\u0430\u0442 \u043E\u0446\u0435\u043D\u043A\u0438",
    value: percent + '%',
    icon: "check",
    detail: `${rated.length} из ${data.length} диалогов оценено`,
    progress: percent
  }), React.createElement(Metric, {
    label: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0430\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438",
    value: pending.length,
    icon: "appeal",
    detail: pending.length ? 'Ожидают решения проверяющего' : 'Все обращения рассмотрены'
  })), React.createElement("div", {
    className: "overview-content"
  }, React.createElement("section", {
    className: "card recent-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("div", null, React.createElement("h2", null, "\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0435 \u043E\u0446\u0435\u043D\u043A\u0438"), React.createElement("p", null, "\u041E\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430 \u2014 \u043A \u0438\u0441\u0445\u043E\u0434\u043D\u043E\u043C\u0443 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0443")), React.createElement("button", {
    className: "subtle-link",
    onClick: () => onNavigate('dialogs')
  }, "\u0412\u0441\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0438 ", React.createElement(Icon, {
    name: "arrow",
    size: 14
  }))), React.createElement("div", {
    className: "recent-head"
  }, React.createElement("span", null, "\u0414\u0418\u0410\u041B\u041E\u0413"), React.createElement("span", null, "\u041E\u0426\u0415\u041D\u041A\u0410"), React.createElement("span", null, "\u0421\u0422\u0410\u0422\u0423\u0421"), React.createElement("span", null)), recent.length ? recent.map(r => React.createElement("button", {
    className: "recent-row",
    key: r.conversation_id,
    onClick: () => onOpen(r)
  }, React.createElement("span", {
    className: 'recent-icon ' + (r.audio_url ? 'call' : '')
  }, React.createElement(Icon, {
    name: r.audio_url ? 'headphones' : 'chat',
    size: 19
  })), React.createElement("span", {
    className: "recent-description"
  }, React.createElement("strong", null, r.conversation_id), React.createElement("small", null, r.audio_url ? 'Звонок' : 'Чат', React.createElement("span", null, "\xB7"), r.language, React.createElement("span", null, "\xB7"), r.demo ? 'Демо-пример' : r.evaluation.mode === 'demo' ? 'Демо-оценка' : 'Оценка модели')), React.createElement("span", {
    className: "mini-score"
  }, fmt(r.evaluation.score?.final_score), React.createElement("small", null, "/100")), React.createElement(Tag, {
    tone: r.evaluation.status === 'error' ? 'red' : r.evaluation.score?.critical_flag ? 'amber' : 'green'
  }, r.evaluation.status === 'error' ? 'Ошибка' : r.evaluation.score?.critical_flag ? 'Проверить' : 'Оценено'), React.createElement(Icon, {
    name: "arrow",
    size: 15
  }))) : React.createElement("div", {
    className: "empty-state"
  }, React.createElement(Icon, {
    name: "check",
    size: 30
  }), React.createElement("h3", null, "\u0417\u0434\u0435\u0441\u044C \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B"), React.createElement("p", null, "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0434\u0438\u0430\u043B\u043E\u0433 \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u043E\u0446\u0435\u043D\u043A\u0443.")), React.createElement("div", {
    className: "panel-footnote"
  }, React.createElement("span", {
    className: "live-dot"
  }), "\u041E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u044F \u0438 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0430")), React.createElement("section", {
    className: "card composition-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("div", null, React.createElement("h2", null, "\u0412\u0430\u0448\u0438 \u0434\u0430\u043D\u043D\u044B\u0435"), React.createElement("p", null, "\u0421\u043E\u0441\u0442\u0430\u0432 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043D\u044B\u0445 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432")), React.createElement(Icon, {
    name: "layers",
    size: 18
  })), React.createElement("div", {
    className: "composition-body"
  }, React.createElement("div", {
    className: "language-donut",
    role: "img",
    "aria-label": 'Диалогов ' + data.length + '. ' + languages.map(([l]) => l + ': ' + data.filter(r => r.language === l).length).join(', '),
    style: {
      background: `conic-gradient(#0d9161 0% ${ru}%,#97cf65 ${ru}% ${ru + kz}%,#d6e7ce ${ru + kz}% 100%)`
    }
  }, React.createElement("div", null, React.createElement("strong", null, data.length), React.createElement("span", null, "\u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432"))), React.createElement("div", {
    className: "language-legend"
  }, languages.map(([id, label, color]) => React.createElement("div", {
    key: id
  }, React.createElement("i", {
    style: {
      background: color
    }
  }), React.createElement("span", null, label), React.createElement("strong", null, data.filter(r => r.language === id).length))))), React.createElement("div", {
    className: "dataset-foot"
  }, React.createElement(Tag, null, "DEV / PROD"), React.createElement("span", null, "\u0422\u0435\u0441\u0442\u044B CUSTOM \u0438 \u043F\u0440\u0438\u043C\u0435\u0440\u044B DEMO \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E")))), React.createElement("div", {
    className: "overview-bottom"
  }, React.createElement("section", {
    className: "card score-spread"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("div", null, React.createElement("h2", null, "\u0420\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u043E\u0446\u0435\u043D\u043E\u043A"), React.createElement("p", null, "\u0422\u043E\u043B\u044C\u043A\u043E \u043E\u0446\u0435\u043D\u0451\u043D\u043D\u044B\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0438 \u043D\u0430\u0431\u043E\u0440\u0430")), React.createElement(Tag, null, "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0435 \u043E\u0446\u0435\u043D\u043A\u0438")), React.createElement("div", {
    className: "spread-bars"
  }, groups.map(g => React.createElement("div", {
    key: g.label,
    className: 'spread-row ' + g.tone
  }, React.createElement("span", null, React.createElement("i", null), g.label, React.createElement("small", null, g.range)), React.createElement("div", null, React.createElement("span", {
    style: {
      width: (scored.length ? g.count / scored.length * 100 : 0) + '%'
    }
  })), React.createElement("strong", null, g.count)))), React.createElement("div", {
    className: "panel-footnote"
  }, "\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442\u0441\u044F \u0434\u043B\u044F \u043D\u0430\u0432\u0438\u0433\u0430\u0446\u0438\u0438, \u0430 \u043D\u0435 \u043A\u0430\u043A \u043C\u0435\u0442\u0440\u0438\u043A\u0430 \u043E\u0442\u0431\u043E\u0440\u0430.")), React.createElement("section", {
    className: "review-shortcut"
  }, React.createElement("div", {
    className: "shortcut-top"
  }, React.createElement("span", {
    className: "shortcut-icon"
  }, React.createElement(Icon, {
    name: "shield",
    size: 23
  })), React.createElement(Tag, {
    tone: "amber"
  }, "\u041F\u0420\u041E\u0412\u0415\u0420\u041A\u0410")), React.createElement("h3", null, "\u0414\u0435\u0440\u0436\u0438\u0442\u0435 \u0432\u0430\u0436\u043D\u043E\u0435 \u0432 \u0444\u043E\u043A\u0443\u0441\u0435"), React.createElement("p", null, "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F, \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u043E\u043D\u0442\u0435\u043A\u0441\u0442 \u0438 \u043E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u043E\u0446\u0435\u043D\u043A\u0438."), React.createElement("button", {
    className: "subtle-link",
    onClick: onCritical
  }, "\u0414\u0438\u0430\u043B\u043E\u0433\u0438 \u0441 \u0440\u0438\u0441\u043A\u0430\u043C\u0438 ", React.createElement("span", null, React.createElement(Icon, {
    name: "arrow",
    size: 15
  }))), React.createElement("span", {
    className: "shortcut-count"
  }, flags.length, React.createElement("small", null, "\u0432 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u043C \u043D\u0430\u0431\u043E\u0440\u0435")))), React.createElement("div", {
    className: "workspace-disclaimer"
  }, React.createElement(Icon, {
    name: "info",
    size: 15
  }), React.createElement("span", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u044B \u043D\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043E\u0446\u0435\u043D\u043A\u0430\u0445. \u0414\u0435\u043C\u043E \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0422\u043E\u0447\u043D\u043E\u0441\u0442\u044C \u043E\u0442\u043D\u043E\u0441\u0438\u0442\u0435\u043B\u044C\u043D\u043E Ground Truth \u043D\u0435 \u0438\u0437\u043C\u0435\u0440\u0435\u043D\u0430."), React.createElement("button", {
    onClick: () => onNavigate('checklist')
  }, "\u0427\u0435\u043A-\u043B\u0438\u0441\u0442 v", checklist?.version || 1, React.createElement(Icon, {
    name: "arrow",
    size: 12
  }))));
}
function Metric({
  label,
  value,
  icon,
  detail,
  suffix,
  progress
}) {
  return React.createElement("div", {
    className: "card metric"
  }, React.createElement("div", {
    className: "metric-label"
  }, label, React.createElement("span", null, React.createElement(Icon, {
    name: icon,
    size: 17
  }))), React.createElement("div", {
    className: "metric-value"
  }, value, React.createElement("span", null, suffix)), React.createElement("div", {
    className: "metric-detail"
  }, progress !== undefined && React.createElement("i", {
    className: "metric-progress"
  }, React.createElement("span", {
    style: {
      width: progress + '%'
    }
  })), detail));
}
function MarkText({
  text,
  query
}) {
  if (!query.trim()) return text;
  const at = text.toLocaleLowerCase().indexOf(query.trim().toLocaleLowerCase());
  if (at < 0) return text;
  return React.createElement(React.Fragment, null, text.slice(0, at), React.createElement("mark", null, text.slice(at, at + query.trim().length)), text.slice(at + query.trim().length));
}
function isImported(ev) {
  return ev?.source === 'imported' || Boolean(ev?.import_sha256);
}
function sameChecklist(a, b) {
  const canonical = rows => JSON.stringify((rows || []).map(c => Object.fromEntries(Object.keys(c).sort().map(k => [k, c[k]]))).sort((a, b) => a.id.localeCompare(b.id)));
  return canonical(a) === canonical(b);
}
const runningStatuses = ['queued', 'running', 'cancelling'];
const datasetNames = {
  DEV: 'DEV · разработка',
  PROD: 'PROD · контроль',
  CUSTOM: 'CUSTOM · свои тесты',
  DEMO: 'DEMO · примеры'
};
function modelStateLabel(h) {
  if (!h) return 'Подключение…';
  if (h.mode === 'demo') return 'Демо-режим';
  return h.model_state === 'ready' ? 'Сервис доступен' : h.model_state === 'unavailable' ? 'Сервис недоступен' : 'Модель настроена';
}
function dateText(value) {
  return new Date(value).toLocaleString('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
function downloadJson(value, name) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {
    type: 'application/json'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function JobPanel({
  job,
  onCancel,
  onDismiss
}) {
  const active = runningStatuses.includes(job.status),
    percent = Math.round(job.completed / Math.max(1, job.total) * 100);
  return React.createElement("section", {
    className: 'job-panel ' + (active ? 'running' : ''),
    "aria-live": "polite"
  }, React.createElement("div", {
    className: "job-title"
  }, React.createElement(Icon, {
    name: active ? 'clock' : 'check',
    size: 18
  }), React.createElement("strong", null, job.status === 'cancelling' ? 'Останавливаем после текущего диалога' : active ? 'Оценка диалогов' : job.status === 'completed' ? 'Обработка завершена' : job.status === 'cancelled' ? 'Обработка отменена' : job.status === 'interrupted' ? 'Обработка прервана перезапуском' : 'Ошибка обработки'), React.createElement("span", null, job.completed, " / ", job.total, " \xB7 \u041E\u0448\u0438\u0431\u043E\u043A: ", job.errors), active ? React.createElement("button", {
    className: "text-link",
    disabled: job.status === 'cancelling',
    onClick: onCancel
  }, "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0447\u0435\u0440\u0435\u0434\u044C") : React.createElement("button", {
    className: "icon-btn",
    "aria-label": "\u0421\u043A\u0440\u044B\u0442\u044C \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438",
    onClick: onDismiss
  }, React.createElement(Icon, {
    name: "close",
    size: 16
  }))), React.createElement("div", {
    className: "job-progress",
    role: "progressbar",
    "aria-label": "\u041F\u0440\u043E\u0433\u0440\u0435\u0441\u0441 \u043E\u0446\u0435\u043D\u043A\u0438",
    "aria-valuenow": percent,
    "aria-valuemin": 0,
    "aria-valuemax": 100
  }, React.createElement("span", {
    style: {
      width: percent + '%'
    }
  })), React.createElement("small", null, job.current ? 'Сейчас: ' + job.current : job.message || 'Чек-лист v' + job.checklist_version + ' · ' + (job.mode === 'demo' ? 'Демонстрационные правила' : 'Модельный сервис')), job.errors > 0 && React.createElement("details", null, React.createElement("summary", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438"), job.results.filter(r => r.status === 'error').map(r => React.createElement("p", {
    key: r.conversation_id
  }, React.createElement("strong", null, r.conversation_id), ": ", r.error))));
}
function ConnectionSettings({
  busy,
  health,
  onRefresh,
  onError,
  onToast
}) {
  const [config, setConfig] = useState(null),
    [saved, setSaved] = useState(null),
    [probe, setProbe] = useState(null),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    api('/settings').then(c => {
      setConfig(c);
      setSaved(c);
    }).catch(e => onError(e.message));
  }, []);
  const dirty = config && JSON.stringify(config) !== JSON.stringify(saved);
  const change = (key, value) => setConfig(c => ({
    ...c,
    [key]: value
  }));
  async function save() {
    setLoading(true);
    try {
      const c = await api('/settings', 'PUT', config);
      setSaved(c);
      setConfig(c);
      setProbe(null);
      await onRefresh();
      onToast('Настройки сохранены. Новые оценки будут использовать этот режим.');
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function check() {
    setLoading(true);
    try {
      setProbe(await api('/model/check', 'POST', {}));
      await onRefresh();
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "\u041F\u041E\u0414\u041A\u041B\u042E\u0427\u0415\u041D\u0418\u0415 \u0418 \u041F\u0420\u041E\u0418\u0421\u0425\u041E\u0416\u0414\u0415\u041D\u0418\u0415 \u041E\u0426\u0415\u041D\u041E\u041A"), React.createElement("h1", null, "\u041C\u043E\u0434\u0435\u043B\u044C \u0438 \u0434\u0430\u043D\u043D\u044B\u0435"), React.createElement("p", {
    className: "subtitle"
  }, "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 GPU-\u0441\u0435\u0440\u0432\u0438\u0441\u0430 \u0438 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u0438\u0442\u043E\u0433\u043E\u0432\u044B\u0445 \u0444\u0430\u0439\u043B\u043E\u0432.")), React.createElement(Tag, {
    tone: health?.model_state === 'ready' ? 'green' : 'amber'
  }, modelStateLabel(health))), !config ? React.createElement("div", {
    className: "empty-state"
  }, "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438\u2026") : React.createElement("div", {
    className: "connection-grid"
  }, React.createElement("section", {
    className: "card settings-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("div", null, React.createElement("h2", null, "\u0421\u0435\u0440\u0432\u0438\u0441 \u043E\u0446\u0435\u043D\u043A\u0438"), React.createElement("p", null, "\u0417\u0430\u043F\u0440\u043E\u0441\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0441 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F")), React.createElement(Icon, {
    name: "settings"
  })), React.createElement("div", {
    className: "settings-fields"
  }, React.createElement("label", null, "\u0420\u0435\u0436\u0438\u043C", React.createElement("select", {
    value: config.mode,
    onChange: e => change('mode', e.target.value)
  }, React.createElement("option", {
    value: "demo"
  }, "\u0414\u0435\u043C\u043E\u043D\u0441\u0442\u0440\u0430\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u043F\u0440\u0430\u0432\u0438\u043B\u0430"), React.createElement("option", {
    value: "local"
  }, "\u0421\u0432\u043E\u044F \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0430 GPU \xB7 local"), React.createElement("option", {
    value: "external_api"
  }, "\u0412\u043D\u0435\u0448\u043D\u0438\u0439 CQA-\u0441\u0435\u0440\u0432\u0438\u0441 \xB7 external_api"), React.createElement("option", {
    value: "hybrid"
  }, "\u0421\u043C\u0435\u0448\u0430\u043D\u043D\u044B\u0439 \u043F\u043E\u0434\u0445\u043E\u0434 \xB7 hybrid"))), config.mode !== 'demo' && React.createElement(React.Fragment, null, React.createElement("label", null, "URL \u0441\u0435\u0440\u0432\u0438\u0441\u0430 /evaluate", React.createElement("input", {
    type: "url",
    value: config.model_url,
    onChange: e => change('model_url', e.target.value),
    placeholder: "http://127.0.0.1:9000/evaluate"
  })), React.createElement("label", null, "\u0424\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043C\u043E\u0434\u0435\u043B\u0438", React.createElement("input", {
    value: config.model_name,
    onChange: e => change('model_name', e.target.value),
    placeholder: "Qwen3.5-9B NF4 + RAG"
  })), React.createElement("label", null, "\u0422\u0430\u0439\u043C-\u0430\u0443\u0442 \u043E\u0434\u043D\u043E\u0433\u043E \u0434\u0438\u0430\u043B\u043E\u0433\u0430, \u0441\u0435\u043A\u0443\u043D\u0434", React.createElement("input", {
    type: "number",
    min: "1",
    max: "3600",
    value: config.timeout,
    onChange: e => change('timeout', Number(e.target.value))
  }))), React.createElement("div", {
    className: "form-note"
  }, config.mode === 'demo' ? 'Демо-режим подходит для репетиции интерфейса. Он не является AI-оценкой и не допускается в официальную выгрузку.' : 'При недоступности сервиса сохраняется ошибка. Автоматической подмены результатом демо-правил нет.'), React.createElement("p", {
    className: "muted"
  }, "URL \u0434\u043E\u043B\u0436\u0435\u043D \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0442\u044C conversation \u0438 checklist \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0442\u044C criteria \u043F\u043E \u043A\u043E\u043D\u0442\u0440\u0430\u043A\u0442\u0443 CQA. \u0414\u043B\u044F \u043F\u0440\u043E\u0438\u0437\u0432\u043E\u043B\u044C\u043D\u043E\u0433\u043E API \u044F\u0437\u044B\u043A\u043E\u0432\u043E\u0439 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0443\u0436\u0435\u043D \u0430\u0434\u0430\u043F\u0442\u0435\u0440."), React.createElement("div", {
    className: "settings-actions"
  }, React.createElement("button", {
    className: "btn primary",
    disabled: busy || loading || !dirty,
    onClick: save
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438"), React.createElement("button", {
    className: "btn",
    disabled: busy || loading || dirty,
    onClick: check
  }, loading ? 'Проверяем…' : 'Проверить подключение')), dirty && React.createElement("p", {
    className: "muted"
  }, "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F, \u0437\u0430\u0442\u0435\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435."), probe && React.createElement("div", {
    className: 'probe-result ' + probe.state
  }, React.createElement("strong", null, probe.state === 'ready' ? 'Сервис отвечает' : probe.state === 'demo' ? 'Демо-режим' : 'Сервис недоступен'), React.createElement("p", null, probe.message), probe.service?.training_status && React.createElement("small", null, probe.service.training_status === 'base_weights_not_finetuned' ? 'Сервис сообщает: базовые веса, без дообучения.' : probe.service.training_status), React.createElement("small", null, "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043E ", dateText(probe.checked_at), " \xB7 \u0410\u043B\u043C\u0430\u0442\u044B")))), React.createElement("div", {
    className: "settings-aside"
  }, React.createElement("section", {
    className: "card settings-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("h2", null, "\u0414\u0430\u043D\u043D\u044B\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B")), React.createElement("div", {
    className: "settings-fields"
  }, React.createElement("label", null, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0434\u043B\u044F results.json", React.createElement("input", {
    value: config.team_name,
    maxLength: 100,
    onChange: e => change('team_name', e.target.value)
  })), React.createElement("p", {
    className: "muted"
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442\u0441\u044F \u043E\u0431\u0449\u0435\u0439 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \xAB\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438\xBB. \u0418\u043C\u044F \u043C\u043E\u0434\u0435\u043B\u0438 \u0432 \u0432\u044B\u0433\u0440\u0443\u0437\u043A\u0435 \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0438\u0437 \u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043E\u0446\u0435\u043D\u043E\u043A, \u0430 \u043D\u0435 \u0438\u0437 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0442\u0435\u043B\u044F."))), React.createElement("section", {
    className: "card settings-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("h2", null, "\u041F\u0435\u0440\u0435\u0434 \u043F\u0440\u0435\u0437\u0435\u043D\u0442\u0430\u0446\u0438\u0435\u0439")), React.createElement("div", {
    className: "settings-fields"
  }, React.createElement("p", null, "1. \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u0435\u0440\u0432\u0438\u0441 \u043C\u043E\u0434\u0435\u043B\u0438 \u043D\u0430 GPU."), React.createElement("p", null, "2. \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0439 URL \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435."), React.createElement("p", null, "3. \u041E\u0446\u0435\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u0439 \u0434\u0438\u0430\u043B\u043E\u0433."), React.createElement("p", null, "4. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0431\u044A\u044F\u0441\u043D\u0435\u043D\u0438\u044F, \u0440\u0435\u043F\u043B\u0438\u043A\u0438 \u0438 \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0438\u0437\u043C\u0435\u043D\u0451\u043D\u043D\u043E\u0433\u043E \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u0430."), React.createElement("div", {
    className: "form-note"
  }, "\u041E\u0442\u0432\u0435\u0442 /health \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E\u0441\u0442\u044C \u0441\u0435\u0440\u0432\u0438\u0441\u0430. \u041E\u043D \u043D\u0435 \u0434\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u044D\u043A\u0441\u043F\u0435\u0440\u0442\u043D\u0443\u044E \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0438. \u0414\u043B\u044F \u043D\u0435\u0451 \u043D\u0443\u0436\u043D\u0430 \u043D\u0435\u0437\u0430\u0432\u0438\u0441\u0438\u043C\u0430\u044F \u0440\u0430\u0437\u043C\u0435\u0447\u0435\u043D\u043D\u0430\u044F \u0432\u044B\u0431\u043E\u0440\u043A\u0430."))))));
}
function ExportWorkspace({
  onError,
  onToast,
  onOpen
}) {
  const [dataset, setDataset] = useState('DEV'),
    [report, setReport] = useState(null),
    [loading, setLoading] = useState(false),
    [saved, setSaved] = useState('');
  useEffect(() => {
    let alive = true;
    setReport(null);
    setSaved('');
    api('/export/validate?dataset=' + dataset).then(r => alive && setReport(r)).catch(e => alive && onError(e.message));
    return () => {
      alive = false;
    };
  }, [dataset]);
  async function exportData(strict, save = false) {
    setLoading(true);
    try {
      if (save) {
        const r = await api('/export/save', 'POST', {
          dataset
        });
        setSaved(r.path);
        onToast(r.message);
      } else {
        const value = await api('/export?dataset=' + dataset + '&strict=' + strict);
        downloadJson(value, strict ? 'results.json' : dataset.toLowerCase() + '-draft.json');
        onToast(strict ? 'Файл results.json скачан' : 'Черновик скачан. Он не предназначен для официальной сдачи.');
      }
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return React.createElement(React.Fragment, null, React.createElement("label", null, "\u041D\u0430\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445", React.createElement("select", {
    value: dataset,
    onChange: e => setDataset(e.target.value)
  }, Object.entries(datasetNames).map(([id, name]) => React.createElement("option", {
    key: id,
    value: id
  }, name)))), report ? React.createElement(React.Fragment, null, React.createElement("div", {
    className: "export-counts"
  }, React.createElement("span", null, React.createElement("strong", null, report.total), "\u0414\u0438\u0430\u043B\u043E\u0433\u043E\u0432"), React.createElement("span", null, React.createElement("strong", null, report.evaluated), "\u041E\u0446\u0435\u043D\u0435\u043D\u043E"), React.createElement("span", null, React.createElement("strong", null, report.errors.length), "\u041E\u0448\u0438\u0431\u043E\u043A \u043C\u043E\u0434\u0435\u043B\u0438")), React.createElement("div", {
    className: 'export-readiness ' + (report.ready ? 'ready' : 'not-ready')
  }, React.createElement(Icon, {
    name: report.ready ? 'check' : 'info',
    size: 18
  }), React.createElement("div", null, React.createElement("strong", null, report.ready ? 'Формат готов к выгрузке' : 'Выгрузка для сдачи пока не готова'), report.issues.map(issue => React.createElement("p", {
    key: issue
  }, issue)), report.ready && React.createElement("p", null, "\u0423\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u044B\u0435 ID, \u043F\u043E\u043B\u043D\u044B\u0439 \u043D\u0430\u0431\u043E\u0440, \u0432\u043E\u0441\u0435\u043C\u044C \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0435\u0432 \u0438 \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u044B."), report.errors.length > 0 && React.createElement("p", null, "\u041E\u0448\u0438\u0431\u043A\u0438 \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0438 \u0432\u043A\u043B\u044E\u0447\u0430\u044E\u0442\u0441\u044F \u043A\u0430\u043A status=error \u0441 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435\u043C. \u042D\u0442\u043E \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442, \u043D\u043E \u043D\u0435 \u0443\u0441\u043F\u0435\u0448\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430."))), [['missing', 'Без оценки'], ['demo', 'Демо-результаты'], ['stale', 'Устаревшие оценки'], ['experimental', 'Экспериментальный чек-лист'], ['pending_appeals', 'Ожидают пересмотра']].filter(([key]) => report[key].length).map(([key, title]) => React.createElement("details", {
    className: "export-issues",
    key: key
  }, React.createElement("summary", null, title, " \xB7 ", report[key].length), React.createElement("div", null, report[key].slice(0, 30).map(id => React.createElement("button", {
    key: id,
    onClick: () => onOpen(id)
  }, id, React.createElement(Icon, {
    name: "arrow",
    size: 12
  })))))), React.createElement("button", {
    className: "btn primary full",
    disabled: !report.ready || loading,
    onClick: () => exportData(true)
  }, React.createElement(Icon, {
    name: "download",
    size: 17
  }), "\u0421\u043A\u0430\u0447\u0430\u0442\u044C results.json \u0434\u043B\u044F \u0441\u0434\u0430\u0447\u0438"), React.createElement("button", {
    className: "btn full",
    disabled: !report.ready || loading,
    onClick: () => exportData(true, true)
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0432 results/", dataset.toLowerCase(), "/results.json"), React.createElement("button", {
    className: "text-link full",
    disabled: loading,
    onClick: () => exportData(false)
  }, "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u043D\u0430\u0431\u043E\u0440\u0430"), saved && React.createElement("p", {
    className: "saved-path"
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E: ", saved, React.createElement("br", null), "Commit \u0438 push \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E."), React.createElement("p", {
    className: "muted"
  }, "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0444\u043E\u0440\u043C\u0430\u0442\u0430 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u0438. \u0414\u0435\u043C\u043E \u0438 \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0435 \u043D\u0430\u0431\u043E\u0440\u044B \u043D\u0435 \u0441\u043C\u0435\u0448\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0441 DEV/PROD.")) : React.createElement("p", {
    className: "muted"
  }, "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0435\u043C \u043F\u043E\u043B\u043D\u043E\u0442\u0443 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432\u2026"));
}
function ImportResults({
  busy,
  onDone,
  onError
}) {
  const [text, setText] = useState(''),
    [loading, setLoading] = useState(false);
  const input = useRef(null);
  async function upload() {
    setLoading(true);
    try {
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw Error('Проверьте JSON файла результатов');
      }
      const r = await api('/results/import', 'POST', body);
      await onDone(r);
    } catch (e) {
      onError(e.message);
    } finally {
      setLoading(false);
    }
  }
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "form-note"
  }, "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0442\u044B. \u0424\u0430\u0439\u043B \u0434\u043E\u043B\u0436\u0435\u043D \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C schema_version, model \u0438 results. \u0411\u0430\u043B\u043B\u044B \u0438 \u043D\u043E\u043C\u0435\u0440\u0430 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432 \u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0442\u0441\u044F. \u041F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u0435 \u043C\u043E\u0434\u0435\u043B\u0438 \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0438\u0437 \u0444\u0430\u0439\u043B\u0430 \u0438 \u043D\u0435 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442 \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C."), React.createElement("button", {
    className: "file-drop",
    onClick: () => input.current.click()
  }, React.createElement(Icon, {
    name: "upload",
    size: 25
  }), React.createElement("strong", null, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C results.json"), React.createElement("span", null, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u0441 Kaggle \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u0433\u043E GPU-\u0445\u043E\u0441\u0442\u0430")), React.createElement("input", {
    ref: input,
    hidden: true,
    type: "file",
    accept: ".json,application/json",
    onChange: async e => {
      const f = e.target.files?.[0];
      if (f) {
        if (f.size > 20 * 1024 * 1024) {
          onError('Файл больше 20 МБ');
          return;
        }
        setText(await f.text());
      }
    }
  }), React.createElement("label", null, "JSON \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432", React.createElement("textarea", {
    rows: 7,
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "{\"schema_version\":\"1.0\",\"model\":{\"mode\":\"local\",\"name\":\"\u2026\"},\"results\":[\u2026]}"
  })), React.createElement("button", {
    className: "btn primary full",
    disabled: busy || loading || !text.trim(),
    onClick: upload
  }, loading ? 'Проверяем…' : 'Проверить и импортировать результаты'));
}
function HistoryView({
  rows,
  onJump
}) {
  return React.createElement(React.Fragment, null, !rows.length ? React.createElement("p", {
    className: "muted"
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u0432\u0435\u0440\u0441\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442.") : rows.map((r, index) => React.createElement("details", {
    className: "history-version",
    key: r.revision,
    open: index === 0
  }, React.createElement("summary", null, React.createElement("span", null, dateText(r.evaluated_at), " \xB7 v", r.checklist.version), React.createElement("strong", null, r.score ? fmt(r.score.final_score) + ' / 100' : 'Ошибка'), React.createElement(Tag, {
    tone: r.mode === 'demo' ? 'amber' : 'green'
  }, r.mode === 'demo' ? 'Демо' : isImported(r) ? 'Импорт' : 'Модель')), React.createElement("p", {
    className: "muted"
  }, r.provider), r.error && React.createElement("div", {
    className: "form-note"
  }, r.error), r.criteria.map(c => React.createElement("div", {
    className: "history-criterion",
    key: c.criterion_id
  }, React.createElement("strong", null, r.checklist.criteria.find(x => x.id === c.criterion_id)?.name || c.criterion_id, ": ", valueText(c.value)), React.createElement("p", null, c.rationale), React.createElement("div", {
    className: "evidence-links"
  }, c.evidence_turns.map(i => React.createElement("button", {
    key: i,
    onClick: () => onJump(i)
  }, "\u0420\u0435\u043F\u043B\u0438\u043A\u0430 #", i))))), r.original_score && r.reviews?.length > 0 && React.createElement("div", {
    className: "form-note"
  }, "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u0438\u0442\u043E\u0433: ", fmt(r.original_score.final_score), ". \u041F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u043E\u0432: ", r.reviews.length, ". ", r.reviews.map(a => a.reason).join(' · ')))));
}
function App() {
  const [page, setPage] = useState('overview'),
    [records, setRecords] = useState([]),
    [selected, setSelected] = useState('p4-ru-003'),
    [checklist, setChecklist] = useState(null),
    [appeals, setAppeals] = useState([]),
    [health, setHealth] = useState(null),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [lang, setLang] = useState('all'),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(''),
    [working, setBusy] = useState(false),
    [activeTurn, setActiveTurn] = useState(26),
    [importText, setImportText] = useState(''),
    [comment, setComment] = useState(''),
    [criterion, setCriterion] = useState('consultation'),
    [review, setReview] = useState(null),
    [decision, setDecision] = useState('confirmed'),
    [newValue, setNewValue] = useState('false'),
    [reason, setReason] = useState(''),
    [expanded, setExpanded] = useState('consultation'),
    [error, setError] = useState(''),
    [transcriptQuery, setTranscriptQuery] = useState(''),
    [searchIndex, setSearchIndex] = useState(0),
    [dataset, setDataset] = useState('all'),
    [importDataset, setImportDataset] = useState('CUSTOM'),
    [jobs, setJobs] = useState([]),
    [dismissedJob, setDismissedJob] = useState(null),
    [historyRows, setHistoryRows] = useState([]);
  const activeJob = jobs.find(j => runningStatuses.includes(j.status));
  const busy = working || !!activeJob;
  const visibleJob = activeJob || (jobs[0]?.id !== dismissedJob ? jobs[0] : null);
  const audio = useRef(null);
  const file = useRef(null);
  async function refresh() {
    const [r, c, a, h, j] = await Promise.all([api('/conversations'), api('/checklist'), api('/appeals'), api('/health'), api('/jobs')]);
    setRecords(r);
    setChecklist(c);
    setAppeals(a);
    setHealth(h);
    setJobs(j);
  }
  useEffect(() => {
    refresh().catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    if (!activeJob) return;
    let alive = true;
    const id = activeJob.id;
    const timer = setInterval(async () => {
      try {
        const rows = await api('/jobs');
        if (!alive) return;
        setJobs(rows);
        const latest = rows.find(j => j.id === id);
        if (latest && !runningStatuses.includes(latest.status)) {
          await refresh();
          setToast('Обработка: ' + latest.completed + ' / ' + latest.total + '. Ошибок: ' + latest.errors);
        }
      } catch (e) {
        if (alive) setError(e.message);
      }
    }, 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [activeJob?.id]);
  async function startJob(ids) {
    await act(async () => {
      const j = await api('/jobs', 'POST', {
        conversation_ids: ids
      });
      setDismissedJob(null);
      setJobs(old => [j, ...old.filter(x => x.id !== j.id)]);
      setToast('Обработка запущена. Прогресс отображается над страницей.');
    });
  }
  async function showHistory() {
    await act(async () => {
      setHistoryRows(await api('/conversations/' + encodeURIComponent(selected) + '/history'));
      setModal('history');
    });
  }
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'auto'
    });
  }, [page]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(''), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    function esc(e) {
      if (e.key === 'Escape') {
        setModal(null);
        setReview(null);
      }
    }
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  const current = records.find(r => r.conversation_id === selected),
    ev = current?.evaluation,
    config = ev?.checklist?.criteria || checklist?.criteria || [],
    score = ev?.score?.final_score;
  async function act(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function evaluate(id = selected) {
    await startJob([id]);
  }
  function openRecord(r) {
    setTranscriptQuery('');
    setSearchIndex(0);
    setSelected(r.conversation_id);
    setPage('analysis');
    setActiveTurn(Math.max(0, r.transcript.findIndex(m => m.speaker === 'operator')));
    setExpanded('consultation');
  }
  function centerTurn(i) {
    const el = document.getElementById('turn-' + i),
      box = el?.closest('.transcript');
    if (box && el) box.scrollTo({
      top: box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - box.clientHeight / 2 + el.clientHeight / 2,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    });
  }
  function jump(i) {
    if (!current?.transcript[i - 1]) return;
    setActiveTurn(i - 1);
    centerTurn(i - 1);
    const card = document.querySelector('.transcript-card');
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    card?.scrollIntoView({
      behavior,
      block: 'start',
      inline: 'nearest'
    });
    if (audio.current) audio.current.currentTime = elapsed(current, current.transcript[i - 1]);
  }
  useEffect(() => {
    if (page === 'analysis' && current) {
      const timer = setTimeout(() => centerTurn(activeTurn), 80);
      return () => clearTimeout(timer);
    }
  }, [page, current?.conversation_id]);
  const evaluated = records.filter(r => r.evaluation?.status === 'ok'),
    critical = evaluated.filter(r => r.evaluation.score.critical_flag),
    pending = appeals.filter(a => a.status === 'pending'),
    average = evaluated.some(r => r.evaluation.score.final_score !== null) ? evaluated.filter(r => r.evaluation.score.final_score !== null).reduce((s, r) => s + r.evaluation.score.final_score, 0) / evaluated.filter(r => r.evaluation.score.final_score !== null).length : null;
  const searchHits = current ? current.transcript.flatMap((m, i) => transcriptQuery.trim() && m.text.toLocaleLowerCase().includes(transcriptQuery.trim().toLocaleLowerCase()) ? [i] : []) : [];
  function findTurn(direction = 1) {
    if (!searchHits.length) return;
    const next = (searchIndex + direction + searchHits.length) % searchHits.length;
    setSearchIndex(next);
    jump(searchHits[next] + 1);
  }
  const filtered = records.filter(r => (query === '' || JSON.stringify(r).toLowerCase().includes(query.toLowerCase())) && (dataset === 'all' || r.dataset === dataset) && (lang === 'all' || r.language === lang) && (filter === 'all' || filter === 'critical' && r.evaluation?.score?.critical_flag || filter === 'unrated' && !r.evaluation || filter === 'error' && r.evaluation?.status === 'error' || filter === 'rated' && r.evaluation?.status === 'ok'));
  async function importData() {
    await act(async () => {
      let json;
      try {
        json = JSON.parse(importText);
      } catch {
        throw Error('Неверный JSON. Проверьте формат файла.');
      }
      const result = await api('/import?dataset=' + importDataset, 'POST', json);
      await refresh();
      setModal(null);
      setPage('dialogs');
      setDataset(importDataset);
      setFilter('all');
      setLang('all');
      setQuery('');
      setImportText('');
      setToast('Загружено диалогов: ' + result.imported);
    });
  }
  async function submitAppeal(e) {
    e.preventDefault();
    await act(async () => {
      await api('/appeals', 'POST', {
        conversation_id: selected,
        criterion_id: criterion,
        comment
      });
      await refresh();
      setModal(null);
      setComment('');
      setToast('Апелляция отправлена на проверку');
    });
  }
  async function resolve(e) {
    e.preventDefault();
    await act(async () => {
      await api('/appeals/' + review.id + '/resolve', 'POST', {
        decision,
        reason,
        value: JSON.parse(newValue)
      });
      await refresh();
      setReview(null);
      setToast('Решение сохранено. Итоговая оценка пересчитана.');
    });
  }
  const nav = [['overview', 'home', 'Обзор'], ['dialogs', 'chat', 'Диалоги'], ['checklist', 'check', 'Чек-лист'], ['appeals', 'appeal', 'Апелляции'], ['analytics', 'chart', 'Аналитика'], ['connection', 'settings', 'Модель и данные']];
  return React.createElement("div", {
    className: "app page-" + page
  }, React.createElement("aside", {
    className: "sidebar"
  }, React.createElement("a", {
    className: "brand",
    href: "#",
    onClick: e => {
      e.preventDefault();
      setPage('overview');
    },
    "aria-label": "Freedom CQA"
  }, React.createElement("img", {
    src: "/assets/freedom-logo-white.svg",
    alt: "Freedom",
    className: "freedom-logo"
  }), React.createElement("span", {
    className: "brand-cqa"
  }, "CQA", React.createElement("span", null, "\u041A\u041E\u041D\u0422\u0420\u041E\u041B\u042C \u041A\u0410\u0427\u0415\u0421\u0422\u0412\u0410"))), React.createElement("div", {
    className: "workspace-label"
  }, "\u0420\u0410\u0411\u041E\u0427\u0415\u0415 \u041F\u0420\u041E\u0421\u0422\u0420\u0410\u041D\u0421\u0422\u0412\u041E"), React.createElement("nav", null, nav.map(([id, icon, label]) => React.createElement("button", {
    key: id,
    title: label,
    "aria-label": label,
    className: page === id || id === 'dialogs' && page === 'analysis' ? 'active' : '',
    onClick: () => setPage(id)
  }, React.createElement(Icon, {
    name: icon
  }), label, id === 'appeals' && pending.length > 0 && React.createElement("b", null, pending.length)))), React.createElement("div", {
    className: "sidebar-note"
  }, React.createElement("button", {
    className: "workspace-model",
    onClick: () => setPage('connection')
  }, React.createElement("span", {
    className: "model-symbol"
  }, React.createElement(Icon, {
    name: "bolt",
    size: 17
  })), React.createElement("div", null, modelStateLabel(health), React.createElement("small", null, health?.mode === 'demo' ? 'Демо-правила' : 'Настройки подключения')), React.createElement("span", {
    className: "model-status"
  })), React.createElement("span", {
    className: "sidebar-caption"
  }, "FREEDOM CQA", React.createElement("span", null, "v1.0")))), React.createElement("div", {
    className: "shell"
  }, React.createElement("header", {
    className: "topbar"
  }, React.createElement("div", {
    className: "breadcrumb"
  }, "\u0420\u0430\u0431\u043E\u0447\u0435\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E ", React.createElement(Icon, {
    name: "arrow",
    size: 13
  }), React.createElement("span", null, page === 'analysis' ? 'Анализ разговора' : nav.find(n => n[0] === page)?.[2])), React.createElement("div", {
    className: "topbar-right"
  }, React.createElement("span", {
    className: "demo-indicator"
  }, React.createElement("span", {
    className: "live-dot"
  }), modelStateLabel(health)), React.createElement("span", {
    className: "top-divider"
  }), React.createElement(Icon, {
    name: "shield",
    size: 18
  }), React.createElement("span", null, "Freedom CQA"))), React.createElement("main", null, visibleJob && React.createElement(JobPanel, {
    job: visibleJob,
    onCancel: () => act(async () => {
      await api('/jobs/' + visibleJob.id + '/cancel', 'POST', {});
      await refresh();
    }),
    onDismiss: () => setDismissedJob(visibleJob.id)
  }), error && React.createElement("div", {
    className: "error-banner",
    role: "alert"
  }, React.createElement(Icon, {
    name: "info"
  }), error, React.createElement("button", {
    onClick: () => setError(''),
    "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043E\u0448\u0438\u0431\u043A\u0443"
  }, "\xD7")), page === 'connection' && React.createElement(ConnectionSettings, {
    busy: busy,
    health: health,
    onRefresh: refresh,
    onError: setError,
    onToast: setToast
  }), page === 'overview' && React.createElement(Overview, {
    records: records,
    appeals: appeals,
    checklist: checklist,
    onOpen: openRecord,
    onNavigate: setPage,
    onImport: () => setModal('import'),
    onCritical: () => {
      setFilter('critical');
      setPage('dialogs');
    },
    onUnrated: () => {
      setFilter('unrated');
      setPage('dialogs');
    }
  }), page === 'analysis' && current && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("button", {
    className: "back-link",
    onClick: () => setPage('dialogs')
  }, React.createElement(Icon, {
    name: "back",
    size: 14
  }), " \u0412\u0441\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0438"), React.createElement("h1", null, "\u0410\u043D\u0430\u043B\u0438\u0437 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430"), React.createElement("div", {
    className: "subtitle"
  }, React.createElement("span", {
    className: "record-id"
  }, current.conversation_id), React.createElement("span", null, "\u2022"), current.language === 'RU' ? 'Русский' : current.language === 'KZ' ? 'Қазақша' : 'English', React.createElement("span", null, "\u2022"), current.channel === 'voice call' ? 'Звонок' : 'Чат', React.createElement("span", null, "\u2022"), mediaClock(elapsed(current, current.transcript[current.transcript.length - 1])), React.createElement("span", null, "\u2022"), datasetNames[current.dataset] || current.dataset)), React.createElement("div", {
    className: "heading-actions"
  }, React.createElement("button", {
    className: "btn",
    disabled: working,
    onClick: showHistory
  }, React.createElement(Icon, {
    name: "clock",
    size: 16
  }), "\u0418\u0441\u0442\u043E\u0440\u0438\u044F"), React.createElement("button", {
    className: "btn",
    onClick: () => setModal('export')
  }, React.createElement(Icon, {
    name: "download",
    size: 17
  }), "\u042D\u043A\u0441\u043F\u043E\u0440\u0442"), React.createElement("button", {
    className: "btn primary",
    disabled: busy,
    onClick: () => evaluate()
  }, React.createElement(Icon, {
    name: "bolt",
    size: 17
  }), busy ? 'Оцениваем…' : ev ? 'Оценить заново' : 'Оценить диалог'))), React.createElement("div", {
    className: "notice"
  }, React.createElement("div", {
    className: "notice-icon"
  }, React.createElement(Icon, {
    name: "info",
    size: 17
  })), React.createElement("div", null, React.createElement("strong", null, ev ? ev.mode === 'demo' ? 'Демонстрационная оценка' : isImported(ev) ? 'Импортированный результат' : 'Результат модели' : 'Диалог ещё не оценён'), React.createElement("span", null, ev ? ev.mode === 'demo' ? 'Демо-правила служат для репетиции процесса и не подтверждают качество оператора.' : isImported(ev) ? 'Происхождение заявлено в импортированном файле. Проверьте обоснования и доказательства.' : 'Проверьте обоснования и исходные реплики; вывод модели можно оспорить.' : 'Нажмите «Оценить диалог», чтобы применить текущий чек-лист.')), React.createElement(Tag, {
    tone: "green"
  }, ev ? ev.mode.toUpperCase() : 'БЕЗ ОЦЕНКИ')), React.createElement(AudioPanel, {
    key: current.conversation_id,
    record: current,
    audioRef: audio,
    activeTurn: activeTurn,
    onTurn: setActiveTurn
  }), React.createElement("div", {
    className: "analysis-grid"
  }, React.createElement("section", {
    className: "card transcript-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("div", null, React.createElement("h2", null, "\u0420\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0430 ", React.createElement("span", {
    className: "count"
  }, current.transcript.length)), React.createElement("p", null, "\u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0440\u0435\u043F\u043B\u0438\u043A\u0438 \u0438 \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F")), React.createElement(Icon, {
    name: "chat"
  })), React.createElement("div", {
    className: "transcript-search"
  }, React.createElement(Icon, {
    name: "search",
    size: 16
  }), React.createElement("input", {
    "aria-label": "\u041F\u043E\u0438\u0441\u043A \u043F\u043E \u0440\u0430\u0441\u0448\u0438\u0444\u0440\u043E\u0432\u043A\u0435",
    placeholder: "\u041D\u0430\u0439\u0442\u0438 \u0432 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0435\u2026",
    value: transcriptQuery,
    onChange: e => {
      setTranscriptQuery(e.target.value);
      setSearchIndex(-1);
    },
    onKeyDown: e => {
      if (e.key === 'Enter') findTurn(e.shiftKey ? -1 : 1);
    }
  }), transcriptQuery && React.createElement(React.Fragment, null, React.createElement("small", null, searchHits.length, " \u0441\u043E\u0432\u043F."), React.createElement("button", {
    onClick: () => findTurn(1),
    disabled: !searchHits.length,
    "aria-label": "\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u0435"
  }, React.createElement(Icon, {
    name: "down",
    size: 14
  })), React.createElement("button", {
    onClick: () => setTranscriptQuery(''),
    "aria-label": "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043F\u043E\u0438\u0441\u043A"
  }, React.createElement(Icon, {
    name: "close",
    size: 13
  })))), React.createElement("div", {
    className: "transcript"
  }, current.transcript.map((m, i) => React.createElement("button", {
    key: i,
    id: 'turn-' + i,
    onClick: () => {
      setActiveTurn(i);
      if (audio.current) audio.current.currentTime = elapsed(current, m);
    },
    className: 'turn ' + m.speaker + (i === activeTurn ? ' highlighted' : '')
  }, React.createElement("div", {
    className: "turn-meta"
  }, React.createElement("span", {
    className: 'speaker-avatar ' + m.speaker
  }, m.speaker === 'client' ? 'К' : m.speaker === 'operator' ? 'О' : m.speaker === 'bot' ? 'AI' : '↳'), React.createElement("strong", null, names[m.speaker]), React.createElement("time", {
    title: m.timestamp
  }, mediaClock(elapsed(current, m))), React.createElement("small", null, "#", i + 1)), React.createElement("p", null, React.createElement(MarkText, {
    text: m.text,
    query: transcriptQuery
  })), i === activeTurn && React.createElement("span", {
    className: "fragment-label"
  }, React.createElement("span", null), "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442")))), React.createElement("div", {
    className: "card-bottom"
  }, React.createElement(Icon, {
    name: "shield",
    size: 14
  }), " \u041E\u0440\u0438\u0433\u0438\u043D\u0430\u043B \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u043F\u0442\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u0431\u0435\u0437 \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439")), React.createElement("section", {
    className: "card quality-card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("div", null, React.createElement("h2", null, "\u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430"), React.createElement("p", null, ev ? 'Чек-лист v' + ev.checklist.version : 'Запустите оценку диалога')), ev && React.createElement(Tag, {
    tone: ev.status === 'error' ? 'red' : 'green'
  }, ev.status === 'error' ? 'Ошибка' : ev.mode === 'demo' ? 'Демо-оценка' : 'Оценено')), !ev ? React.createElement("div", {
    className: "empty-state"
  }, React.createElement("div", {
    className: "empty-icon"
  }, React.createElement(Icon, {
    name: "check",
    size: 32
  })), React.createElement("h3", null, "\u0412\u0441\u0451 \u0433\u043E\u0442\u043E\u0432\u043E \u043A \u043E\u0446\u0435\u043D\u043A\u0435"), React.createElement("p", null, "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0430\u043D\u0430\u043B\u0438\u0437, \u0447\u0442\u043E\u0431\u044B \u0443\u0432\u0438\u0434\u0435\u0442\u044C \u0431\u0430\u043B\u043B\u044B, \u043E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u043F\u043E \u043A\u0430\u0436\u0434\u043E\u043C\u0443 \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044E."), React.createElement("button", {
    className: "btn primary",
    disabled: busy,
    onClick: () => evaluate()
  }, "\u041E\u0446\u0435\u043D\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433 ", React.createElement(Icon, {
    name: "arrow",
    size: 16
  }))) : ev.status === 'error' ? React.createElement("div", {
    className: "empty-state"
  }, React.createElement("h3", null, "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0446\u0435\u043D\u0438\u0442\u044C"), React.createElement("p", null, ev.error), React.createElement("button", {
    className: "btn",
    onClick: () => evaluate()
  }, "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C")) : React.createElement(React.Fragment, null, React.createElement("div", {
    className: "score-overview"
  }, React.createElement(Score, {
    score: score
  }), React.createElement("div", null, React.createElement(Tag, {
    tone: ev.score.critical_flag ? 'red' : 'green'
  }, ev.score.critical_flag ? 'Риск грубого нарушения' : ev.mode === 'demo' ? 'Нет демо-маркеров нарушений' : 'Грубых нарушений не выявлено'), React.createElement("h3", null, score == null ? 'Итог не рассчитан' : score >= 80 ? 'Высокий балл по чек-листу' : score >= 60 ? 'Есть зоны для улучшения' : 'Требуется внимание'), React.createElement("p", null, ev.criteria.filter(c => c.value === null).length, " N/A \xB7 \u0432\u0435\u0441\u0430 \u043F\u0435\u0440\u0435\u0440\u0430\u0441\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u044B"), ev.reviews.length > 0 && React.createElement("small", null, "\u0414\u043E \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0430: ", fmt(ev.original_score.final_score), " / 100"))), React.createElement("div", {
    className: "criteria-heading"
  }, React.createElement("span", null, "\u041A\u0420\u0418\u0422\u0415\u0420\u0418\u0419"), React.createElement("span", null, "\u0411\u0410\u041B\u041B\u042B / \u0412\u0415\u0421")), React.createElement("div", {
    className: "criteria-list"
  }, config.map(c => {
    const r = ev.criteria.find(r => r.criterion_id === c.id);
    if (!r) return null;
    const bad = c.type === 'flag' ? r.value === true : r.value === false || typeof r.value === 'number' && r.value < Math.max(...c.values);
    const points = r.value == null ? 'N/A' : c.type === 'flag' ? valueText(r.value) : fmt(c.type === 'scale' ? r.value / Math.max(...c.values) * c.weight : r.value ? c.weight : 0);
    return React.createElement("div", {
      key: c.id,
      className: 'criterion ' + (expanded === c.id ? 'expanded' : '')
    }, React.createElement("button", {
      className: "criterion-button",
      onClick: () => setExpanded(expanded === c.id ? null : c.id)
    }, React.createElement("span", {
      className: 'status-box ' + (r.value === null ? 'na' : bad ? 'warn' : 'pass')
    }, r.value === null ? '–' : bad ? '!' : '✓'), React.createElement("span", {
      className: "criterion-name"
    }, c.name), React.createElement("span", {
      className: 'criterion-points ' + (bad ? 'amber' : '')
    }, points, r.value !== null && c.type !== 'flag' && React.createElement("small", null, " / ", c.weight)), React.createElement(Icon, {
      name: "down",
      size: 14
    })), expanded === c.id && React.createElement("div", {
      className: "criterion-detail"
    }, React.createElement("strong", null, bad ? 'Почему снижена оценка' : r.value === null ? 'Почему N/A' : 'Обоснование'), React.createElement("p", null, r.rationale), React.createElement("div", {
      className: "evidence-links"
    }, r.evidence_turns.slice(0, 5).map(i => React.createElement("button", {
      key: i,
      onClick: () => jump(i)
    }, React.createElement(Icon, {
      name: "chat",
      size: 12
    }), " \u0420\u0435\u043F\u043B\u0438\u043A\u0430 #", i, " ", React.createElement("span", null, mediaClock(elapsed(current, current.transcript[i - 1])))))), React.createElement("small", null, "\u041E\u0442\u0432\u0435\u0442: ", valueText(r.value), c.type === 'scale' ? ' / ' + Math.max(...c.values) : '', " \xB7 \u0412\u0435\u0441: ", c.weight)));
  })), React.createElement("div", {
    className: "quality-actions"
  }, React.createElement("button", {
    className: "btn primary",
    onClick: () => jump(ev.criteria.find(r => r.criterion_id === expanded)?.evidence_turns[0] || 1)
  }, "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442\u0443", React.createElement(Icon, {
    name: "arrow",
    size: 16
  })), React.createElement("button", {
    className: "btn",
    disabled: busy,
    onClick: () => {
      setCriterion(expanded || ev.criteria[0].criterion_id);
      setModal('appeal');
    }
  }, React.createElement(Icon, {
    name: "appeal",
    size: 17
  }), "\u041E\u0441\u043F\u043E\u0440\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443")), !sameChecklist(ev.checklist.criteria, checklist?.criteria) && React.createElement("div", {
    className: "stale"
  }, "\u0427\u0435\u043A-\u043B\u0438\u0441\u0442 \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D \u0434\u043E v", checklist?.version, ". \u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u043E\u0446\u0435\u043D\u043A\u0443 \u0434\u043B\u044F \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044F."), ev.reviews.length > 0 && React.createElement("div", {
    className: "review-history"
  }, React.createElement("strong", null, "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0430"), ev.reviews.map(a => React.createElement("p", {
    key: a.id
  }, config.find(c => c.id === a.criterion_id)?.name, ": ", valueText(a.original.value), " \u2192 ", valueText(a.final_value), ". ", a.reason))))))), page === 'dialogs' && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "CONVERSATION QUALITY ANALYTICS"), React.createElement("h1", null, "\u0414\u0438\u0430\u043B\u043E\u0433\u0438"), React.createElement("p", {
    className: "subtitle"
  }, "\u041A\u0430\u0436\u0434\u044B\u0439 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440. \u041F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u0430\u044F \u043E\u0446\u0435\u043D\u043A\u0430. \u041F\u043E\u043D\u044F\u0442\u043D\u044B\u0439 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0448\u0430\u0433.")), React.createElement("div", {
    className: "collection-actions"
  }, React.createElement("button", {
    className: "btn",
    disabled: busy,
    onClick: () => setModal('results-import')
  }, React.createElement(Icon, {
    name: "download",
    size: 16
  }), "\u0418\u043C\u043F\u043E\u0440\u0442 \u043E\u0446\u0435\u043D\u043E\u043A"), React.createElement("button", {
    className: "btn primary",
    onClick: () => setModal('import')
  }, React.createElement(Icon, {
    name: "upload",
    size: 17
  }), "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433\u0438"))), React.createElement("div", {
    className: "stats-grid"
  }, React.createElement(Stat, {
    label: "\u0412\u0441\u0435\u0433\u043E \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432",
    value: records.length,
    icon: "chat"
  }), React.createElement(Stat, {
    label: "\u041E\u0446\u0435\u043D\u0435\u043D\u043E",
    value: evaluated.length,
    icon: "check"
  }), React.createElement(Stat, {
    label: "\u0420\u0438\u0441\u043A\u0438 \u0433\u0440\u0443\u0431\u044B\u0445 \u043E\u0448\u0438\u0431\u043E\u043A",
    value: critical.length,
    icon: "shield"
  }), React.createElement(Stat, {
    label: "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0435 \u0430\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438",
    value: pending.length,
    icon: "appeal"
  })), React.createElement("section", {
    className: "card"
  }, React.createElement("div", {
    className: "table-toolbar"
  }, React.createElement("div", {
    className: "search"
  }, React.createElement(Icon, {
    name: "search",
    size: 18
  }), React.createElement("input", {
    value: query,
    onChange: e => setQuery(e.target.value),
    placeholder: "\u041F\u043E\u0438\u0441\u043A \u043F\u043E ID \u0438\u043B\u0438 \u0442\u0435\u043A\u0441\u0442\u0443 \u0434\u0438\u0430\u043B\u043E\u0433\u0430",
    "aria-label": "\u041F\u043E\u0438\u0441\u043A \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432"
  })), React.createElement("select", {
    value: dataset,
    onChange: e => setDataset(e.target.value),
    "aria-label": "\u041D\u0430\u0431\u043E\u0440 \u0434\u0430\u043D\u043D\u044B\u0445"
  }, React.createElement("option", {
    value: "all"
  }, "\u0412\u0441\u0435 \u043D\u0430\u0431\u043E\u0440\u044B"), Object.entries(datasetNames).map(([id, name]) => React.createElement("option", {
    key: id,
    value: id
  }, name))), React.createElement("select", {
    value: lang,
    onChange: e => setLang(e.target.value),
    "aria-label": "\u042F\u0437\u044B\u043A"
  }, React.createElement("option", {
    value: "all"
  }, "\u0412\u0441\u0435 \u044F\u0437\u044B\u043A\u0438"), React.createElement("option", null, "RU"), React.createElement("option", null, "KZ"), React.createElement("option", null, "EN")), React.createElement("button", {
    className: "btn",
    disabled: busy || !filtered.length,
    onClick: () => startJob(filtered.map(r => r.conversation_id))
  }, React.createElement(Icon, {
    name: "bolt",
    size: 16
  }), busy ? 'Обрабатываем…' : 'Оценить выборку (' + filtered.length + ')')), React.createElement("div", {
    className: "tabs"
  }, [['all', 'Все диалоги'], ['critical', 'Грубые ошибки'], ['unrated', 'Без оценки'], ['rated', 'Оценённые'], ['error', 'Ошибки']].map(([v, l]) => React.createElement("button", {
    key: v,
    className: filter === v ? 'selected' : '',
    onClick: () => setFilter(v)
  }, l, v === 'critical' && React.createElement("span", null, critical.length)))), React.createElement("div", {
    className: "table-scroll"
  }, React.createElement("table", null, React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", null, "\u0414\u0418\u0410\u041B\u041E\u0413"), React.createElement("th", null, "\u041A\u0410\u041D\u0410\u041B / \u042F\u0417\u042B\u041A"), React.createElement("th", null, "\u0420\u0415\u041F\u041B\u0418\u041A\u0418"), React.createElement("th", null, "\u041E\u0426\u0415\u041D\u041A\u0410"), React.createElement("th", null, "\u0421\u0422\u0410\u0422\u0423\u0421"), React.createElement("th", null))), React.createElement("tbody", null, filtered.map(r => React.createElement("tr", {
    key: r.conversation_id,
    onClick: () => openRecord(r)
  }, React.createElement("td", null, React.createElement("button", {
    className: "table-record",
    onClick: () => openRecord(r)
  }, React.createElement("span", {
    className: "record-icon"
  }, React.createElement(Icon, {
    name: r.audio_url ? 'chart' : 'chat',
    size: 19
  })), React.createElement("span", null, React.createElement("strong", null, r.conversation_id, " ", React.createElement(Tag, null, r.dataset)), React.createElement("small", null, r.transcript.find(m => m.speaker === 'client')?.text.slice(0, 65))))), React.createElement("td", null, r.channel === 'voice call' ? 'Звонок' : 'Чат', " ", React.createElement(Tag, null, r.language)), React.createElement("td", null, r.transcript.length), React.createElement("td", null, React.createElement("strong", {
    className: "table-score"
  }, fmt(r.evaluation?.score?.final_score)), r.evaluation?.score && React.createElement("small", null, " / 100")), React.createElement("td", null, React.createElement(Tag, {
    tone: r.evaluation?.score?.critical_flag ? 'red' : r.evaluation?.status === 'ok' ? 'green' : ''
  }, r.evaluation?.score?.critical_flag ? 'Риск нарушения' : r.evaluation?.status === 'error' ? 'Ошибка' : r.evaluation ? r.evaluation.mode === 'demo' ? 'Демо-оценка' : 'Оценено' : 'Не оценён')), React.createElement("td", null, React.createElement(Icon, {
    name: "arrow",
    size: 16
  }))))))), !filtered.length && React.createElement("div", {
    className: "empty-state"
  }, React.createElement("h3", null, "\u0414\u0438\u0430\u043B\u043E\u0433\u0438 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u044B"), React.createElement("p", null, "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u0435 \u0444\u0438\u043B\u044C\u0442\u0440\u044B \u0438\u043B\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u043D\u0430\u0431\u043E\u0440.")), React.createElement("div", {
    className: "card-bottom"
  }, "\u041F\u043E\u043A\u0430\u0437\u0430\u043D\u043E ", filtered.length, " \u0438\u0437 ", records.length, React.createElement("span", {
    className: "right"
  }, dataset === 'all' ? 'Все наборы' : dataset, " \xB7 RU / KZ / EN")))), page === 'checklist' && checklist && React.createElement(Checklist, {
    data: checklist,
    busy: busy,
    restore: () => act(async () => {
      await api('/checklist/official', 'POST', {
        version: checklist.version
      });
      await refresh();
      setToast('Официальный чек-лист восстановлен в новой версии. Для применения оцените диалоги заново.');
    }),
    save: criteria => act(async () => {
      await api('/checklist', 'PUT', {
        version: checklist.version,
        criteria
      });
      await refresh();
      setToast('Новая версия чек-листа сохранена. Оцените диалоги заново, чтобы применить её.');
    })
  }), page === 'appeals' && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "REVIEW WORKFLOW"), React.createElement("h1", null, "\u0410\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438"), React.createElement("p", {
    className: "subtitle"
  }, "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u043E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u043D\u043E\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u0435.")), React.createElement(Tag, {
    tone: "amber"
  }, pending.length, " \u043D\u0430 \u0440\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0438")), React.createElement("section", {
    className: "card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("h2", null, "\u041E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u044F \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u043E\u0432"), React.createElement("span", {
    className: "muted"
  }, appeals.length, " \u0432\u0441\u0435\u0433\u043E")), !appeals.length ? React.createElement("div", {
    className: "empty-state"
  }, React.createElement("div", {
    className: "empty-icon"
  }, React.createElement(Icon, {
    name: "appeal",
    size: 32
  })), React.createElement("h3", null, "\u041E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0439 \u043F\u043E\u043A\u0430 \u043D\u0435\u0442"), React.createElement("p", null, "\u0412 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u0434\u0438\u0430\u043B\u043E\u0433\u0430 \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0439 \u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \xAB\u041E\u0441\u043F\u043E\u0440\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443\xBB."), React.createElement("button", {
    className: "btn",
    onClick: () => setPage('analysis')
  }, "\u041F\u0435\u0440\u0435\u0439\u0442\u0438 \u043A \u0434\u0438\u0430\u043B\u043E\u0433\u0443")) : appeals.map(a => React.createElement("div", {
    key: a.id,
    className: "appeal-row"
  }, React.createElement("div", {
    className: "appeal-icon"
  }, React.createElement(Icon, {
    name: "appeal"
  })), React.createElement("div", {
    className: "appeal-body"
  }, React.createElement("div", {
    className: "appeal-title"
  }, React.createElement("strong", null, a.conversation_id), React.createElement(Tag, {
    tone: a.status === 'pending' ? 'amber' : 'green'
  }, a.status === 'pending' ? 'На рассмотрении' : a.status === 'changed' ? 'Оценка изменена' : 'Оценка подтверждена')), React.createElement("p", null, a.comment), React.createElement("small", null, a.criterion_name || checklist?.criteria.find(c => c.id === a.criterion_id)?.name || a.criterion_id, " \xB7 \u0418\u0441\u0445\u043E\u0434\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442: ", valueText(a.original.value)), a.reason && React.createElement("p", {
    className: "resolution"
  }, "\u0420\u0435\u0448\u0435\u043D\u0438\u0435: ", a.reason, " \xB7 \u0418\u0442\u043E\u0433: ", valueText(a.final_value))), React.createElement("button", {
    className: "btn",
    onClick: () => {
      const r = records.find(r => r.conversation_id === a.conversation_id);
      setSelected(a.conversation_id);
      if (a.status === 'pending') {
        setReview(a);
        setDecision('confirmed');
        setNewValue(JSON.stringify(a.original.value));
        setReason('');
      } else openRecord(r);
    }
  }, a.status === 'pending' ? 'Рассмотреть' : 'Открыть диалог', React.createElement(Icon, {
    name: "arrow",
    size: 15
  })))))), page === 'analytics' && React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "QUALITY OVERVIEW"), React.createElement("h1", null, "\u0410\u043D\u0430\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430"), React.createElement("p", {
    className: "subtitle"
  }, "\u0421\u0432\u043E\u0434\u043A\u0430 \u043F\u043E \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0430\u043C \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0445 \u043E\u0446\u0435\u043D\u043E\u043A.")), React.createElement("button", {
    className: "btn",
    onClick: () => setModal('export')
  }, React.createElement(Icon, {
    name: "download",
    size: 17
  }), "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432")), React.createElement("div", {
    className: "notice"
  }, React.createElement(Icon, {
    name: "info"
  }), React.createElement("div", null, React.createElement("strong", null, "\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u0438 \u043F\u0440\u043E\u0442\u043E\u0442\u0438\u043F\u0430"), React.createElement("span", null, "\u0414\u0435\u043C\u043E-\u043E\u0446\u0435\u043D\u043A\u0438 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E. \u0421\u0440\u0435\u0434\u043D\u0438\u0439 \u0431\u0430\u043B\u043B \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u043E\u0432 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C\u044E \u043C\u043E\u0434\u0435\u043B\u0438."))), React.createElement("div", {
    className: "stats-grid"
  }, React.createElement(Stat, {
    label: "\u0421\u0440\u0435\u0434\u043D\u044F\u044F \u043E\u0446\u0435\u043D\u043A\u0430",
    value: fmt(average),
    icon: "chart"
  }), React.createElement(Stat, {
    label: "\u041E\u0446\u0435\u043D\u0435\u043D\u043E \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432",
    value: evaluated.length,
    icon: "check"
  }), React.createElement(Stat, {
    label: "\u0420\u0438\u0441\u043A\u0438 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439",
    value: critical.length,
    icon: "shield"
  }), React.createElement(Stat, {
    label: "\u0410\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438",
    value: appeals.length,
    icon: "appeal"
  })), React.createElement("div", {
    className: "analytics-grid"
  }, React.createElement("section", {
    className: "card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("h2", null, "\u0420\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B \u043F\u043E \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044F\u043C")), React.createElement("div", {
    className: "chart-body"
  }, checklist?.criteria.filter(c => c.type !== 'flag').map(c => {
    const rows = evaluated.flatMap(r => {
      const conf = r.evaluation.checklist.criteria.find(x => x.id === c.id),
        row = r.evaluation.criteria.find(x => x.criterion_id === c.id);
      return row && row.value !== null && conf ? [{
        value: row.value,
        conf
      }] : [];
    });
    const pct = rows.length ? 100 * rows.reduce((s, {
      value,
      conf
    }) => s + (conf.type === 'scale' ? value / Math.max(...conf.values) : Number(value)), 0) / rows.length : 0;
    return React.createElement("div", {
      className: "chart-row",
      key: c.id
    }, React.createElement("div", null, React.createElement("span", null, c.name), React.createElement("strong", null, rows.length ? fmt(pct) + '%' : '—')), React.createElement("div", {
      className: "bar-track"
    }, React.createElement("div", {
      style: {
        width: pct + '%'
      }
    })));
  }))), React.createElement("section", {
    className: "card"
  }, React.createElement("div", {
    className: "card-top"
  }, React.createElement("h2", null, "\u041D\u0443\u0436\u0434\u0430\u044E\u0442\u0441\u044F \u0432\u043E \u0432\u043D\u0438\u043C\u0430\u043D\u0438\u0438")), React.createElement("div", {
    className: "attention"
  }, React.createElement("div", {
    className: "attention-icon"
  }, React.createElement(Icon, {
    name: "shield",
    size: 35
  })), React.createElement("strong", null, critical.length), React.createElement("p", null, "\u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432 \u0441 \u0440\u0438\u0441\u043A\u043E\u043C \u0433\u0440\u0443\u0431\u043E\u0433\u043E \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F"), React.createElement("button", {
    className: "btn primary",
    onClick: () => {
      setFilter('critical');
      setPage('dialogs');
    }
  }, "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433\u0438", React.createElement(Icon, {
    name: "arrow",
    size: 16
  })))))), !records.length && !error && React.createElement("div", {
    className: "empty-state"
  }, "\u0417\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u043C \u0440\u0430\u0431\u043E\u0447\u0435\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E\u2026"), React.createElement("footer", null, React.createElement("span", null, "Freedom CQA ", React.createElement("span", null, " / "), " Conversation Quality Analytics"), React.createElement("span", null, "\u041F\u0440\u043E\u0442\u043E\u0442\u0438\u043F \xB7 ", modelStateLabel(health))))), toast && React.createElement("div", {
    className: "toast",
    role: "status"
  }, React.createElement("span", null, "\u2713"), toast), modal === 'appeal' && ev && React.createElement(Modal, {
    title: "\u041E\u0441\u043F\u043E\u0440\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443",
    sub: "\u041E\u043F\u0438\u0448\u0438\u0442\u0435, \u043F\u043E\u0447\u0435\u043C\u0443 \u043E\u0446\u0435\u043D\u043A\u0443 \u0441\u0442\u043E\u0438\u0442 \u043F\u0435\u0440\u0435\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C. \u041F\u0440\u043E\u0432\u0435\u0440\u044F\u044E\u0449\u0438\u0439 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u0438 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 \u0440\u0435\u043F\u043B\u0438\u043A\u0438.",
    close: () => setModal(null)
  }, React.createElement("form", {
    onSubmit: submitAppeal
  }, React.createElement("label", null, "\u041A\u0440\u0438\u0442\u0435\u0440\u0438\u0439", React.createElement("select", {
    value: criterion,
    onChange: e => setCriterion(e.target.value)
  }, config.map(c => React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.name)))), React.createElement("div", {
    className: "form-note"
  }, "\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u043E\u0442\u0432\u0435\u0442: ", React.createElement("strong", null, valueText(ev.criteria.find(r => r.criterion_id === criterion)?.value))), React.createElement("label", null, "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439", React.createElement("textarea", {
    autoFocus: true,
    required: true,
    rows: 4,
    value: comment,
    onChange: e => setComment(e.target.value),
    placeholder: "\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u0430\u0440\u0433\u0443\u043C\u0435\u043D\u0442\u044B \u0438 \u043D\u043E\u043C\u0435\u0440\u0430 \u0440\u0435\u043F\u043B\u0438\u043A\u2026"
  })), React.createElement("button", {
    className: "btn primary full",
    disabled: busy || !comment.trim()
  }, "\u041E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C \u043D\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443", React.createElement(Icon, {
    name: "arrow",
    size: 16
  })))), modal === 'import' && React.createElement(Modal, {
    title: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433\u0438",
    sub: "JSON \u0438\u0437 API \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u043E\u0432, \u043C\u0430\u0441\u0441\u0438\u0432 records \u0438\u043B\u0438 \u043E\u0434\u0438\u043D \u0434\u0438\u0430\u043B\u043E\u0433. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F RU, KZ \u0438 EN.",
    close: () => setModal(null)
  }, React.createElement("label", null, "\u041D\u0430\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u043D\u0430\u0431\u043E\u0440\u0430", React.createElement("select", {
    value: importDataset,
    onChange: e => setImportDataset(e.target.value)
  }, React.createElement("option", {
    value: "CUSTOM"
  }, "CUSTOM \xB7 \u0440\u0435\u043F\u0435\u0442\u0438\u0446\u0438\u0438 \u0438 \u0441\u0432\u043E\u0438 \u0442\u0435\u0441\u0442\u044B"), React.createElement("option", {
    value: "PROD"
  }, "PROD \xB7 \u043A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u044B\u0439 \u043D\u0430\u0431\u043E\u0440 \u043E\u0440\u0433\u0430\u043D\u0438\u0437\u0430\u0442\u043E\u0440\u043E\u0432"))), React.createElement("button", {
    className: "file-drop",
    onClick: () => file.current.click()
  }, React.createElement(Icon, {
    name: "upload",
    size: 28
  }), React.createElement("strong", null, "\u0412\u044B\u0431\u0440\u0430\u0442\u044C JSON-\u0444\u0430\u0439\u043B"), React.createElement("span", null, "\u0414\u043E 10 \u041C\u0411 \xB7 \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0435 ID \u0438 \u043C\u0435\u0442\u043A\u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F")), React.createElement("input", {
    type: "file",
    accept: ".json,application/json",
    ref: file,
    hidden: true,
    onChange: async e => {
      const f = e.target.files[0];
      if (f) {
        if (f.size > 10 * 1024 * 1024) {
          setError('Файл больше 10 МБ');
          return;
        }
        setImportText(await f.text());
      }
    }
  }), React.createElement("label", null, "\u0418\u043B\u0438 \u0432\u0441\u0442\u0430\u0432\u044C\u0442\u0435 JSON", React.createElement("textarea", {
    rows: 7,
    value: importText,
    onChange: e => setImportText(e.target.value),
    placeholder: "{\"conversation_id\":\"new-001\",\"language\":\"RU\",\"channel\":\"agent chat\",\"transcript\":[\u2026]}"
  })), React.createElement("button", {
    className: "btn primary full",
    disabled: busy || !importText.trim(),
    onClick: importData
  }, "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0434\u0438\u0430\u043B\u043E\u0433\u0438")), modal === 'export' && React.createElement(Modal, {
    title: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432",
    sub: "\u041E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u043D\u0430\u0431\u043E\u0440\u044B DEV \u0438 PROD. \u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043F\u043E\u043B\u043D\u043E\u0442\u044B, \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F \u0438 \u0432\u0435\u0440\u0441\u0438\u0438 \u0447\u0435\u043A-\u043B\u0438\u0441\u0442\u0430.",
    close: () => setModal(null)
  }, React.createElement(ExportWorkspace, {
    onError: setError,
    onToast: setToast,
    onOpen: id => {
      const r = records.find(r => r.conversation_id === id);
      if (r) {
        setModal(null);
        openRecord(r);
      }
    }
  })), modal === 'results-import' && React.createElement(Modal, {
    title: "\u0418\u043C\u043F\u043E\u0440\u0442 \u043E\u0446\u0435\u043D\u043E\u043A \u043C\u043E\u0434\u0435\u043B\u0438",
    sub: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u044B, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043D\u044B\u0435 \u043D\u0430 Kaggle \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u043C GPU-\u0445\u043E\u0441\u0442\u0435.",
    close: () => setModal(null)
  }, React.createElement(ImportResults, {
    busy: busy,
    onError: setError,
    onDone: async r => {
      await refresh();
      setModal(null);
      setToast(r.message);
    }
  })), modal === 'history' && React.createElement(Modal, {
    title: "\u0418\u0441\u0442\u043E\u0440\u0438\u044F \u043E\u0446\u0435\u043D\u043E\u043A",
    sub: selected + ' · все сохранённые версии и решения',
    close: () => setModal(null)
  }, React.createElement(HistoryView, {
    rows: historyRows,
    onJump: i => {
      setModal(null);
      jump(i);
    }
  })), review && React.createElement(Modal, {
    title: "\u0420\u0430\u0441\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u0438\u0435 \u0430\u043F\u0435\u043B\u043B\u044F\u0446\u0438\u0438",
    sub: review.conversation_id + ' · ' + (config.find(c => c.id === review.criterion_id)?.name || review.criterion_id),
    close: () => setReview(null)
  }, React.createElement("div", {
    className: "review-evidence"
  }, React.createElement("strong", null, "\u041A\u043E\u043C\u043C\u0435\u043D\u0442\u0430\u0440\u0438\u0439 \u043E\u043F\u0435\u0440\u0430\u0442\u043E\u0440\u0430"), React.createElement("p", null, review.comment), React.createElement("strong", null, "\u0418\u0441\u0445\u043E\u0434\u043D\u043E\u0435 \u043E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435"), React.createElement("p", null, review.original.rationale), review.original.evidence_turns.slice(0, 6).map(i => React.createElement("blockquote", {
    key: i
  }, React.createElement("small", null, "#", i, " \xB7 ", names[current?.transcript[i - 1]?.speaker]), current?.transcript[i - 1]?.text)), React.createElement("button", {
    className: "text-link",
    onClick: () => {
      setReview(null);
      setPage('analysis');
      setTimeout(() => jump(review.original.evidence_turns[0]), 100);
    }
  }, "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u043E\u043B\u043D\u044B\u0439 \u0434\u0438\u0430\u043B\u043E\u0433 \u2192")), React.createElement("form", {
    onSubmit: resolve
  }, React.createElement("label", null, "\u0420\u0435\u0448\u0435\u043D\u0438\u0435", React.createElement("select", {
    value: decision,
    onChange: e => setDecision(e.target.value)
  }, React.createElement("option", {
    value: "confirmed"
  }, "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443"), React.createElement("option", {
    value: "changed"
  }, "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0446\u0435\u043D\u043A\u0443"))), decision === 'changed' && React.createElement("label", null, "\u041D\u043E\u0432\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435", React.createElement("select", {
    value: newValue,
    onChange: e => setNewValue(e.target.value)
  }, (() => {
    const c = config.find(c => c.id === review.criterion_id);
    return [...(c?.type === 'scale' ? c.values : [true, false]), ...(c?.na ? [null] : [])].map(v => React.createElement("option", {
      key: JSON.stringify(v),
      value: JSON.stringify(v)
    }, valueText(v)));
  })())), React.createElement("label", null, "\u041E\u0431\u043E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0448\u0435\u043D\u0438\u044F", React.createElement("textarea", {
    required: true,
    rows: 3,
    value: reason,
    onChange: e => setReason(e.target.value),
    placeholder: "\u041D\u0430 \u043A\u0430\u043A\u0438\u0445 \u0440\u0435\u043F\u043B\u0438\u043A\u0430\u0445 \u043E\u0441\u043D\u043E\u0432\u0430\u043D\u043E \u0440\u0435\u0448\u0435\u043D\u0438\u0435?"
  })), React.createElement("button", {
    className: "btn primary full",
    disabled: busy || !reason.trim()
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0440\u0435\u0448\u0435\u043D\u0438\u0435"))));
}
function Stat({
  label,
  value,
  icon
}) {
  return React.createElement("div", {
    className: "stat card"
  }, React.createElement("div", null, React.createElement("p", null, label), React.createElement("strong", null, value)), React.createElement("span", null, React.createElement(Icon, {
    name: icon,
    size: 23
  })));
}
function Checklist({
  data,
  save,
  busy,
  restore
}) {
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(data.criteria))),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(data.criteria)));
    setDirty(false);
  }, [data.version]);
  function change(i, k, v) {
    setDraft(d => d.map((c, j) => j === i ? {
      ...c,
      [k]: v,
      ...(k === 'type' && v === 'flag' ? {
        weight: 0,
        na: false
      } : {}),
      ...(k === 'type' && v === 'scale' && !c.values.length ? {
        values: [0, 5, 10]
      } : {})
    } : c));
    setDirty(true);
  }
  return React.createElement(React.Fragment, null, React.createElement("div", {
    className: "page-heading"
  }, React.createElement("div", null, React.createElement("div", {
    className: "eyebrow"
  }, "EVALUATION SETTINGS"), React.createElement("h1", null, "\u0427\u0435\u043A-\u043B\u0438\u0441\u0442 \u043A\u0430\u0447\u0435\u0441\u0442\u0432\u0430"), React.createElement("p", {
    className: "subtitle"
  }, "\u041A\u0440\u0438\u0442\u0435\u0440\u0438\u0438, \u0434\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430 \u0438 \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043E\u0446\u0435\u043D\u043A\u0438 \u2014 \u0432 \u043E\u0434\u043D\u043E\u0439 \u043A\u043E\u043D\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u0438.")), React.createElement("button", {
    className: "btn primary",
    disabled: busy || !dirty,
    onClick: () => save(draft)
  }, React.createElement(Icon, {
    name: "check",
    size: 17
  }), "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F")), React.createElement("div", {
    className: "checklist-summary card"
  }, React.createElement("div", {
    className: "empty-icon"
  }, React.createElement(Icon, {
    name: "check",
    size: 26
  })), React.createElement("div", null, React.createElement("h3", null, "\u041E\u0446\u0435\u043D\u043A\u0430 \u043A\u043B\u0438\u0435\u043D\u0442\u0441\u043A\u0438\u0445 \u0447\u0430\u0442\u043E\u0432 ", React.createElement(Tag, {
    tone: "green"
  }, "v", data.version)), React.createElement("p", null, "RU / KZ / EN \xB7 ", draft.length, " \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0435\u0432 \xB7 \u0421\u0443\u043C\u043C\u0430 \u0432\u0435\u0441\u043E\u0432: ", draft.reduce((s, c) => s + Number(c.weight), 0))), React.createElement("span", {
    className: "right muted"
  }, dirty ? 'Есть несохранённые изменения' : 'Все изменения сохранены')), React.createElement("div", {
    className: "notice"
  }, React.createElement(Icon, {
    name: "info"
  }), React.createElement("div", null, React.createElement("strong", null, "N/A \u043D\u0435 \u0440\u0430\u0432\u0435\u043D \u043D\u0443\u043B\u044E"), React.createElement("span", null, "\u0412\u0435\u0441 \u043D\u0435\u043F\u0440\u0438\u043C\u0435\u043D\u0438\u043C\u043E\u0433\u043E \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044F \u0438\u0441\u043A\u043B\u044E\u0447\u0430\u0435\u0442\u0441\u044F, \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u0432\u0435\u0441\u0430 \u043F\u0440\u043E\u043F\u043E\u0440\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E \u043F\u0440\u0438\u0432\u043E\u0434\u044F\u0442\u0441\u044F \u043A 100. \u0424\u043B\u0430\u0433\u0438 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0439 \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u044E\u0442\u0441\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E."))), React.createElement("div", {
    className: "checklist-items"
  }, draft.map((c, i) => React.createElement("section", {
    className: "card checklist-item",
    key: i
  }, React.createElement("div", {
    className: "criterion-number"
  }, String(i + 1).padStart(2, '0')), React.createElement("div", {
    className: "criterion-fields"
  }, React.createElement("div", {
    className: "criterion-fields-top"
  }, React.createElement("label", null, "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u044F", React.createElement("input", {
    value: c.name,
    onChange: e => change(i, 'name', e.target.value)
  })), React.createElement("label", {
    className: "weight-field"
  }, "\u0412\u0435\u0441", React.createElement("input", {
    type: "number",
    min: "0",
    max: "100",
    disabled: c.type === 'flag',
    value: c.weight,
    onChange: e => change(i, 'weight', Number(e.target.value))
  })), React.createElement("button", {
    className: "icon-btn delete",
    title: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0439",
    "aria-label": 'Удалить ' + c.name,
    onClick: () => {
      setDraft(d => d.filter((_, j) => i !== j));
      setDirty(true);
    }
  }, React.createElement(Icon, {
    name: "close",
    size: 18
  }))), React.createElement("label", null, "\u041F\u0440\u0430\u0432\u0438\u043B\u043E \u0438 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044F", React.createElement("textarea", {
    rows: 2,
    value: c.rule,
    onChange: e => change(i, 'rule', e.target.value)
  })), React.createElement("div", {
    className: "criterion-options"
  }, React.createElement("label", null, "ID", React.createElement("input", {
    value: c.id,
    onChange: e => change(i, 'id', e.target.value)
  })), React.createElement("label", null, "\u0422\u0438\u043F \u043E\u0442\u0432\u0435\u0442\u0430", React.createElement("select", {
    value: c.type,
    onChange: e => change(i, 'type', e.target.value)
  }, React.createElement("option", {
    value: "binary"
  }, "\u0414\u0430 / \u041D\u0435\u0442"), React.createElement("option", {
    value: "scale"
  }, "\u0427\u0438\u0441\u043B\u043E\u0432\u0430\u044F \u0448\u043A\u0430\u043B\u0430"), React.createElement("option", {
    value: "flag"
  }, "\u0424\u043B\u0430\u0433 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F"))), c.type === 'scale' && React.createElement("label", null, "\u0421\u0442\u0443\u043F\u0435\u043D\u0438 \u0448\u043A\u0430\u043B\u044B", React.createElement("input", {
    defaultValue: c.values.join(', '),
    onBlur: e => change(i, 'values', e.target.value.split(',').map(x => Number(x.trim())))
  })), React.createElement("label", {
    className: "checkbox-label"
  }, React.createElement("input", {
    type: "checkbox",
    disabled: c.type === 'flag',
    checked: c.na,
    onChange: e => change(i, 'na', e.target.checked)
  }), "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C N/A")))))), React.createElement("button", {
    className: "add-criterion",
    onClick: () => {
      setDraft(d => [...d, {
        id: 'custom_' + Date.now(),
        name: '',
        weight: 5,
        type: 'binary',
        na: false,
        values: [],
        rule: ''
      }]);
      setDirty(true);
    }
  }, React.createElement(Icon, {
    name: "plus"
  }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u0440\u0438\u0442\u0435\u0440\u0438\u0439"), React.createElement("div", {
    className: "checklist-footer"
  }, React.createElement("button", {
    className: "btn",
    disabled: busy,
    onClick: restore
  }, "\u041E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439 \u0447\u0435\u043A-\u043B\u0438\u0441\u0442"), React.createElement("span", {
    className: "muted"
  }, "\u041F\u043E\u0441\u043B\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u043E\u0446\u0435\u043D\u043A\u0443 \u0434\u0438\u0430\u043B\u043E\u0433\u043E\u0432."), React.createElement("button", {
    className: "btn primary",
    disabled: busy || !dirty,
    onClick: () => save(draft)
  }, "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0447\u0435\u043A-\u043B\u0438\u0441\u0442")));
}
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App, null));