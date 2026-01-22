import type { ToolDefinition } from "../../types";
import { ToolType, ToolMaterial } from "../../types";

export const WOODEN_AXE: ToolDefinition = {
  id: "wooden_axe",
  numericId: 24, // BLOCK.WOODEN_AXE
  name: "Wooden Axe",
  description: "A basic axe made of wood",
  toolType: ToolType.AXE,
  material: ToolMaterial.WOOD,
  durability: 60,
  speedMultiplier: 2.0,
  damage: 3,
  color: "#B47850",
  stackSize: 1,
};
