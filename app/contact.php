<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

function contact_settings(): array
{
    $settings = [
        'host' => getenv('SMTP_HOST') ?: '',
        'port' => getenv('SMTP_PORT') ?: '465',
        'encryption' => getenv('SMTP_ENCRYPTION') ?: 'smtps',
        'username' => getenv('SMTP_USERNAME') ?: '',
        'password' => getenv('SMTP_PASSWORD') ?: '',
        'from' => getenv('SMTP_FROM') ?: 'contato@imersivabr.com',
        'to' => 'contato@imersivabr.com',
        'rate_key' => getenv('CONTACT_RATE_KEY') ?: '',
        'storage' => getenv('CONTACT_STORAGE') ?: dirname(__DIR__) . '/var/contact',
        'origin' => getenv('CONTACT_ORIGIN') ?: 'https://imersivabr.com',
    ];
    $file = dirname(__DIR__) . '/config/mail.php';
    if (is_file($file)) {
        $custom = require $file;
        if (!is_array($custom)) {
            throw new RuntimeException('Invalid mail configuration.');
        }
        $settings = array_replace($settings, $custom);
    }
    return $settings;
}

function contact_validate(array $input): array
{
    // Missing type preserves compatibility with the first published quote form.
    $type = $input['type'] ?? 'quote';
    if (!is_string($type) || !in_array($type, ['contact', 'quote'], true)) {
        return [[], ['Selecione um tipo de contato válido.']];
    }
    $limits = [
        'type' => [0, 7, 'tipo de contato'],
        'name' => [2, 120, 'nome'],
        'school' => [$type === 'quote' ? 2 : 0, 180, 'escola'],
        'email' => [3, 254, 'e-mail'],
        'phone' => [0, 30, 'telefone'],
        'city' => [$type === 'quote' ? 2 : 0, 120, 'cidade'],
        'audience' => [0, 80, 'etapa de ensino'],
        'students' => [0, 6, 'estimativa de alunos'],
        'period' => [0, 120, 'período desejado'],
        'message' => [10, 4000, 'mensagem'],
        'website' => [0, 0, 'campo de proteção'],
    ];
    $input['type'] = $type;
    $data = [];
    $errors = [];
    foreach ($limits as $field => [$min, $max, $label]) {
        if (isset($input[$field]) && !is_string($input[$field])) {
            $errors[] = "O campo {$label} é inválido.";
            continue;
        }
        $value = trim($input[$field] ?? '');
        $length = preg_match_all('/./us', $value);
        if ($length === false || $length < $min || $length > $max) {
            $errors[] = "Verifique o campo {$label} (entre {$min} e {$max} caracteres).";
        }
        if ($field !== 'message' && preg_match('/[\r\n\x00-\x1f\x7f]/', $value)) {
            $errors[] = "O campo {$label} contém caracteres inválidos.";
        }
        if ($field === 'message' && preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/', $value)) {
            $errors[] = 'A mensagem contém caracteres inválidos.';
        }
        $data[$field] = $value;
    }
    if (!filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Informe um endereço de e-mail válido.';
    }
    $audiences = ['', 'Educação Infantil', 'Ensino Fundamental', 'Ensino Médio', 'Várias etapas', 'Outros', 'A definir'];
    if (!in_array($data['audience'] ?? '', $audiences, true)) {
        $errors[] = 'Selecione uma etapa de ensino válida.';
    }
    if (($data['students'] ?? '') !== '' &&
        (!ctype_digit($data['students']) || (int) $data['students'] < 1 || (int) $data['students'] > 100000)) {
        $errors[] = 'A estimativa de alunos deve ser um número entre 1 e 100000.';
    }
    if (($data['phone'] ?? '') !== '' && !preg_match('/^[+()\d .-]{6,30}$/', $data['phone'])) {
        $errors[] = 'Verifique o telefone informado.';
    }
    return [$data, array_values(array_unique($errors))];
}

