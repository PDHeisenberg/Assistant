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
    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    });
    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } while (runStatus.status !== "completed");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastAssistantMessage = messages.data
      .filter(message => message.role === "assistant")
      .pop();

    // Get text-to-speech audio
    const ttsResponse = await fetch('/.netlify/functions/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lastAssistantMessage.content[0].text.value })
    });
    const { audio } = await ttsResponse.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        reply: lastAssistantMessage.content[0].text.value,
        audio: audio
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while processing your request.' })
    };
  }
};
