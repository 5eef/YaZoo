<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class CreateAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'yazoo:create-admin
        {--name= : Name for a new admin}
        {--email= : Admin email address}
        {--promote : Promote an existing user instead of creating one}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create an admin user or promote an existing user safely';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->validatedEmail();

        if ($email === null) {
            return self::FAILURE;
        }

        $existingUser = User::query()->where('email', $email)->first();

        if ($existingUser) {
            return $this->promoteExistingUser($existingUser);
        }

        if ((bool) $this->option('promote')) {
            $this->error("Aucun utilisateur trouve avec l'email {$email}.");

            return self::FAILURE;
        }

        return $this->createAdmin($email);
    }

    protected function validatedEmail(): ?string
    {
        $email = trim((string) ($this->option('email') ?: $this->ask('Email admin')));
        $validator = Validator::make(['email' => $email], [
            'email' => ['required', 'email:rfc'],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first('email') ?? 'Email invalide.');

            return null;
        }

        return $email;
    }

    protected function promoteExistingUser(User $user): int
    {
        if ($user->is_admin) {
            $this->info("L'utilisateur {$user->email} est deja admin.");

            return self::SUCCESS;
        }

        if (! $this->confirm("Promouvoir {$user->email} en administrateur ?", false)) {
            $this->warn('Promotion annulee.');

            return self::FAILURE;
        }

        $user->forceFill(['is_admin' => true])->save();
        $this->info("Utilisateur promu admin: {$user->email}");

        return self::SUCCESS;
    }

    protected function createAdmin(string $email): int
    {
        $name = trim((string) ($this->option('name') ?: $this->ask('Nom admin')));
        $password = (string) $this->secret('Mot de passe admin');
        $confirmation = (string) $this->secret('Confirmer le mot de passe admin');

        $validator = Validator::make([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'password_confirmation' => $confirmation,
        ], [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        if ($validator->fails()) {
            $this->error($validator->errors()->first() ?? 'Donnees admin invalides.');

            return self::FAILURE;
        }

        if (! $this->confirm("Creer un administrateur pour {$email} ?", false)) {
            $this->warn('Creation annulee.');

            return self::FAILURE;
        }

        $admin = new User;
        $admin->fill([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'preferred_locale' => config('app.locale', 'fr'),
        ]);
        $admin->forceFill([
            'email_verified_at' => now(),
            'is_admin' => true,
        ])->save();

        $this->info("Administrateur cree: {$email}");

        return self::SUCCESS;
    }
}