function contact_check_settings(array $settings): void
{
    foreach (['host', 'username', 'password', 'from', 'to', 'rate_key', 'storage', 'origin'] as $key) {
        if (!isset($settings[$key]) || !is_string($settings[$key]) || $settings[$key] === '') {
            throw new RuntimeException('Incomplete mail configuration.');
        }
    }
    if (strlen($settings['rate_key']) < 32 ||
        !filter_var($settings['from'], FILTER_VALIDATE_EMAIL) ||
        !filter_var($settings['to'], FILTER_VALIDATE_EMAIL) ||
        !in_array($settings['encryption'], ['smtps', 'tls', 'none'], true) ||
        !ctype_digit((string) $settings['port']) ||
        (int) $settings['port'] < 1 || (int) $settings['port'] > 65535) {
        throw new RuntimeException('Invalid mail configuration.');
    }
    // Unencrypted SMTP is limited to the loopback integration-test server.
    if ($settings['encryption'] === 'none' && !in_array($settings['host'], ['127.0.0.1', '::1'], true)) {
        throw new RuntimeException('Unencrypted remote SMTP is not allowed.');
    }
}

function contact_same_origin(array $server, string $expected): bool
{
    if (($server['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
        return false;
    }
    $origin = $server['HTTP_ORIGIN'] ?? '';
    if ($origin !== '') {
        return hash_equals($expected, $origin);
    }
    $referer = $server['HTTP_REFERER'] ?? '';
    if ($referer !== '') {
        $parts = parse_url($referer);
        if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])) {
            return false;
        }
        $refererOrigin = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
        return hash_equals($expected, $refererOrigin);
    }
    // A public contact form must also work in browsers that omit these headers.
    return true;
}

function contact_rate_limit(string $directory, string $ip, string $key): bool
{
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        throw new RuntimeException('Could not create rate storage.');
    }
    $now = time();
    $window = 900;
    $checked = 0;
    foreach (new DirectoryIterator($directory) as $entry) {
        if (++$checked > 1000) {
            break;
        }
        if ($entry->isFile() && preg_match('/^[a-f0-9]{64}\.json$/', $entry->getFilename()) &&
            $entry->getMTime() < $now - $window) {
            $stale = fopen($entry->getPathname(), 'r+');
            if ($stale === false) {
                throw new RuntimeException('Could not open expired rate record.');
            }
            if (flock($stale, LOCK_EX | LOCK_NB)) {
                // Recheck after locking: another request may have renewed the record.
                $current = fstat($stale);
                if ($current === false) {
                    flock($stale, LOCK_UN);
                    fclose($stale);
                    throw new RuntimeException('Could not inspect expired rate record.');
                }
                if ($current['mtime'] < $now - $window && !ftruncate($stale, 0)) {
                    flock($stale, LOCK_UN);
                    fclose($stale);
                    throw new RuntimeException('Could not clear expired rate record.');
                }
                flock($stale, LOCK_UN);
            }
            fclose($stale);
        }
    }
    $file = $directory . '/' . hash_hmac('sha256', $ip, $key) . '.json';
    $handle = fopen($file, 'c+');
    if ($handle === false) {
        throw new RuntimeException('Could not open rate storage.');
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('Could not lock rate storage.');
        }
        $raw = stream_get_contents($handle);
        if ($raw === false) {
            throw new RuntimeException('Could not read rate storage.');
        }
        $record = $raw === '' ? ['start' => $now, 'count' => 0] : json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($record) || !isset($record['start'], $record['count']) ||
            !is_int($record['start']) || !is_int($record['count'])) {
            throw new RuntimeException('Invalid rate record.');
        }
        if ($record['start'] <= $now - $window) {
            $record = ['start' => $now, 'count' => 0];
        }
        if ($record['count'] >= 5) {
            return false;
        }
        $record['count']++;
        $encoded = json_encode($record, JSON_THROW_ON_ERROR);
        if (!rewind($handle) || !ftruncate($handle, 0) || fwrite($handle, $encoded) !== strlen($encoded) || !fflush($handle)) {
            throw new RuntimeException('Could not update rate storage.');
        }
        return true;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function contact_send(array $data, array $settings): void
{
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $settings['host'];
    $mail->Port = (int) $settings['port'];
    $mail->SMTPAuth = true;
    $mail->Username = $settings['username'];
    $mail->Password = $settings['password'];
    $mail->SMTPSecure = $settings['encryption'] === 'none' ? '' : $settings['encryption'];
    $mail->SMTPAutoTLS = $settings['encryption'] !== 'none';
    $mail->Timeout = 12;
    $mail->Timelimit = 18;
    $mail->CharSet = 'UTF-8';
    $mail->setFrom($settings['from'], 'Site IMERSIVA');
    $mail->addAddress($settings['to']);
    $mail->addReplyTo($data['email'], $data['name']);
    $mail->Subject = $data['type'] === 'quote' ? 'Nova solicitação de orçamento — IMERSIVA' : 'Nova mensagem de contato — IMERSIVA';
    $labels = [
        'name' => 'Responsável', 'school' => 'Escola', 'email' => 'E-mail',
        'phone' => 'Telefone', 'city' => 'Cidade', 'audience' => 'Etapa de ensino',
        'students' => 'Estimativa de alunos', 'period' => 'Período desejado', 'message' => 'Mensagem',
    ];
    if ($data['type'] === 'contact') {
        $labels = array_intersect_key($labels, array_flip(['name', 'email', 'phone', 'message']));
    }
    $lines = [$data['type'] === 'quote' ? 'Tipo: Pedido de orçamento' : 'Tipo: Fale conosco', ''];
    foreach ($labels as $field => $label) {
        $lines[] = $label . ': ' . ($data[$field] !== '' ? $data[$field] : 'Não informado');
    }
    $mail->Body = implode("\n\n", $lines);
    $mail->send();
}

