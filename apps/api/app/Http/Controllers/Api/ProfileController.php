<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'username' => [
                'sometimes',
                'required',
                'string',
                'min:3',
                'max:24',
                'alpha_dash',
                Rule::unique('users', 'username')->ignore($user->id),
            ],
            'avatar_config' => ['sometimes', 'nullable', 'array'],
        ]);

        $user->fill($data);
        $user->save();

        return response()->json($user->fresh());
    }
}
