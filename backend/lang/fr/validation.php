<?php

return [
    'required' => 'Le champ :attribute est obligatoire.',
    'email' => 'Le champ :attribute doit être une adresse email valide.',
    'unique' => 'Cette valeur de :attribute est déjà utilisée.',
    'confirmed' => 'La confirmation de :attribute ne correspond pas.',
    'string' => 'Le champ :attribute doit être un texte.',
    'min' => ['string' => 'Le champ :attribute doit contenir au moins :min caractères.', 'numeric' => 'Le champ :attribute doit être au moins :min.', 'array' => 'Le champ :attribute doit contenir au moins :min éléments.'],
    'max' => ['string' => 'Le champ :attribute ne doit pas dépasser :max caractères.', 'numeric' => 'Le champ :attribute ne doit pas dépasser :max.', 'array' => 'Le champ :attribute ne doit pas dépasser :max éléments.'],
    'exists' => 'La valeur choisie pour :attribute est invalide.',
    'in' => 'La valeur choisie pour :attribute est invalide.',
    'date' => 'Le champ :attribute doit être une date valide.',
    'after' => 'Le champ :attribute doit être postérieur à :date.',
    'integer' => 'Le champ :attribute doit être un nombre entier.',
    'numeric' => 'Le champ :attribute doit être un nombre.',
    'array' => 'Le champ :attribute doit être une liste.',
    'boolean' => 'Le champ :attribute doit être vrai ou faux.',
    'attributes' => ['name' => 'nom', 'email' => 'email', 'password' => 'mot de passe', 'password_confirmation' => 'confirmation du mot de passe', 'phone' => 'téléphone', 'otp_code' => 'code de vérification', 'country' => 'pays', 'city' => 'ville', 'device_name' => 'nom de l’appareil', 'preferred_locale' => 'langue'],
];
