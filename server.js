const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const Feedback = require('./models/Feedback');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/personal_page_db';

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function renderSubmissionsPage(items, success = false) {
  const rows = items.length
    ? items
        .map(
          (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(item.name)}</td>
              <td>${escapeHtml(item.email)}</td>
              <td>${escapeHtml(item.tel || '-')}</td>
              <td>${escapeHtml(item.topic)}</td>
              <td>${escapeHtml(item.message)}</td>
              <td>${item.contact === 'phone' ? 'Телефон' : 'Email'}</td>
              <td>${item.agree ? 'Да' : 'Нет'}</td>
              <td>${formatDate(item.createdAt)}</td>
            </tr>
          `
        )
        .join('')
    : `
      <tr>
        <td colspan="9">Пока нет ни одной записи.</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Полученные данные</title>
  <meta name="description" content="Список обращений, сохранённых в MongoDB." />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <a class="skip-link" href="#content">Перейти к основному содержимому</a>
  <div class="cursor-glow" id="cursorGlow" aria-hidden="true"></div>

  <header id="top" class="site-header">
    <div class="container">
      <h1>Полученные данные</h1>
      <p class="subtitle">Здесь отображаются все записи, сохранённые из веб-формы.</p>
    </div>
  </header>

  <nav class="site-nav" aria-label="Основная навигация">
    <div class="container">
      <ul>
        <li><a href="/">Главная</a></li>
        <li><a href="/feedback">Обратная связь</a></li>
        <li><a aria-current="page" href="/submissions">Полученные данные</a></li>
      </ul>
    </div>
  </nav>

  <main id="content" class="container">
    <section>
      <article class="card">
        ${success ? '<div class="status-success">Данные успешно сохранены в MongoDB.</div>' : ''}

        <div class="link-row">
          <a class="button-link" href="/feedback">Добавить новую запись</a>
          <a class="button-link secondary" href="/">Вернуться на главную</a>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Имя</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Тема</th>
                <th>Сообщение</th>
                <th>Связь</th>
                <th>Согласие</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </main>

  <footer class="site-footer">
    <div class="container">
      <p class="muted">Локальное приложение Node.js + MongoDB</p>
    </div>
  </footer>

  <script src="/app.js"></script>
</body>
</html>`;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/feedback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feedback.html'));
});

app.post('/feedback', async (req, res) => {
  try {
    const { name, email, tel, topic, message, contact, agree } = req.body;

    if (!name || !email || !topic || !message || !contact || !agree) {
      return res.status(400).send('Заполните все обязательные поля формы.');
    }

    await Feedback.create({
      name,
      email,
      tel,
      topic,
      message,
      contact,
      agree: true,
    });

    res.redirect('/submissions?success=1');
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
    res.status(500).send('Не удалось сохранить данные в базу.');
  }
});

app.get('/submissions', async (req, res) => {
  try {
    const items = await Feedback.find().sort({ createdAt: -1 }).lean();
    const html = renderSubmissionsPage(items, req.query.success === '1');
    res.send(html);
  } catch (error) {
    console.error('Ошибка при получении данных:', error);
    res.status(500).send('Не удалось получить данные из базы.');
  }
});

async function start() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log('MongoDB подключена');

    app.listen(PORT, () => {
      console.log(`Сервер запущен: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Ошибка запуска приложения:', error);
    process.exit(1);
  }
}

start();
