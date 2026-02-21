export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ reply: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "No valid message provided."
      });
    }

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content:
                "You are a gamified AI assistant helping to build a website. Respond concisely but creatively."
            },
            { role: "user", content: message }
          ]
        })
      }
    );

    /* --- HARD FAIL DETECTION --- */
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return res.status(500).json({
        reply: "Groq API error occurred.",
        debug: errorText
      });
    }

    const data = await groqResponse.json();

    /* --- SAFE EXTRACTION --- */
    const reply =
      data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === "string"
        ? data.choices[0].message.content.trim()
        : null;

    /* --- GUARANTEED RESPONSE --- */
    if (!reply) {
      return res.status(200).json({
        reply:
          "Groq responded, but returned no usable text. This may be due to quota limits or model availability."
      });
    }

    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({
      reply: "Server exception occurred while processing the request."
    });
  }
}
