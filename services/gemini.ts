import { GoogleGenAI } from "@google/genai";
import { MessageRole, ChatMessage } from '../types';

let genAI: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const SYSTEM_INSTRUCTION = `
You are an expert Physics Engine Developer and Math Tutor specializing in Computational Physics.
Your goal is to explain the "Projected Gauss-Seidel" (PGS) algorithm to a user experimenting with a rigid body physics simulation.

Key concepts to explain when asked:
- **Constraints**: conditions like "objects cannot penetrate" ($C(x) \ge 0$).
- **Jacobian Matrix (J)**: Maps body velocities to constraint space velocities.
- **Lagrange Multipliers ($\lambda$)**: Represents the magnitude of the impulse force needed to satisfy the constraint.
- **PGS Iteration**: Solving for $\lambda$ one constraint at a time, repeatedly, until the system converges.
- **Projection**: The "Projected" part means clamping $\lambda$ (e.g., $\lambda \ge 0$) because contacts can only push, not pull.
- **Warm Starting**: Using the previous frame's solution as the initial guess to speed up convergence.
- **Baumgarte Stabilization**: Adding a bias term to fix positional drift (penetration) by modifying the velocity constraint.

Keep answers concise, engaging, and suitable for a web developer or physics student. Use Markdown for math.
`;

export const sendMessageToGemini = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  if (!genAI) {
    return "Error: API_KEY is missing in the environment variables.";
  }

  try {
    const model = 'gemini-3-flash-preview';
    
    // Construct history for the chat model
    // We restart the chat object for statelessness in this simplified demo, 
    // or we could maintain a chat session instance.
    const chat = genAI.chats.create({
      model,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I encountered an error communicating with the AI model.";
  }
};
