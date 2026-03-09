const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const gsiKey = `CONN#${connectionId}`;

  const subscriptions = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI2",
      KeyConditionExpression: "gsi2pk = :pk",
      ExpressionAttributeValues: {
        ":pk": gsiKey,
      },
    })
  );

  const items = subscriptions.Items || [];
  await Promise.all(
    items.map((item) =>
      ddb.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: {
            pk: item.pk,
            sk: item.sk,
          },
        })
      )
    )
  );

  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `CONN#${connectionId}`,
        sk: "META",
      },
    })
  );

  return { statusCode: 200, body: "disconnected" };
};
