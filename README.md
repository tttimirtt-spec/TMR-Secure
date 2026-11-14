# TMR-Secure website

## Публикация

Сайт автоматически публикуется на GitHub Pages при обновлении ветки `main`:
https://tttimirtt-spec.github.io/TMR-Secure/

## Подключить безопасный API-прокси

Ключ Tabrica хранится только как секрет Cloudflare Worker. Не добавляйте его в файлы
сайта, GitHub Actions variables или чат. Ключ, который ранее был в HTML, отзовите и
создайте новый.

1. Создайте аккаунт Cloudflare и API token с правами **Workers Scripts: Edit** и
   **Account Settings: Read**. В GitHub откройте репозиторий
   **Settings → Secrets and variables → Actions** и добавьте repository secrets
   `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`.
2. Запустите **Actions → Deploy TMR-Secure API → Run workflow**. После появления
   Worker откройте в Cloudflare **Workers & Pages → tmr-secure-api → Settings →
   Variables and Secrets** и добавьте secret `TABRICA_AUTHORIZATION`. Укажите
   значение Authorization-заголовка, которое Tabrica требует для нового API-ключа.
   Секрет должен содержать его формат заголовка целиком; не вставляйте сам ключ
   в код или обычные GitHub variables.
3. Адрес Worker будет показан в Cloudflare и будет выглядеть как
   `https://tmr-secure-api.<ваш-поддомен>.workers.dev`.
4. В `js/config.js` укажите полученный публичный адрес, например:
   `window.TMR_API_BASE_URL = 'https://tmr-secure-api.<ваш-поддомен>.workers.dev';`
   Сохраните и отправьте изменение в ветку `main`. Pages обновится автоматически.

Домен сайта уже разрешён в настройке Worker. Прокси валидирует отзывы и не
позволяет браузеру обращаться к Tabrica напрямую с секретом. Ротация ключа
выполняется заменой Cloudflare secret `TABRICA_AUTHORIZATION`.
