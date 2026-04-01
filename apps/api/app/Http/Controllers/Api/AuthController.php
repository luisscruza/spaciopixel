<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'username' => ['required', 'string', 'min:3', 'max:24', 'alpha_dash', 'unique:users,username'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user = User::create([
            'email' => $data['email'],
            'username' => $data['username'],
            'password' => $data['password'],
            'avatar_config' => [
                'body' => 'base',
                'top' => 'hoodie-blue',
                'hair' => 'short-brown',
            ],
        ]);

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 422);
        }

        return response()->json([
            'token' => $user->createToken('web')->plainTextToken,
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['status' => 'ok']);
    }
}
