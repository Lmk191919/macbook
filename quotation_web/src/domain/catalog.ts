export const DEFAULT_SPACE_NAMES = [
  "客厅/餐厅",
  "主卧",
  "次卧",
  "厨房",
  "卫生间",
  "阳台",
  "全屋公区",
] as const;

export type DefaultSpaceName = (typeof DEFAULT_SPACE_NAMES)[number];

export type CatalogSeedItem = Readonly<{
  name: string;
  spaces: readonly DefaultSpaceName[];
  unit: string;
  pricingMode: "combined" | "split";
  combinedUnitPrice: number;
  laborUnitPrice: number;
  materialUnitPrice: number;
  description?: string;
  notes?: string;
  active?: boolean;
  sortOrder?: number;
}>;

export const DEFAULT_CATALOG_ITEMS: readonly CatalogSeedItem[] = [
  {
    name: "墙面基层处理",
    spaces: ["客厅/餐厅", "主卧", "次卧", "阳台", "全屋公区"],
    unit: "m²",
    pricingMode: "combined",
    combinedUnitPrice: 2800,
    laborUnitPrice: 0,
    materialUnitPrice: 0,
    description: "铲除、找平、基层修补",
    sortOrder: 0,
  },
  {
    name: "乳胶漆涂刷",
    spaces: ["客厅/餐厅", "主卧", "次卧", "阳台", "全屋公区"],
    unit: "m²",
    pricingMode: "combined",
    combinedUnitPrice: 3600,
    laborUnitPrice: 0,
    materialUnitPrice: 0,
    description: "底漆+面漆两遍",
    sortOrder: 1,
  },
  {
    name: "轻质隔墙砌筑",
    spaces: ["客厅/餐厅", "厨房", "卫生间", "全屋公区"],
    unit: "m²",
    pricingMode: "split",
    combinedUnitPrice: 0,
    laborUnitPrice: 4200,
    materialUnitPrice: 3800,
    description: "包含砌块、砂浆和人工",
    sortOrder: 2,
  },
  {
    name: "厨房防水",
    spaces: ["厨房", "卫生间"],
    unit: "m²",
    pricingMode: "split",
    combinedUnitPrice: 0,
    laborUnitPrice: 4500,
    materialUnitPrice: 5000,
    description: "墙地面防水层施工",
    sortOrder: 3,
  },
  {
    name: "卫生间瓷砖铺贴",
    spaces: ["卫生间", "厨房"],
    unit: "m²",
    pricingMode: "split",
    combinedUnitPrice: 0,
    laborUnitPrice: 5200,
    materialUnitPrice: 6800,
    description: "墙砖、地砖铺贴及勾缝",
    sortOrder: 4,
  },
  {
    name: "水电改造",
    spaces: ["厨房", "卫生间", "全屋公区"],
    unit: "m",
    pricingMode: "split",
    combinedUnitPrice: 0,
    laborUnitPrice: 5800,
    materialUnitPrice: 7200,
    description: "强弱电、给排水改造",
    sortOrder: 5,
  },
  {
    name: "吊顶安装",
    spaces: ["客厅/餐厅", "厨房", "卫生间", "阳台", "全屋公区"],
    unit: "m²",
    pricingMode: "combined",
    combinedUnitPrice: 6800,
    laborUnitPrice: 0,
    materialUnitPrice: 0,
    description: "轻钢龙骨石膏板吊顶",
    sortOrder: 6,
  },
  {
    name: "门套安装",
    spaces: ["主卧", "次卧", "客厅/餐厅", "全屋公区"],
    unit: "套",
    pricingMode: "combined",
    combinedUnitPrice: 12800,
    laborUnitPrice: 0,
    materialUnitPrice: 0,
    description: "成品门套安装",
    sortOrder: 7,
  },
  {
    name: "阳台瓷砖铺贴",
    spaces: ["阳台"],
    unit: "m²",
    pricingMode: "split",
    combinedUnitPrice: 0,
    laborUnitPrice: 5000,
    materialUnitPrice: 6200,
    description: "地砖铺贴与收口",
    sortOrder: 8,
  },
  {
    name: "开荒保洁",
    spaces: ["客厅/餐厅", "主卧", "次卧", "厨房", "卫生间", "阳台", "全屋公区"],
    unit: "m²",
    pricingMode: "combined",
    combinedUnitPrice: 1200,
    laborUnitPrice: 0,
    materialUnitPrice: 0,
    description: "交付前整体清洁",
    sortOrder: 9,
  },
] as const;
