<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FurnitureType;
use Illuminate\Http\JsonResponse;

class FurnitureTypeController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(
            FurnitureType::query()
                ->where('is_active', true)
                ->orderBy('id')
                ->get()
        );
    }
}
