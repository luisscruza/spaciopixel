<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'owner_user_id',
        'width',
        'height',
        'max_users',
        'is_lobby',
    ];

    protected function casts(): array
    {
        return [
            'is_lobby' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function furniture(): HasMany
    {
        return $this->hasMany(RoomFurniture::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }
}
