<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FurnitureTypeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RealtimeTokenController;
use App\Http\Controllers\Api\RoomController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['status' => 'ok']);

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/rooms', [RoomController::class, 'index']);
Route::get('/furniture-types', [FurnitureTypeController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', fn (Request $request) => $request->user());
    Route::get('/me', [ProfileController::class, 'show']);
    Route::patch('/me', [ProfileController::class, 'update']);
    Route::post('/rooms', [RoomController::class, 'store']);
    Route::post('/realtime/token', [RealtimeTokenController::class, 'store']);
});
