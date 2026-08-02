<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ContactMessage extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $senderEmail,
        public readonly string $contactSubject,
        public readonly string $contactBody,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            replyTo: [new Address($this->senderEmail)],
            subject: '[YaZoo Contact] '.$this->contactSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: nl2br(e(
                "De : {$this->senderEmail}\n\n"
                ."Objet : {$this->contactSubject}\n\n"
                ."Message :\n{$this->contactBody}",
            )),
        );
    }
}
