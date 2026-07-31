<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VerifyEmailMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly User $recipient,
        public readonly string $verificationUrl,
        public readonly int $expiresInMinutes,
    ) {
        $this->afterCommit();
    }

    public function build(): self
    {
        return $this
            ->subject('Vérifiez votre adresse email YaZoo')
            ->text('emails.verify-email');
    }
}
