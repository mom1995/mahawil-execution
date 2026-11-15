<?php
/**
 * مزامنة أخبار صفحة مديرية تنفيذ قضاء المحاويل من فيسبوك
 * -----------------------------------------------------------
 * يجلب آخر منشورات الصفحة عبر Facebook Graph API ويعيدها للموقع بصيغة JSON،
 * مع تخزين مؤقت (10 دقائق) لتقليل الطلبات.
 *
 * الإعداد (مرة واحدة، من قبل مسؤول الصفحة):
 *  1. أنشئ تطبيقاً على https://developers.facebook.com
 *  2. احصل على "Page Access Token" طويل الأمد للصفحة بصلاحية pages_read_engagement
 *  3. ضع الرمز في متغير البيئة FB_PAGE_TOKEN على الاستضافة،
 *     أو في الملف fb-token.php بجانب هذا الملف:  <?php return 'TOKEN_HERE';
 *  4. (اختياري) ضع المعرّف الرقمي للصفحة في FB_PAGE_ID
 *
 * ⚠️ لا تضع الرمز داخل script.js أو أي ملف يصل إلى المتصفح.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=300');

$pageId = getenv('FB_PAGE_ID') ?: 'executionalmahawil';
$token  = getenv('FB_PAGE_TOKEN') ?: '';
if (!$token && is_file(__DIR__ . '/fb-token.php')) {
    $token = (string) include __DIR__ . '/fb-token.php';
}
if (!$token) {
    http_response_code(503);
    echo json_encode(['error' => 'not_configured']);
    exit;
}

$cacheFile = sys_get_temp_dir() . '/mahawil_fb_news.json';
$ttl = 600;
if (is_file($cacheFile) && time() - filemtime($cacheFile) < $ttl) {
    readfile($cacheFile);
    exit;
}

$url = 'https://graph.facebook.com/v21.0/' . rawurlencode($pageId) . '/posts?' . http_build_query([
    'fields'       => 'message,created_time,full_picture,permalink_url',
    'limit'        => 12,
    'access_token' => $token,
]);

$ctx = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
$raw = @file_get_contents($url, false, $ctx);
$data = $raw ? json_decode($raw, true) : null;

if (!$data || empty($data['data'])) {
    // عند فشل الاتصال نعيد آخر نسخة مخزنة إن وجدت
    if (is_file($cacheFile)) { readfile($cacheFile); exit; }
    http_response_code(502);
    echo json_encode(['error' => 'fetch_failed']);
    exit;
}

$posts = [];
foreach ($data['data'] as $p) {
    if (empty($p['message']) && empty($p['full_picture'])) continue;
    $posts[] = [
        'message' => $p['message'] ?? '',
        'date'    => $p['created_time'] ?? '',
        'image'   => $p['full_picture'] ?? '',
        'link'    => $p['permalink_url'] ?? 'https://www.facebook.com/executionalmahawil',
    ];
    if (count($posts) >= 6) break;
}

$json = json_encode(['updated' => date('c'), 'posts' => $posts], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
@file_put_contents($cacheFile, $json);
echo $json;
