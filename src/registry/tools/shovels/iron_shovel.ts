import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

export const IRON_SHOVEL: ToolDefinition = {
  id: "iron_shovel",
  numericId: 34, // BLOCK.IRON_SHOVEL
  name: "Iron Shovel",
  description: "A powerful shovel made of iron",
  toolType: ToolType.SHOVEL,
  material: ToolMaterial.IRON,
  durability: 250,
  speedMultiplier: 8.0,
  damage: 4,
  color: "#E0E0E0",
  stackSize: 1,
};
