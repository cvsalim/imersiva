<?php
declare(strict_types=1);

// Copy to mail.php outside the public directory and use the provider's actual settings.
return [
    'host' => '',
    'port' => 465,
    'encryption' => 'smtps', // Use 'tls' for STARTTLS, usually on port 587.
    'username' => 'contato@imersivabr.com',
    'password' => '',
    'from' => 'contato@imersivabr.com',
    'to' => 'contato@imersivabr.com',
    'rate_key' => '', // Generate with: php -r "echo bin2hex(random_bytes(32));"
    'origin' => 'https://imersivabr.com',
];
