import { json } from "./client";
import type { InterpretResponse } from "../types";

export async function interpret(text: string): Promise<InterpretResponse> {
  return json<InterpretResponse>("/api/interpret", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

