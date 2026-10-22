Bonjour {{ $recipient->name }},

Vérifiez votre adresse email {{ config('app.name') }} en ouvrant ce lien dans les {{ $expiresInMinutes }} prochaines minutes :
{!! $verificationUrl !!}

Si vous n’avez pas demandé cette vérification, ignorez ce message.
