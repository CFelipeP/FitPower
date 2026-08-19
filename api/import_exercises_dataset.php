<?php
/**
 * import_exercises_dataset.php
 * ─────────────────────────────────────────────────────────────────────────────
 * Imports the hasaneyldrm/exercises-dataset exercise catalog into FitPower's
 * `exercise_library` table as NEW rows, preserving existing data.
 *
 *   https://github.com/hasaneyldrm/exercises-dataset
 *
 * LICENSE NOTES
 * ─────────────
 *  - Exercise metadata, names, categories, body parts, equipment, targets,
 *    muscle groups and multilingual instructions: MIT (OK to use/modify/
 *    redistribute with attribution — MIT requires keeping the copyright
 *    notice; source_url preserves provenance).
 *  - Exercise MEDIA (images/ + videos/ GIFs): © Gym visual — NOT covered by
 *    MIT. This script does NOT download, hotlink or copy any media. The
 *    original media paths + attribution are stored in `media_reference` as
 *    provenance only. Enable media only after obtaining your own license
 *    from https://gymvisual.com/.
 *
 * USAGE
 * ─────
 *   php import_exercises_dataset.php --dry-run            (default: simulate)
 *   php import_exercises_dataset.php --import             (insert new rows)
 *   php import_exercises_dataset.php --import --data=path (custom dataset file)
 *   php import_exercises_dataset.php --report             (print last summary)
 *
 * IDEMPOTENT: re-running --import inserts 0 new rows (unique source+external_id).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── CLI args ─────────────────────────────────────────────────────────────────
$dryRun = !in_array('--import', $argv, true);
$dataFile = null;
foreach ($argv as $a) {
    if (str_starts_with($a, '--data=')) $dataFile = substr($a, 7);
}
if (in_array('--report', $argv, true)) $dryRun = true;

$DEFAULT_DATA = 'C:/Users/vanes/AppData/Local/Temp/opencode/exercises.json';
$SOURCE_NAME = 'github_exercises_dataset';
$SOURCE_URL  = 'https://github.com/hasaneyldrm/exercises-dataset';

// ── Load DB credentials from .env (independent of HTTP config.php) ──────────
$envFile = __DIR__ . '/.env';
$vars = [];
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        [$k, $v] = array_pad(explode('=', trim($line), 2), 2, '');
        $vars[$k] = $v;
    }
}
$DB_HOST = $vars['DB_HOST'] ?? 'localhost';
$DB_PORT = $vars['DB_PORT'] ?? '3306';
$DB_NAME = $vars['DB_NAME'] ?? 'fitpower';
$DB_USER = $vars['DB_USER'] ?? 'root';
$DB_PASS = $vars['DB_PASS'] ?? '';

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        global $DB_HOST, $DB_PORT, $DB_NAME, $DB_USER, $DB_PASS;
        $pdo = new PDO("mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4", $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

// ── Normalization helpers ────────────────────────────────────────────────────
/** Lowercase, trim, collapse whitespace, drop punctuation for name comparison. */
function normalizeName(string $name): string {
    $s = mb_strtolower(trim($name), 'UTF-8');
    $s = preg_replace('/[\x00-\x1F\x7F]/u', '', $s);
    $s = preg_replace('/[^\p{L}\p{N}]+/u', '', $s); // keep letters+digits only
    return $s;
}

/** Strip control chars / null bytes; basic HTML/script injection guard. */
function sanitizeText(?string $v): string {
    if ($v === null) return '';
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v);
    return trim($v);
}

function looksMalicious(string $s): bool {
    $low = mb_strtolower($s);
    return str_contains($low, '<script') || str_contains($low, 'javascript:')
        || str_contains($low, 'onerror=') || str_contains($low, 'onload=')
        || str_contains($low, '<?php');
}

// ── Load dataset ─────────────────────────────────────────────────────────────
if (!$dataFile) $dataFile = $DEFAULT_DATA;
if (!is_file($dataFile)) {
    fwrite(STDERR, "ERROR: dataset file not found: $dataFile\n");
    exit(1);
}
$raw = file_get_contents($dataFile);
$dataset = json_decode($raw, true);
if (!is_array($dataset)) {
    fwrite(STDERR, "ERROR: dataset is not a valid JSON array.\n");
    exit(1);
}

