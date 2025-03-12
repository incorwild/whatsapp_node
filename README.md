# n8n-nodes-whatsapp

Этот пакет содержит узел n8n для WhatsApp API, который позволяет вам интегрировать функциональность WhatsApp в ваши рабочие процессы n8n.

## Установка

Для использования этого узла в вашей локальной установке n8n выполните:

```bash
npm install n8n-nodes-whatsapp
```

Для пользователей n8n.cloud, n8n.io, свяжитесь с сервисом поддержки для установки.

## Возможности

Узел WhatsApp предоставляет следующие возможности:

### Сообщения
- **Отправить сообщение**: отправка текстовых сообщений контактам
- **Отправить медиа**: отправка изображений, видео и других файлов контактам

### Чаты
- **Получить чат**: получение информации о конкретном чате
- **Получить все чаты**: получение списка всех активных чатов

### Контакты
- **Получить контакт**: получение информации о конкретном контакте
- **Получить все контакты**: получение списка всех контактов

### Триггеры
- **Триггер на новое сообщение**: запускает рабочий процесс при получении нового сообщения
- **Триггер на сообщение с ключевым словом**: запускает процесс только при получении сообщения с указанным ключевым словом

## Аутентификация

Этот узел использует whatsapp-web.js для подключения к API WhatsApp Web. При первом использовании узла вам будет необходимо отсканировать QR-код для аутентификации. После успешной аутентификации данные сессии могут быть сохранены для повторного использования.

## Использование

1. Добавьте узел WhatsApp в ваш рабочий процесс n8n
2. Настройте учетные данные WhatsApp API
3. Выберите ресурс и операцию, которую вы хотите выполнить
4. Настройте параметры для выбранной операции

## Примеры использования

### Отправка сообщения

1. Выберите ресурс "Сообщение"
2. Выберите операцию "Отправить"
3. Введите номер телефона получателя в формате международного номера без "+" (например, 79123456789)
4. Введите текст сообщения

### Получение всех чатов

1. Выберите ресурс "Чат"
2. Выберите операцию "Получить все"

### Использование триггера на входящие сообщения

1. Добавьте "WhatsApp Триггер" в начало рабочего процесса
2. Выберите тип триггера: "Новое сообщение" или "Сообщение с ключевым словом"
3. При выборе триггера с ключевым словом, укажите ключевое слово для фильтрации
4. При необходимости настройте фильтрацию контактов
5. Включите опцию "Включать медиа", если хотите получать содержимое медиафайлов

## Ограничения

- Для работы узла требуется активное подключение к интернету
- WhatsApp может блокировать автоматизированное использование, поэтому не злоупотребляйте API
- Номер телефона, используемый для аутентификации, должен иметь активную учетную запись WhatsApp
- Триггеры требуют постоянно запущенный экземпляр n8n для работы

## Зависимости

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js): библиотека для взаимодействия с WhatsApp Web
- [qrcode-terminal](https://www.npmjs.com/package/qrcode-terminal): для отображения QR-кода в терминале

## Лицензия

MIT 