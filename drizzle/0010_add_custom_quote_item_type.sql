ALTER TABLE `job_items`
  MODIFY COLUMN `item_type` enum(
    'cladding',
    'acoustic_panel',
    'floating_cabinet',
    'fireplace',
    'mirror',
    'marble_sheet',
    'tv_backdrop',
    'side_tower',
    'shelving',
    'custom_item'
  ) NOT NULL;
