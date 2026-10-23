<?php

return [
    'required' => 'The :attribute field is required.',
    'email' => 'The :attribute field must be a valid email address.',
    'unique' => 'This :attribute is already in use.',
    'confirmed' => 'The :attribute confirmation does not match.',
    'string' => 'The :attribute field must be text.',
    'min' => ['string' => 'The :attribute field must have at least :min characters.', 'numeric' => 'The :attribute field must be at least :min.', 'array' => 'The :attribute field must have at least :min items.'],
    'max' => ['string' => 'The :attribute field must not exceed :max characters.', 'numeric' => 'The :attribute field must not exceed :max.', 'array' => 'The :attribute field must not exceed :max items.'],
    'exists' => 'The selected :attribute is invalid.',
    'in' => 'The selected :attribute is invalid.',
    'date' => 'The :attribute field must be a valid date.',
    'after' => 'The :attribute field must be after :date.',
    'integer' => 'The :attribute field must be an integer.',
    'numeric' => 'The :attribute field must be a number.',
    'array' => 'The :attribute field must be a list.',
    'boolean' => 'The :attribute field must be true or false.',
    'attributes' => ['name' => 'name', 'email' => 'email', 'password' => 'password', 'password_confirmation' => 'password confirmation', 'phone' => 'phone', 'otp_code' => 'verification code', 'country' => 'country', 'city' => 'city', 'device_name' => 'device name', 'preferred_locale' => 'language'],
];
