const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.queryStringParameters?.userId || "anonymous";

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: `CONN#${connectionId}`,
        sk: "META",
        entityType: "WS_CONNECTION",
        userId,
        connectedAt: new Date().toISOString(),
        gsi2pk: `CONN#${connectionId}`,
        gsi2sk: "META",
      },
    })
  );

  return { statusCode: 200, body: "connected" };
};
