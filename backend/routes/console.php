<?php

use App\Support\LegacyDataMigrator;
use App\Support\LegacyMediaMigrator;
use App\Support\MediaStorage;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use MongoDB\Driver\Command as MongoCommand;
use MongoDB\Driver\Manager as MongoManager;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('yazoo:doctor', function () {
    $defaultConnection = (string) config('database.default');
    $sqlitePath = (string) config('database.connections.sqlite.database');
    $mysqlHost = (string) config('database.connections.mysql.host');
    $mysqlPort = (string) config('database.connections.mysql.port');
    $mysqlDatabase = (string) config('database.connections.mysql.database');
    $mysqlUsername = (string) config('database.connections.mysql.username');
    $mediaDriver = (string) config('media.driver', 'filesystem');
    $mongoUri = (string) config('media.mongodb.uri', '');

    $displayedMysqlDatabase = str_ends_with($mysqlDatabase, '.sqlite')
        ? 'a configurer'
        : $mysqlDatabase;
    $displayedSqlitePath = str_ends_with($sqlitePath, '.sqlite')
        ? $sqlitePath
        : database_path('database.sqlite');

    $this->newLine();
    $this->info('YaZoo Doctor');
    $this->line('Date: '.now()->toDateTimeString());
    $this->line('Connexion par defaut: '.$defaultConnection);
    $this->newLine();

    $this->components->twoColumnDetail(
        'SQLite local',
        File::exists($displayedSqlitePath)
            ? 'OK - '.$displayedSqlitePath
            : 'Manquant - '.$displayedSqlitePath,
    );

    try {
        DB::connection('mysql')->getPdo();
        $mysqlStatus = 'OK';
    } catch (Throwable $exception) {
        $mysqlStatus = 'Echec - '.$exception->getMessage();
    }

    $this->components->twoColumnDetail(
        'MySQL',
        sprintf(
            '%s | %s@%s:%s / %s',
            $mysqlStatus,
            $mysqlUsername !== '' ? $mysqlUsername : '(vide)',
            $mysqlHost,
            $mysqlPort,
            $displayedMysqlDatabase,
        ),
    );

    $this->components->twoColumnDetail(
        'Extension pdo_mysql',
        extension_loaded('pdo_mysql') ? 'Disponible' : 'Absente',
    );

    $this->components->twoColumnDetail(
        'Extension mongodb',
        MediaStorage::isMongoDriverAvailable() ? 'Disponible' : 'Absente',
    );

    try {
        if ($mongoUri === '') {
            throw new RuntimeException('URI non configuree');
        }

        if (! MediaStorage::isMongoDriverAvailable()) {
            throw new RuntimeException('Extension absente');
        }

        $manager = new MongoManager($mongoUri);
        $manager->executeCommand('admin', new MongoCommand(['ping' => 1]));
        $mongoStatus = 'OK | database='.(string) config('media.mongodb.database', 'yazoo_media');
    } catch (Throwable $exception) {
        $mongoStatus = 'Echec | exception='.$exception::class;
    }

    $this->components->twoColumnDetail(
        'Serveur MongoDB',
        $mongoStatus,
    );

    $this->components->twoColumnDetail(
        'Driver media',
        $mediaDriver,
    );

    $this->newLine();
    $this->comment('Recommendations');

    if ($defaultConnection !== 'mysql') {
        $this->line('- La base active reste '.$defaultConnection.'. Passez a MySQL dans .env quand vos identifiants seront valides.');
    } else {
        $this->line('- La connexion active est deja sur MySQL.');
    }

    if (str_starts_with($mysqlStatus, 'Echec')) {
        $this->line('- MySQL tourne localement, mais les identifiants actuels ne permettent pas encore la connexion.');
    } else {
        $this->line('- MySQL est joignable avec la configuration actuelle.');
    }

    if (! MediaStorage::isMongoDriverAvailable()) {
        $this->line("- MongoDB n'est pas activable maintenant: l'extension PHP mongodb manque encore.");
    } elseif ($mediaDriver === 'mongodb') {
        $this->line('- MongoDB est actif pour le stockage media.');
    } else {
        $this->line('- L extension PHP mongodb est disponible pour une future activation media.');
    }

    if ($mediaDriver !== 'filesystem' && ! MediaStorage::isMongoDriverAvailable()) {
        $this->warn("Le driver media courant n'est pas utilisable tant que l'extension mongodb manque.");
    }

    $this->newLine();
})->purpose('Diagnostiquer l etat SQLite / MySQL / MongoDB du projet YaZoo');

Artisan::command('yazoo:migrate-legacy-data', function () {
    $this->newLine();
    $this->info('Migration legacy SQLite -> MySQL');

    $result = LegacyDataMigrator::migrateSqliteToMysql();

    $this->components->twoColumnDetail('Source SQLite', $result['legacy_database']);
    $this->newLine();

    foreach ($result['migrated'] as $table => $count) {
        $this->components->twoColumnDetail($table, (string) $count);
    }

    $this->newLine();
    $this->info('Migration des donnees terminee.');
})->purpose('Importer les anciennes donnees SQLite dans MySQL');

Artisan::command('yazoo:migrate-legacy-media', function () {
    $this->newLine();
    $this->info('Migration des medias legacy -> MongoDB');

    $summary = LegacyMediaMigrator::migrateFilesystemMediaToMongo();

    foreach ($summary as $section => $counters) {
        $this->line(strtoupper($section));

        foreach ($counters as $label => $value) {
            $this->components->twoColumnDetail('  '.$label, (string) $value);
        }

        $this->newLine();
    }

    $this->info('Migration des medias terminee.');
})->purpose('Migrer les anciens medias locaux vers MongoDB');
