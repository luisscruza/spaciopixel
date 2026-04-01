<?php

namespace Database\Seeders;

use App\Models\Room;
use Illuminate\Database\Seeder;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        Room::query()->updateOrCreate(
            ['slug' => 'lobby'],
            [
                'name' => 'Lobby',
                'owner_user_id' => null,
                'width' => 10,
                'height' => 10,
                'max_users' => 20,
                'is_lobby' => true,
            ]
        );
    }
}
