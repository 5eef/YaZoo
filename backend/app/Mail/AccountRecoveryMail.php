<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AccountRecoveryMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $recipient,
        public readonly string $resetUrl,
        public readonly int $expiresInMinutes,
    ) {}

    public function build(): self
    {
        return $this
            ->subject('Réinitialisation de votre mot de passe YaZoo')
            ->text('emails.account-recovery');
    }
}
