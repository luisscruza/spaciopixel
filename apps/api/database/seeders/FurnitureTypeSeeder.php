<?php

namespace Database\Seeders;

use App\Models\FurnitureType;
use Illuminate\Database\Seeder;

class FurnitureTypeSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['key' => 'chair', 'name' => 'Chair', 'sprite_key' => 'chair-basic'],
            ['key' => 'table', 'name' => 'Table', 'sprite_key' => 'table-basic'],
            ['key' => 'plant', 'name' => 'Plant', 'sprite_key' => 'plant-basic'],
            ['key' => 'screen', 'name' => 'Screen', 'sprite_key' => 'screen-basic'],
            ['key' => 'sofa', 'name' => 'Sofa', 'sprite_key' => 'sofa-basic'],
        ];

        foreach ($items as $item) {
            FurnitureType::query()->updateOrCreate(
                ['key' => $item['key']],
                $item + ['category' => 'basic', 'is_active' => true]
            );
        }
    }
}
