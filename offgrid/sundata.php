<?php
/**
 * Off-grid · proxy local para o SunData (CRESESB/CEPEL)
 * O navegador não consegue consultar o CRESESB direto (CORS). Este script faz a consulta
 * a partir do servidor PHP local e devolve o texto da página de resultado; o parser
 * (offgrid.js, função lerSunData) extrai as estações e as linhas mensais.
 * Uso:  sundata.php?lat=-31.77&lon=-52.34
 */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function sair(array $d, int $st = 200): void { http_response_code($st); echo json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }

$lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
$lon = filter_input(INPUT_GET, 'lon', FILTER_VALIDATE_FLOAT);
if ($lat === false || $lat === null || $lon === false || $lon === null) sair(['ok' => false, 'erro' => 'Informe lat e lon em graus decimais (sul e oeste negativos).'], 400);
if ($lat < -40 || $lat > 12 || $lon < -80 || $lon > -30) sair(['ok' => false, 'erro' => 'O SunData cobre latitude de 12° N a 40° S e longitude de 30° O a 80° O.'], 400);

// Campos do formulário SunData (coordenada em graus decimais). Se o CRESESB mudar o formulário,
// ajuste aqui: abra a página no navegador, use "Inspecionar" no formulário e copie os nomes dos campos.
$campos = [
  'section'       => 'sundata',
  'formato'       => '1',
  'lang'          => 'pt',
  'latitude_dec'  => number_format(abs($lat), 4, '.', ''),
  'latitude'      => number_format($lat, 4, '.', ''),
  'hemi_lat'      => $lat < 0 ? '0' : '1',
  'longitude_dec' => number_format(abs($lon), 4, '.', ''),
  'longitude'     => number_format($lon, 4, '.', ''),
  'hemi_long'     => '0',
];
$URL = 'https://cresesb.cepel.br/index.php?section=sundata';

function http(string $url, ?array $post): array {
  $ua = 'Mozilla/5.0 (UFPel Projeto Eletrico Agroindustrial - modulo off-grid)';
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 25,
      CURLOPT_USERAGENT => $ua, CURLOPT_ENCODING => '']);
    if ($post !== null) { curl_setopt($ch, CURLOPT_POST, true); curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post)); }
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    return [$body === false ? '' : (string)$body, $code, $err];
  }
  $opts = ['http' => ['method' => $post ? 'POST' : 'GET', 'header' => "User-Agent: $ua\r\nContent-Type: application/x-www-form-urlencoded\r\n",
    'content' => $post ? http_build_query($post) : '', 'timeout' => 25, 'ignore_errors' => true]];
  $body = @file_get_contents($url, false, stream_context_create($opts));
  $code = 0; if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) $code = (int)$m[1];
  return [$body === false ? '' : (string)$body, $code, $body === false ? 'falha de conexão' : ''];
}
function texto(string $html): string {
  if (!mb_check_encoding($html, 'UTF-8')) $html = mb_convert_encoding($html, 'UTF-8', 'ISO-8859-1');
  $html = preg_replace('#<(script|style)[^>]*>.*?</\1>#is', ' ', $html);
  $html = preg_replace('#</(td|th)>#i', ' | ', $html);
  $html = preg_replace('#<(br|/tr|/p|/div|/h\d|/li)[^>]*>#i', "\n", $html);
  $t = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
  $t = preg_replace("/[ \t\x{00A0}]+/u", ' ', $t);
  return trim(preg_replace("/\n\s*\n+/", "\n", $t));
}

$tentativas = [[$URL, $campos], [$URL . '&' . http_build_query($campos), null]];
$ultimo = '';
foreach ($tentativas as [$u, $p]) {
  [$body, $code, $err] = http($u, $p);
  if ($body === '') { $ultimo = $err ?: "HTTP $code"; continue; }
  $t = texto($body);
  if (preg_match('/Maior m[ií]nimo mensal/iu', $t)) sair(['ok' => true, 'fonte' => 'CRESESB/SunData', 'url' => $URL, 'consulta' => $campos, 'texto' => $t]);
  $ultimo = "HTTP $code: a página respondeu, mas sem a tabela de irradiação";
}
sair(['ok' => false, 'erro' => "Não foi possível obter a tabela do SunData ($ultimo). Use a consulta manual: abra o SunData, copie a tabela e cole na ferramenta."], 502);
