<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ContactMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Symfony\Component\HttpKernel\Exception\ServiceUnavailableHttpException;

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
            throw new ServiceUnavailableHttpException(
                300,
                __('messages.contact.unavailable'),
            );
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
