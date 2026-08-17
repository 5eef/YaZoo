<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

class ApiProblemException extends HttpException
{
    public function __construct(
        int $statusCode,
        public readonly string $errorCode,
        string $message = '',
        ?\Throwable $previous = null,
        array $headers = [],
    ) {
        parent::__construct($statusCode, $message, $previous, $headers);
    }
}
