<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VerifyEmailMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $recipient,
        public readonly string $verificationUrl,
        public readonly int $expiresInMinutes,
    ) {}

    public function build(): self
    {
        return $this
            ->subject('Vérifiez votre adresse email YaZoo')
            ->text('emails.verify-email');
    }
}
