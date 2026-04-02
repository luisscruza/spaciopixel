<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'room_name' => ['required', 'string', 'max:40'],
        ]);

        $payload = [
            'user_id' => $request->user()->id,
            'username' => $request->user()->username,
            'avatar_config' => $request->user()->avatar_config,
            'room_name' => $data['room_name'],
            'exp' => now()->addMinutes(5)->timestamp,
        ];

        $encodedPayload = $this->base64UrlEncode(json_encode($payload, JSON_THROW_ON_ERROR));
        $signature = hash_hmac('sha256', $encodedPayload, $this->signingKey());

        return response()->json([
            'token' => $encodedPayload.'.'.$signature,
            'expires_at' => $payload['exp'],
        ]);
    }

    private function signingKey(): string
    {
        $configuredKey = config('app.key');

        if (str_starts_with($configuredKey, 'base64:')) {
            return base64_decode(substr($configuredKey, 7), true) ?: $configuredKey;
        }

        return $configuredKey;
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }
}
