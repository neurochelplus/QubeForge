import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

export const STONE_SHOVEL: ToolDefinition = {
  id: "stone_shovel",
  numericId: 27, // BLOCK.STONE_SHOVEL
  name: "Stone Shovel",
  description: "A sturdy shovel made of stone",
  toolType: ToolType.SHOVEL,
  material: ToolMaterial.STONE,
  durability: 132,
  speedMultiplier: 4.0,
  damage: 3,
  color: "#7D7D7D",
  stackSize: 1,
};