function contact_response(int $status, string $message, array $errors = []): never
{
    http_response_code($status);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $status === 200, 'message' => $message, 'errors' => $errors], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        $title = $status === 200 ? 'Solicitação enviada' : 'Não foi possível enviar';
        $escape = static fn(string $text): string => htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        echo '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>' . $title . ' | IMERSIVA</title><link rel="stylesheet" href="/assets/site.css"><main class="response-page container"><p class="eyebrow">IMERSIVA · Contato</p><h1>' . $title . '</h1><p>' . $escape($message) . '</p>';
        if ($errors !== []) {
            echo '<ul>';
            foreach ($errors as $error) {
                echo '<li>' . $escape($error) . '</li>';
            }
            echo '</ul>';
        }
        echo '<p>Você também pode escrever para <a href="mailto:contato@imersivabr.com">contato@imersivabr.com</a> ou usar o <a href="https://wa.me/5512991788438">WhatsApp</a>.</p><a class="button" href="/contato/">Voltar ao contato ↗</a></main></html>';
    }
    exit;
}

function contact_handle(): never
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        header('Allow: POST');
        contact_response(405, 'Use o formulário de contato para enviar sua solicitação.');
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) {
        contact_response(413, 'O conteúdo enviado é muito grande. Reduza a mensagem e tente novamente.');
    }
    [$data, $errors] = contact_validate($_POST);
    if ($errors !== []) {
        contact_response(422, 'Revise os campos indicados antes de enviar. ' . implode(' ', $errors), $errors);
    }
    try {
        $settings = contact_settings();
        contact_check_settings($settings);
        if (!contact_same_origin($_SERVER, $settings['origin'])) {
            contact_response(403, 'Envie sua solicitação diretamente pelo formulário do site IMERSIVA.');
        }
        if (!contact_rate_limit($settings['storage'], $_SERVER['REMOTE_ADDR'] ?? 'unknown', $settings['rate_key'])) {
            header('Retry-After: 900');
            contact_response(429, 'Muitas tentativas em pouco tempo. Aguarde 15 minutos ou fale com a equipe por e-mail ou WhatsApp.');
        }
        $autoload = dirname(__DIR__) . '/vendor/autoload.php';
        if (!is_file($autoload)) {
            throw new RuntimeException('Mail dependency is not installed.');
        }
        require_once $autoload;
        contact_send($data, $settings);
    } catch (MailException $error) {
        error_log('[IMERSIVA contact] SMTP delivery failed; code=' . $error->getCode());
        contact_response(503, 'O serviço de e-mail não confirmou o envio. Tente novamente mais tarde ou fale com a equipe por e-mail ou WhatsApp.');
    } catch (RuntimeException | JsonException $error) {
        error_log('[IMERSIVA contact] Service unavailable; type=' . get_class($error) . '; code=' . $error->getCode());
        contact_response(503, 'O formulário está temporariamente indisponível. Fale com a equipe por e-mail ou WhatsApp.');
    }
    contact_response(200, $data['type'] === 'quote'
        ? 'Solicitação enviada! A equipe da IMERSIVA dará continuidade à conversa pelo contato informado. O envio ainda não confirma uma reserva.'
        : 'Mensagem enviada! A equipe da IMERSIVA dará continuidade à conversa pelo contato informado.');
}
