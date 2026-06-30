insert into public.catalog_items (
  name,
  spaces,
  unit,
  pricing_mode,
  combined_unit_price,
  labor_unit_price,
  material_unit_price,
  description,
  active,
  sort_order
) values
  ('墙面基层处理', '["客厅/餐厅","主卧","次卧","阳台","全屋公区"]'::jsonb, 'm²', 'combined', 2800, 0, 0, '铲除、找平、基层修补', true, 0),
  ('乳胶漆涂刷', '["客厅/餐厅","主卧","次卧","阳台","全屋公区"]'::jsonb, 'm²', 'combined', 3600, 0, 0, '底漆+面漆两遍', true, 1),
  ('轻质隔墙砌筑', '["客厅/餐厅","厨房","卫生间","全屋公区"]'::jsonb, 'm²', 'split', 0, 4200, 3800, '包含砌块、砂浆和人工', true, 2),
  ('厨房防水', '["厨房","卫生间"]'::jsonb, 'm²', 'split', 0, 4500, 5000, '墙地面防水层施工', true, 3),
  ('卫生间瓷砖铺贴', '["卫生间","厨房"]'::jsonb, 'm²', 'split', 0, 5200, 6800, '墙砖、地砖铺贴及勾缝', true, 4),
  ('水电改造', '["厨房","卫生间","全屋公区"]'::jsonb, 'm', 'split', 0, 5800, 7200, '强弱电、给排水改造', true, 5),
  ('吊顶安装', '["客厅/餐厅","厨房","卫生间","阳台","全屋公区"]'::jsonb, 'm²', 'combined', 6800, 0, 0, '轻钢龙骨石膏板吊顶', true, 6),
  ('门套安装', '["主卧","次卧","客厅/餐厅","全屋公区"]'::jsonb, '套', 'combined', 12800, 0, 0, '成品门套安装', true, 7),
  ('阳台瓷砖铺贴', '["阳台"]'::jsonb, 'm²', 'split', 0, 5000, 6200, '地砖铺贴与收口', true, 8),
  ('开荒保洁', '["客厅/餐厅","主卧","次卧","厨房","卫生间","阳台","全屋公区"]'::jsonb, 'm²', 'combined', 1200, 0, 0, '交付前整体清洁', true, 9)
on conflict do nothing;
