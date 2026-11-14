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
2. Откройте **Settings → Secrets and variables → Actions** в GitHub и добавьте
   repository secret `TABRICA_AUTHORIZATION`. Укажите значение Authorization-заголовка,
   которое Tabrica требует для нового API-ключа. Секрет должен содержать его формат
   заголовка целиком; не вставляйте сам ключ в код, чат или обычные GitHub variables.
3. Адрес Worker будет показан в Cloudflare и будет выглядеть как
   `https://tmr-secure-api.<ваш-поддомен>.workers.dev`.
4. Запустите **Actions → Deploy TMR-Secure API → Run workflow** ещё раз. Workflow
   установит секрет в Worker и опубликует сайт уже с настроенным адресом API.

Домен сайта уже разрешён в настройке Worker. Прокси валидирует отзывы и не
позволяет браузеру обращаться к Tabrica напрямую с секретом. Workflow берёт
`TABRICA_AUTHORIZATION` из GitHub Secrets и загружает его в Worker. Для ротации
обновите secret в GitHub и повторно запустите workflow.
