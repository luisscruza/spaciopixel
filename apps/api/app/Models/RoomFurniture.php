<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoomFurniture extends Model
{
    protected $table = 'room_furniture';

    protected $fillable = [
        'room_id',
        'furniture_type_id',
        'x',
        'y',
        'placed_by_user_id',
    ];

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function furnitureType(): BelongsTo
    {
        return $this->belongsTo(FurnitureType::class);
    }

    public function placedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'placed_by_user_id');
    }
}
