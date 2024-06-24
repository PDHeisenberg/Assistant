const { OpenAI } = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
const ASSISTANT_ID = process.env.ASSISTANT_ID;

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { message } = JSON.parse(event.body);
    console.log("Received message:", message);

    const thread = await openai.beta.threads.create();
    console.log("Thread created:", thread.id);

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    console.log("User message added to thread");

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });
    console.log("Run created:", run.id);

    let runStatus;
    let attempts = 0;
    const maxAttempts = 5;
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    do {
      await delay(2000); // Wait for 2 seconds before checking status
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log("Run status:", runStatus.status);
      attempts++;
    } while (runStatus.status !== "completed" && attempts < maxAttempts);

    if (runStatus.status !== "completed") {
      throw new Error("Run did not complete in time");
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastAssistantMessage = messages.data
      .filter(message => message.role === "assistant")
      .pop();

    if (!lastAssistantMessage) {
      throw new Error("No assistant message found");
    }

    console.log("Assistant reply:", lastAssistantMessage.content[0].text.value);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: lastAssistantMessage.content[0].text.value })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'An error occurred while processing your request.' })
    };
  }
};
