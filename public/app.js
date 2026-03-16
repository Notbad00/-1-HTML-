function updateFooterYear() {
  const yearNode = document.getElementById('year');
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear();
  }
}

function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  const isTouch = matchMedia('(pointer: coarse)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isTouch || reduceMotion) {
    glow.style.display = 'none';
    return;
  }

  let targetX = 0.5;
  let targetY = 0.5;
  let currentX = 0.5;
  let currentY = 0.5;

  function setTargetFromEvent(event) {
    targetX = Math.min(1, Math.max(0, event.clientX / window.innerWidth));
    targetY = Math.min(1, Math.max(0, event.clientY / window.innerHeight));
    glow.style.opacity = '1';
  }

  function tick() {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;

    glow.style.setProperty('--mx', `${(currentX * 100).toFixed(2)}%`);
    glow.style.setProperty('--my', `${(currentY * 100).toFixed(2)}%`);
    requestAnimationFrame(tick);
  }

  window.addEventListener('mousemove', setTargetFromEvent, { passive: true });
  window.addEventListener('mouseenter', () => {
    glow.style.opacity = '1';
  }, { passive: true });
  window.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  }, { passive: true });

  requestAnimationFrame(tick);
}

function initMap() {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;

  if (!window.L) {
    const hint = document.getElementById('mapHint');
    if (hint) {
      hint.textContent = 'Не удалось загрузить библиотеку карты. Проверьте подключение к интернету или CDN-ссылки.';
    }
    return;
  }

  const hseCoords = [55.759073, 37.648659];

  const map = L.map('map').setView(hseCoords, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker(hseCoords)
    .addTo(map)
    .bindPopup('Один из корпусов ВШЭ')
    .openPopup();

  map.on('click', (event) => {
    const hint = document.getElementById('mapHint');
    if (hint) {
      hint.textContent = `Вы выбрали точку: ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`;
    }
  });
}

function getBotReply(messageText) {
  const text = messageText.toLowerCase();

  const replyByKeyword = [
    {
      keywords: ['привет', 'здравствуй', 'hello'],
      replies: ['Привет! Рад видеть тебя на моей странице.', 'Здравствуйте! Чем могу помочь?']
    },
    {
      keywords: ['вшэ', 'университет', 'учеба'],
      replies: ['В ВШЭ мне нравится проектный формат и сильные преподаватели.', 'Учёба в ВШЭ интенсивная, но очень интересная.']
    },
    {
      keywords: ['проект', 'портфолио', 'работа'],
      replies: ['Сейчас активно развиваюсь в аналитических и веб-проектах.', 'Добавляю в портфолио учебные и pet-проекты.']
    },
    {
      keywords: ['спасибо', 'благодарю'],
      replies: ['Пожалуйста! Обращайтесь ещё.', 'Рад помочь 🙂']
    }
  ];

  const matched = replyByKeyword.find((item) => item.keywords.some((word) => text.includes(word)));
  if (!matched) {
    const generic = [
      'Интересный вопрос! Расскажи чуть подробнее.',
      'Я получил сообщение. Отвечу по мере возможности.',
      'Спасибо! Могу рассказать про учёбу, проекты или планы.'
    ];
    return generic[Math.floor(Math.random() * generic.length)];
  }

  return matched.replies[Math.floor(Math.random() * matched.replies.length)];
}

function appendMessage(chatBody, text, author, isVoice, audioUrl) {
  const message = document.createElement('div');
  message.className = `chat-message ${author === 'user' ? 'user' : 'bot'}`;

  if (isVoice && audioUrl) {
    const title = document.createElement('p');
    title.textContent = 'Голосовое сообщение';
    message.appendChild(title);

    const audio = document.createElement('audio');
    audio.controls = true;
    audio.src = audioUrl;
    message.appendChild(audio);
  } else {
    message.textContent = text;
  }

  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function initChat() {
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const chatBody = document.getElementById('chatBody');
  const recordButton = document.getElementById('recordVoiceBtn');

  if (!chatForm || !chatInput || !chatBody || !recordButton) return;

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage(chatBody, text, 'user');
    chatInput.value = '';

    const autoReply = getBotReply(text);
    setTimeout(() => appendMessage(chatBody, autoReply, 'bot'), 500);
  });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    recordButton.disabled = true;
    recordButton.textContent = 'Запись недоступна в браузере';
    return;
  }

  let mediaRecorder = null;
  let chunks = [];
  let stream = null;

  recordButton.addEventListener('click', async () => {
    try {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];

        mediaRecorder.addEventListener('dataavailable', (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        });

        mediaRecorder.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          appendMessage(chatBody, '', 'user', true, audioUrl);

          const voiceReplyOptions = [
            'Классное голосовое! Спасибо, что поделились.',
            'Прослушал сообщение. Обязательно учту ваш вопрос.',
            'Голосовое принято! Могу ответить подробнее в тексте.'
          ];
          const reply = voiceReplyOptions[Math.floor(Math.random() * voiceReplyOptions.length)];
          setTimeout(() => appendMessage(chatBody, reply, 'bot'), 700);

          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
        });

        mediaRecorder.start();
        recordButton.textContent = 'Остановить запись';
      } else {
        mediaRecorder.stop();
        recordButton.textContent = 'Записать голосовое';
      }
    } catch (error) {
      appendMessage(chatBody, 'Не получилось записать голосовое. Проверьте доступ к микрофону.', 'bot');
      recordButton.textContent = 'Записать голосовое';
    }
  });
}

window.onload = function () {
  updateFooterYear();
  initCursorGlow();
  initMap();
  initChat();
};
