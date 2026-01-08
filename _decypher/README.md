Файлы в этой папке используются локальным HTTPS-сервером и для тестирования маршрута `/decypher`.

Содержимое:
- `id_rsa` — приватный RSA-ключ, сгенерированный для тестов.
- `id_rsa.pub` — публичная часть RSA-ключа.
- `secret.txt` — тестовый открытый секрет (создан для примера).
- `secret.enc` — `secret.txt`, зашифрованный с помощью `id_rsa.pub` (OAEP).

Команды (выполнять внутри папки `certs`):

```bash
# сгенерировать пару RSA (если отсутствует)
openssl genrsa -out ./_decypher/id_rsa 2048
openssl rsa -in ./_decypher/id_rsa -pubout -out ./_decypher/id_rsa.pub

# создать тестовый секрет и зашифровать его публичным ключом (OAEP)
echo -n 'secret-in-certs' > ./_decypher/secret.txt
openssl rsautl -encrypt -oaep -inkey ./_decypher/id_rsa.pub -pubin -in ./_decypher/secret.txt -out ./_decypher/secret.enc

# отправить на локальный сервер /decypher (сервер должен быть запущен на https://localhost:3001)
curl -k -F key=@id_rsa -F secret=@secret.enc https://localhost:3001/decypher
```