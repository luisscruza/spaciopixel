<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FurnitureType extends Model
{
    protected $fillable = [
        'key',
        'name',
        'sprite_key',
        'category',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function roomFurniture(): HasMany
    {
        return $this->hasMany(RoomFurniture::class);
    }
}