// ── Load current library state ───────────────────────────────────────────────
$db = db();
$existingRows = $db->query("SELECT id, name, source, external_id FROM exercise_library")->fetchAll();
$existingByName = [];   // normalized name => id
$existingBySource = []; // "source:external_id" => id
foreach ($existingRows as $r) {
    $existingByName[normalizeName($r['name'])] = (int)$r['id'];
    if ($r['source'] && $r['external_id'] !== null) {
        $existingBySource[$r['source'] . ':' . $r['external_id']] = (int)$r['id'];
    }
}

// ── Process records ──────────────────────────────────────────────────────────
$stats = ['total' => count($dataset), 'imported' => 0, 'duplicates' => 0,
          'potential' => 0, 'rejected' => 0, 'errors' => 0, 'skipped_media' => 0];
$potentialList = [];
$rejectedList = [];
$errorList = [];
$toInsert = [];

$seenNormalizedInDataset = [];
foreach ($dataset as $i => $ex) {
    $id = isset($ex['id']) ? (string)$ex['id'] : '';
    $name = sanitizeText($ex['name'] ?? '');
    $category = sanitizeText($ex['category'] ?? $ex['body_part'] ?? '');
    $equipment = sanitizeText($ex['equipment'] ?? '');
    $target = sanitizeText($ex['target'] ?? '');
    $muscleGroup = sanitizeText($ex['muscle_group'] ?? '');
    $secondary = $ex['secondary_muscles'] ?? [];
    if (!is_array($secondary)) $secondary = [];
    $instructions = $ex['instructions'] ?? [];
    if (!is_array($instructions)) $instructions = [];

    // ── Validation ──
    $rejectReason = null;
    if ($id === '' || !preg_match('/^[0-9]{1,10}$/', $id)) {
        $rejectReason = 'invalid external id';
    } elseif ($name === '') {
        $rejectReason = 'empty name';
    } elseif ($category === '') {
        $rejectReason = 'missing category/body_part';
    } elseif (looksMalicious($name) || looksMalicious($instructions['en'] ?? '')) {
        $rejectReason = 'suspicious content rejected';
    }
    if ($rejectReason) {
        $stats['rejected']++;
        $rejectedList[] = ['id' => $id, 'name' => $name, 'reason' => $rejectReason];
        continue;
    }

    // ── Dedup: idempotency (already imported from this source) ──
    $sourceKey = $SOURCE_NAME . ':' . $id;
    if (isset($existingBySource[$sourceKey])) {
        $stats['duplicates']++;
        continue;
    }

    // ── Dedup: exact normalized-name match vs existing library ──
    $norm = normalizeName($name);
    if (isset($existingByName[$norm])) {
        $stats['duplicates']++;
        continue;
    }

    // ── Dedup: potential duplicate within the dataset itself ──
    $isPotential = false;
    if (isset($seenNormalizedInDataset[$norm])) {
        $isPotential = true;
        $stats['potential']++;
        $potentialList[] = ['id' => $id, 'name' => $name, 'similar' => $seenNormalizedInDataset[$norm]];
    } else {
        $seenNormalizedInDataset[$norm] = $name;
    }

    // ── Map fields ──
    $instructionsEn = sanitizeText($instructions['en'] ?? '');
    $i18n = [];
    foreach (['en','es','it','tr','ru','zh','hi','pl','ko','fr'] as $lang) {
        if (isset($instructions[$lang])) $i18n[$lang] = sanitizeText($instructions[$lang]);
    }
    $secondaryJson = json_encode(array_values(array_unique(array_merge([$muscleGroup], $secondary))), JSON_UNESCAPED_UNICODE);
    $mediaRef = json_encode([
        'media_id' => $ex['media_id'] ?? null,
        'image' => $ex['image'] ?? null,
        'gif_url' => $ex['gif_url'] ?? null,
        'attribution' => $ex['attribution'] ?? '© Gym visual — https://gymvisual.com/',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $created = isset($ex['created_at']) && strtotime((string)$ex['created_at']) ? date('Y-m-d H:i:s', strtotime((string)$ex['created_at'])) : date('Y-m-d H:i:s');

    if (!empty($ex['image']) || !empty($ex['gif_url'])) {
        $stats['skipped_media']++; // media © Gym visual — provenance only, never bundled
    }

    $toInsert[] = [
        'name' => $name,
        'description' => null,
        'category' => mb_strtolower($category),
        'muscle_group' => mb_strtolower($target),
        'secondary_muscles' => $secondaryJson,
        'equipment' => mb_strtolower($equipment),
        'difficulty' => null, // dataset has no difficulty field — do not invent
        'instructions' => $instructionsEn,
        'instructions_i18n' => $i18n ? json_encode($i18n, JSON_UNESCAPED_UNICODE) : null,
        'image_url' => null,  // media © Gym visual — not bundled (license)
        'video_url' => null,  // media © Gym visual — not bundled (license)
        'media_reference' => $mediaRef,
        'source' => $SOURCE_NAME,
        'external_id' => $id,
        'source_url' => $SOURCE_URL,
        'calories_burned' => null,
        'created_at' => $created,
    ];
}

$stats['imported'] = count($toInsert);

// ── Report ───────────────────────────────────────────────────────────────────
function renderReport(array $stats, array $potential, array $rejected, array $errors): void {
    echo "════════════════════════════════════════════════════════════\n";
    echo " EXERCISE DATASET IMPORT — REPORT\n";
    echo "════════════════════════════════════════════════════════════\n";
    echo "Dataset total (records):     {$stats['total']}\n";
    echo "Found (valid candidates):    " . ($stats['total'] - $stats['rejected']) . "\n";
    echo "Imported (new rows):         {$stats['imported']}\n";
    echo "Duplicates (skipped):        {$stats['duplicates']}\n";
    echo "Potential duplicates:        {$stats['potential']}\n";
    echo "Rejected (invalid):          {$stats['rejected']}\n";
    echo "Errors:                      {$stats['errors']}\n";
    echo "Media skipped (© Gym visual):{$stats['skipped_media']}\n";
    if ($potential) {
        echo "\nPOTENTIAL_DUPLICATES (imported, verify later):\n";
        foreach ($potential as $p) echo "  - id {$p['id']} \"{$p['name']}\" ≈ \"{$p['similar']}\"\n";
    }
    if ($rejected) {
        echo "\nREJECTED:\n";
        foreach ($rejected as $r) echo "  - id {$r['id']} \"{$r['name']}\" → {$r['reason']}\n";
    }
    if ($errors) {
        echo "\nERRORS:\n";
        foreach ($errors as $e) echo "  - {$e}\n";
    }
    echo "════════════════════════════════════════════════════════════\n";
}

// ── Execute ──────────────────────────────────────────────────────────────────
if ($dryRun) {
    renderReport($stats, $potentialList, $rejectedList, $errorList);
    echo "\n[DRY RUN] No changes were made to the database.\n";
    echo "Run with --import to insert the {$stats['imported']} new exercises.\n";
    exit(0);
}

// IMPORT
$insertSql = "INSERT INTO exercise_library
    (name, description, category, muscle_group, secondary_muscles, equipment, difficulty,
     instructions, instructions_i18n, image_url, video_url, media_reference,
     source, external_id, source_url, calories_burned, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
$db->beginTransaction();
try {
    $stmt = $db->prepare($insertSql);
    foreach ($toInsert as $row) {
        $stmt->execute([
            $row['name'], $row['description'], $row['category'], $row['muscle_group'],
            $row['secondary_muscles'], $row['equipment'], $row['difficulty'],
            $row['instructions'], $row['instructions_i18n'], $row['image_url'], $row['video_url'],
            $row['media_reference'], $row['source'], $row['external_id'], $row['source_url'],
            $row['calories_burned'], $row['created_at'],
        ]);
    }
    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    fwrite(STDERR, "ERROR during import (rolled back): " . $e->getMessage() . "\n");
    exit(1);
}

renderReport($stats, $potentialList, $rejectedList, $errorList);
echo "\n[IMPORT OK] {$stats['imported']} exercises inserted into exercise_library.\n";
