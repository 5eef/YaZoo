<?php

return [
    'required' => 'حقل :attribute مطلوب.',
    'email' => 'يجب أن يكون حقل :attribute بريداً إلكترونياً صالحاً.',
    'unique' => 'قيمة :attribute مستخدمة مسبقاً.',
    'confirmed' => 'تأكيد :attribute غير مطابق.',
    'string' => 'يجب أن يكون حقل :attribute نصاً.',
    'min' => ['string' => 'يجب أن يحتوي حقل :attribute على :min أحرف على الأقل.', 'numeric' => 'يجب ألا تقل قيمة :attribute عن :min.', 'array' => 'يجب أن يحتوي حقل :attribute على :min عناصر على الأقل.'],
    'max' => ['string' => 'يجب ألا يتجاوز حقل :attribute عدد :max أحرف.', 'numeric' => 'يجب ألا تتجاوز قيمة :attribute مقدار :max.', 'array' => 'يجب ألا يتجاوز حقل :attribute عدد :max عناصر.'],
    'exists' => 'القيمة المحددة لحقل :attribute غير صالحة.',
    'in' => 'القيمة المحددة لحقل :attribute غير صالحة.',
    'date' => 'يجب أن يكون حقل :attribute تاريخاً صالحاً.',
    'after' => 'يجب أن يكون حقل :attribute بعد :date.',
    'integer' => 'يجب أن يكون حقل :attribute عدداً صحيحاً.',
    'numeric' => 'يجب أن يكون حقل :attribute عدداً.',
    'array' => 'يجب أن يكون حقل :attribute قائمة.',
    'boolean' => 'يجب أن يكون حقل :attribute صحيحاً أو خطأ.',
    'attributes' => ['name' => 'الاسم', 'email' => 'البريد الإلكتروني', 'password' => 'كلمة المرور', 'password_confirmation' => 'تأكيد كلمة المرور', 'phone' => 'الهاتف', 'otp_code' => 'رمز التحقق', 'country' => 'البلد', 'city' => 'المدينة', 'device_name' => 'اسم الجهاز', 'preferred_locale' => 'اللغة'],
];
