<?php
declare(strict_types=1);

$handler = dirname(__DIR__, 2) . '/app/contact.php';
if (!is_file($handler)) {
    error_log('[IMERSIVA contact] Private handler not installed.');
    http_response_code(503);
    header('Cache-Control: no-store');
    if (str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => false, 'message' => 'O formulário está indisponível. Escreva para contato@imersivabr.com ou fale pelo WhatsApp (12) 99178-8438.']);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Contato indisponível | IMERSIVA</title><h1>O formulário está indisponível</h1><p>Escreva para <a href="mailto:contato@imersivabr.com">contato@imersivabr.com</a> ou use o <a href="https://wa.me/5512991788438">WhatsApp</a>.</p><a href="/contato/">Voltar ao contato</a></html>';
    }
    exit;
}
require $handler;
contact_handle();
