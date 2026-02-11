
/*****  Ollama API client (local, single response) *****/

import axios from "axios";

// axios client for Ollama
export function createOllamaClient({ baseURL }) {
  return axios.create({
    baseURL,
    timeout: 60_000,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * response generation
 * @param {AxiosInstance} ollama        axios client
 * @param {Object} options
 * @param {string} options.model        model name (i.e "llama3")
 * @param {string} options.prompt       user prompt
 * @param {string} options.system       guardrails
 * @param {number} options.temperature  creativity factor
 * @returns {Promise<string>}           response
 */
export async function generateText(ollama, { model, prompt, system, temperature = 0.2 }) {
  const payload = {
    model,
    prompt,
    system,
    stream: false, //single response
    options: { temperature },
  };

  const { data } = await ollama.post("/api/generate", payload);

  // data.response contains final text
  return (data?.response ?? "").toString().trim();
}