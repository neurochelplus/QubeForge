import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

export const WOODEN_SHOVEL: ToolDefinition = {
  id: "wooden_shovel",
  numericId: 26, // BLOCK.WOODEN_SHOVEL
  name: "Wooden Shovel",
  description: "A basic shovel made of wood",
  toolType: ToolType.SHOVEL,
  material: ToolMaterial.WOOD,
  durability: 60,
  speedMultiplier: 2.0,
  damage: 2,
  color: "#B47850",
  stackSize: 1,
};
