<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function respond(int $status, bool $ok, string $message): void
{
    http_response_code($status);
    echo json_encode(
        ['ok' => $ok, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Método no permitido.');
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength <= 0 || $contentLength > 20000) {
    respond(413, false, 'Solicitud no válida.');
}

$host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    if ($originHost === '' || !hash_equals($host, $originHost)) {
        respond(403, false, 'Origen no permitido.');
    }
}

$contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
if (strpos($contentType, 'application/json') !== 0) {
    respond(415, false, 'Formato no permitido.');
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    respond(400, false, 'Solicitud no válida.');
}

$text = static function (string $key, int $maxLength) use ($payload): string {
    $value = trim((string) ($payload[$key] ?? ''));
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $maxLength, 'UTF-8');
    }
    return substr($value, 0, $maxLength);
};

$website = $text('website', 200);
if ($website !== '') {
    respond(200, true, 'Gracias. Recibimos tu solicitud.');
}

$startedAt = (int) ($payload['startedAt'] ?? 0);
if ($startedAt <= 0 || (time() * 1000 - $startedAt) < 2500) {
    respond(429, false, 'Espera un momento y vuelve a intentarlo.');
}

$name = $text('name', 100);
$email = $text('email', 160);
$phone = $text('phone', 30);
$company = $text('company', 120);
$service = $text('service', 40);
$message = $text('message', 2000);

if ($name === '' || $company === '' || $phone === '' || $message === '') {
    respond(422, false, 'Completa todos los campos obligatorios.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, false, 'Ingresa un correo electrónico válido.');
}

if (!preg_match('/^[0-9+().\s-]{7,30}$/', $phone)) {
    respond(422, false, 'Ingresa un teléfono válido.');
}

if (preg_match('/[\r\n]/', $name . $email)) {
    respond(422, false, 'Datos no válidos.');
}

$services = [
    'general' => 'Consulta general / Cotización',
    'ptar' => 'Plantas de tratamiento de agua (PTAR)',
    'torres' => 'Torres de enfriamiento',
    'calderas' => 'Sistemas de calderas',
    'osmosis' => 'Ósmosis inversa y filtración',
    'kurita' => 'Soluciones y químicos Kurita',
    'efluentes' => 'Post tratamiento y efluentes',
    'otro' => 'Otro requerimiento especial',
];
$serviceLabel = $services[$service] ?? $services['general'];

session_start([
    'cookie_httponly' => true,
    'cookie_secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'cookie_samesite' => 'Strict',
    'use_strict_mode' => true,
]);

$now = time();
if (isset($_SESSION['aquara_contact_sent_at']) && ($now - (int) $_SESSION['aquara_contact_sent_at']) < 30) {
    respond(429, false, 'Espera unos segundos antes de enviar otra solicitud.');
}

$subject = 'Nueva solicitud web - ' . $serviceLabel;
$body = implode("\n", [
    'Nueva solicitud recibida desde aquaraws.com',
    '',
    'Nombre: ' . $name,
    'Correo: ' . $email,
    'Teléfono / WhatsApp: ' . $phone,
    'Empresa: ' . $company,
    'Servicio: ' . $serviceLabel,
    '',
    'Mensaje:',
    $message,
    '',
    'Fecha: ' . date('Y-m-d H:i:s T'),
]);

$headers = [
    'From: Aquara Website <hola@aquaraws.com>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . PHP_VERSION,
];

$sent = mail(
    'hola@aquaraws.com',
    $subject,
    $body,
    implode("\r\n", $headers)
);

if (!$sent) {
    error_log('Aquara contact form: mail delivery failed.');
    respond(503, false, 'No pudimos enviar tu mensaje. Escríbenos a hola@aquaraws.com.');
}

$_SESSION['aquara_contact_sent_at'] = $now;
respond(200, true, 'Gracias. Recibimos tu solicitud.');
