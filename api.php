<?php
/**
 * Projeto Elétrico Agroindustrial — API local
 * Salva, lista, abre e exclui projetos (.json) na pasta ./projetos
 * Uso: na pasta do projeto, rode  php -S localhost:8000  e acesse http://localhost:8000
 */
declare(strict_types=1);
date_default_timezone_set('America/Sao_Paulo');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const PASTA = __DIR__ . DIRECTORY_SEPARATOR . 'projetos';
const LIMITE_BYTES = 60 * 1024 * 1024; // 60 MB (projetos com desenhos anexados)

function responder(array $dados, int $status = 200): void {
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function erro(string $msg, int $status = 400): void { responder(['erro' => $msg], $status); }

/** Converte um nome livre em nome de arquivo seguro: letras, números, - e _ */
function nomeSeguro(string $nome): string {
    $nome = preg_replace('/\.json$/i', '', trim($nome));
    if (function_exists('iconv')) {
        $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $nome);
        if ($t !== false) $nome = $t;
    }
    $nome = preg_replace('/[^A-Za-z0-9_-]+/', '-', $nome);
    $nome = trim((string)$nome, '-_');
    $nome = substr($nome, 0, 80);
    return $nome === '' ? 'projeto' : $nome;
}
/** Resolve um arquivo existente dentro de ./projetos (impede ../ e outros caminhos) */
function caminhoArquivo(string $arquivo): string {
    $base = basename($arquivo);
    if (!preg_match('/^[A-Za-z0-9_-]+\.json$/', $base)) erro('Nome de arquivo inválido.');
    return PASTA . DIRECTORY_SEPARATOR . $base;
}
function lerCorpo(): array {
    $raw = file_get_contents('php://input', false, null, 0, LIMITE_BYTES + 1);
    if ($raw === false || $raw === '') erro('Corpo da requisição vazio.');
    if (strlen($raw) > LIMITE_BYTES) erro('Projeto maior que o limite de 60 MB.', 413);
    $d = json_decode($raw, true);
    if (!is_array($d)) erro('JSON inválido.');
    return $d;
}

if (!is_dir(PASTA) && !@mkdir(PASTA, 0775, true)) erro('Não foi possível criar a pasta projetos/.', 500);

$acao = $_GET['acao'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($acao) {
    case 'status':
        responder(['ok' => true, 'php' => PHP_VERSION, 'pasta' => 'projetos/', 'gravavel' => is_writable(PASTA)]);

    case 'listar':
        $lista = [];
        foreach (glob(PASTA . DIRECTORY_SEPARATOR . '*.json') ?: [] as $f) {
            $obra = '';
            // lê só o início do arquivo para achar o nome da obra, sem carregar anexos grandes
            $ini = (string)file_get_contents($f, false, null, 0, 4096);
            if (preg_match('/"obra"\s*:\s*"((?:[^"\\\\]|\\\\.)*)"/u', $ini, $m)) $obra = (string)json_decode('"' . $m[1] . '"');
            $lista[] = [
                'arquivo' => basename($f),
                'obra' => $obra,
                'tamanho' => filesize($f),
                'atualizado' => date('d/m/Y H:i', (int)filemtime($f)),
                '_t' => filemtime($f),
            ];
        }
        usort($lista, fn($a, $b) => $b['_t'] <=> $a['_t']);
        foreach ($lista as &$l) unset($l['_t']);
        responder(['projetos' => $lista]);

    case 'abrir':
        $f = caminhoArquivo($_GET['arquivo'] ?? '');
        if (!is_file($f)) erro('Projeto não encontrado.', 404);
        $d = json_decode((string)file_get_contents($f), true);
        if (!is_array($d)) erro('Arquivo corrompido.', 500);
        responder(['projeto' => $d]);

    case 'salvar':
        if ($metodo !== 'POST') erro('Use POST.', 405);
        $d = lerCorpo();
        $proj = $d['projeto'] ?? null;
        if (!is_array($proj) || !isset($proj['circ']) || !is_array($proj['circ']) || !isset($proj['id'])) erro('Estrutura de projeto inválida.');
        $arquivo = nomeSeguro((string)($d['nome'] ?? 'projeto')) . '.json';
        $destino = PASTA . DIRECTORY_SEPARATOR . $arquivo;
        $tmp = $destino . '.tmp';
        $json = json_encode($proj, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false || file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $destino)) {
            @unlink($tmp);
            erro('Falha ao gravar o arquivo (verifique permissões da pasta projetos/).', 500);
        }
        responder(['ok' => true, 'arquivo' => $arquivo]);

    case 'excluir':
        if ($metodo !== 'POST') erro('Use POST.', 405);
        $d = lerCorpo();
        $f = caminhoArquivo((string)($d['arquivo'] ?? ''));
        if (!is_file($f)) erro('Projeto não encontrado.', 404);
        if (!unlink($f)) erro('Não foi possível excluir.', 500);
        responder(['ok' => true]);

    default:
        erro('Ação desconhecida. Use: status, listar, abrir, salvar, excluir.', 404);
}
