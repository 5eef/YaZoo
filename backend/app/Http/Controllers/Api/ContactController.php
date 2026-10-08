<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    public function send(Request $request)
    {
        $recipient = trim((string) config('services.contact.recipient'));
        $mailer = (string) config('mail.default');

        if (
            $recipient === ''
            || (app()->isProduction() && in_array($mailer, ['log', 'array'], true))
        ) {
            return response()->json([
                'error' => 'server.internal',
                'message' => __('messages.contact.unavailable'),
            ], 503, ['Retry-After' => '300']);
        }

        $validated = Validator::make($request->all(), [
            'email' => 'required|email|max:255',
            'objet' => 'nullable|string|max:255',
            'message' => 'required|string|max:5000',
        ])->validate();

        Mail::to($recipient)->send(new ContactMessage(
            senderEmail: $validated['email'],
            contactSubject: $validated['objet'] ?? 'Nouveau message',
            contactBody: $validated['message'],
        ));

        return response()->json(['message' => __('messages.contact.sent')]);
    }
}
