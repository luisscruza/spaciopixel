<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function index(): JsonResponse
    {
        $rooms = Room::query()
            ->with('owner:id,username')
            ->orderByDesc('is_lobby')
            ->orderBy('name')
            ->get()
            ->map(fn (Room $room) => [
                'id' => $room->id,
                'name' => $room->name,
                'slug' => $room->slug,
                'width' => $room->width,
                'height' => $room->height,
                'max_users' => $room->max_users,
                'is_lobby' => $room->is_lobby,
                'owner' => $room->owner,
                'current_user_count' => 0,
            ]);

        return response()->json($rooms);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:40'],
        ]);

        $slug = Str::slug($data['name']);
        $baseSlug = $slug !== '' ? $slug : 'room';
        $slug = $baseSlug;
        $suffix = 2;

        while (Room::query()->where('slug', $slug)->exists()) {
            $slug = $baseSlug.'-'.$suffix;
            $suffix++;
        }

        $room = Room::create([
            'name' => $data['name'],
            'slug' => $slug,
            'owner_user_id' => $request->user()->id,
            'width' => 10,
            'height' => 10,
            'max_users' => 12,
            'is_lobby' => false,
        ]);

        return response()->json($room->load('owner:id,username'), 201);
    }
}
