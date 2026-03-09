const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (_err) {
    return {};
  }
}

exports.handler = async (event) => {
  const body = parseBody(event);
  const action = body.action;
  const channelId = body.channelId;
  const connectionId = event.requestContext.connectionId;

  if (!action) {
    return { statusCode: 400, body: "Missing action" };
  }

  if (action === "subscribe" && channelId) {
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: `CHANNEL#${channelId}`,
          sk: `CONN#${connectionId}`,
          entityType: "WS_SUB",
          channelId,
          connectionId,
          gsi2pk: `CONN#${connectionId}`,
          gsi2sk: `CHANNEL#${channelId}`,
          createdAt: new Date().toISOString(),
        },
      })
    );

    return { statusCode: 200, body: "subscribed" };
  }

  if (action === "unsubscribe" && channelId) {
    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `CHANNEL#${channelId}`,
          sk: `CONN#${connectionId}`,
        },
      })
    );

    return { statusCode: 200, body: "unsubscribed" };
  }

  if (action === "ping") {
    return { statusCode: 200, body: "pong" };
  }

  return { statusCode: 400, body: "Unknown action" };
};
