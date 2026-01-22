import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

export const STONE_AXE: ToolDefinition = {
  id: "stone_axe",
  numericId: 25, // BLOCK.STONE_AXE
  name: "Stone Axe",
  description: "A sturdy axe made of stone",
  toolType: ToolType.AXE,
  material: ToolMaterial.STONE,
  durability: 132,
  speedMultiplier: 4.0,
  damage: 4,
  color: "#7D7D7D",
  stackSize: 1,
};
