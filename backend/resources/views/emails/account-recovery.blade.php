Bonjour {{ $recipient->name }},

Une réinitialisation du mot de passe de votre compte {{ config('app.name') }} a été demandée.

Ouvrez ce lien dans les {{ $expiresInMinutes }} prochaines minutes :
{{ $resetUrl }}

Si vous n’avez pas fait cette demande, ignorez ce message. Le lien est à usage unique.
