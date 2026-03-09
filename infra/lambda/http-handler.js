const { randomUUID } = require("node:crypto");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  BatchGetCommand,
  BatchWriteCommand,
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || "us-west-2";
const WS_API_ENDPOINT = (process.env.WS_API_ENDPOINT || "")
  .replace(/^wss:/, "https:")
  .replace(/\/$/, "");
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: AWS_REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({ region: AWS_REGION });
const wsClient = WS_API_ENDPOINT
  ? new ApiGatewayManagementApiClient({ endpoint: WS_API_ENDPOINT })
  : null;

function buildCorsHeaders(event) {
  const origin = event?.headers?.origin || event?.headers?.Origin;
  const allowOrigin =
    CORS_ORIGINS.length === 0
      ? "*"
      : CORS_ORIGINS.includes(origin)
      ? origin
      : CORS_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE,PATCH",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function response(arg1, arg2, arg3) {
  // Backward-compatible signature support:
  // response(event, statusCode, body) and response(statusCode, body)
  const hasEvent = typeof arg1 !== "number";
  const event = hasEvent ? arg1 : undefined;
  const statusCode = hasEvent ? arg2 : arg1;
  const body = hasEvent ? arg3 : arg2;

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...buildCorsHeaders(event),
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch (_err) {
    return {};
  }
}

function currentUser(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims || {};
  return {
    userId: claims.sub,
    email: claims.email,
  };
}

async function getItem(pk, sk) {
  const out = await ddb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk },
    })
  );
  return out.Item || null;
}

async function queryAll(params) {
  const items = [];
  let lastKey;
  do {
    const out = await ddb.send(
      new QueryCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(out.Items || []));
    lastKey = out.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function queryStartsWith(pk, prefix, options = {}) {
  return queryAll({
    TableName: TABLE_NAME,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
    ExpressionAttributeValues: {
      ":pk": pk,
      ":prefix": prefix,
    },
    ScanIndexForward: options.scanIndexForward,
  });
}

async function queryByGsi1(gsi1pk, scanIndexForward = false) {
  return queryAll({
    TableName: TABLE_NAME,
    IndexName: "GSI1",
    KeyConditionExpression: "gsi1pk = :gsi1pk",
    ExpressionAttributeValues: {
      ":gsi1pk": gsi1pk,
    },
    ScanIndexForward: scanIndexForward,
  });
}

async function queryByGsi2(gsi2pk, scanIndexForward = false) {
  return queryAll({
    TableName: TABLE_NAME,
    IndexName: "GSI2",
    KeyConditionExpression: "gsi2pk = :gsi2pk",
    ExpressionAttributeValues: {
      ":gsi2pk": gsi2pk,
    },
    ScanIndexForward: scanIndexForward,
  });
}

async function batchDelete(keys) {
  if (keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 25) {
    const batch = keys.slice(i, i + 25).map((Key) => ({ DeleteRequest: { Key } }));
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch,
        },
      })
    );
  }
}

function toProfile(item = {}) {
  return {
    id: item.userId,
    username: item.username || null,
    bio: item.bio || "",
    website: item.website || "",
    avatar_url: item.avatar_url || "",
    absolute_avatar_url: item.absolute_avatar_url || "",
    instagram_url: item.instagram_url || "",
    twitter_url: item.twitter_url || "",
    spotify_url: item.spotify_url || "",
    soundcloud_url: item.soundcloud_url || "",
    updated_at: item.updatedAt || item.createdAt || null,
    roles: item.roles || ["user"],
  };
}

function toSong(item = {}) {
  return {
    id: item.songId,
    created_at: item.createdAt,
    genre: item.genre || "",
    description: item.description || "",
    needs: item.needs || "",
    open: item.open ?? true,
    finished_song: item.finished_song || "",
    artist: item.artist || "",
    artist_id: item.artist_id,
    song_url: item.song_url || "",
    absolute_song_url: item.absolute_song_url || "",
    absolute_avatar_url: item.absolute_avatar_url || "",
    instagram_url: item.instagram_url || "",
    twitter_url: item.twitter_url || "",
    spotify_url: item.spotify_url || "",
    soundcloud_url: item.soundcloud_url || "",
  };
}

function toComment(item = {}) {
  return {
    id: item.commentId,
    created_at: item.createdAt,
    user: item.user,
    comment: item.comment,
    song_id: item.song_id,
    commentPosition: item.commentPosition,
    avatarURl: item.avatarURl || "",
  };
}

function toChannel(item = {}) {
  return {
    id: item.channelId,
    inserted_at: item.createdAt,
    slug: item.slug,
    created_by: item.created_by,
    message_to: item.message_to,
    created_by_username: item.created_by_username,
  };
}

function toMessage(item = {}) {
  return {
    id: item.messageId,
    inserted_at: item.inserted_at,
    message: item.message,
    channel_id: item.channel_id,
    user_id: item.user_id,
    username: item.username,
    absolute_avatar_url: item.absolute_avatar_url,
  };
}

function sanitizeFileName(fileName = "") {
  const safe = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return safe || `file-${Date.now()}`;
}

function hasRole(profile, allowedRoles) {
  const roles = profile?.roles || ["user"];
  return roles.some((role) => allowedRoles.includes(role));
}

async function ensureProfile(userId, email = "") {
  const existing = await getItem(`USER#${userId}`, "PROFILE");
  if (existing) {
    return existing;
  }

  const createdAt = new Date().toISOString();
  const newProfile = {
    pk: `USER#${userId}`,
    sk: "PROFILE",
    entityType: "PROFILE",
    userId,
    email,
    username: email ? email.split("@")[0] : "",
    roles: ["user"],
    bio: "",
    website: "",
    avatar_url: "",
    absolute_avatar_url: "",
    instagram_url: "",
    twitter_url: "",
    spotify_url: "",
    soundcloud_url: "",
    createdAt,
    updatedAt: createdAt,
    gsi1pk: "PROFILE",
    gsi1sk: `${(email || userId).toLowerCase()}#${userId}`,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: newProfile,
    })
  );

  return newProfile;
}

async function getProfileByUserId(userId, email = "") {
  return ensureProfile(userId, email);
}

async function getRoles(userId) {
  const profile = await getItem(`USER#${userId}`, "PROFILE");
  return profile?.roles || ["user"];
}

async function getChannelMeta(channelId) {
  return getItem(`CHANNEL#${channelId}`, "META");
}

async function userCanAccessChannel(userId, channel) {
  if (!channel) return false;
  if (channel.created_by === userId || channel.message_to === userId) {
    return true;
  }
  const roles = await getRoles(userId);
  return roles.includes("admin") || roles.includes("moderator");
}

async function postToChannelSubscribers(channelId, payload) {
  if (!wsClient) {
    return;
  }

  const subscribers = await queryStartsWith(`CHANNEL#${channelId}`, "CONN#");
  await Promise.all(
    subscribers.map(async (sub) => {
      try {
        await wsClient.send(
          new PostToConnectionCommand({
            ConnectionId: sub.connectionId,
            Data: Buffer.from(JSON.stringify(payload)),
          })
        );
      } catch (err) {
        if (err?.$metadata?.httpStatusCode === 410) {
          await ddb.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: {
                pk: `CHANNEL#${channelId}`,
                sk: `CONN#${sub.connectionId}`,
              },
            })
          );
        }
      }
    })
  );
}

async function updateMembershipSortKey(channel, insertedAt) {
  const memberships = [channel.created_by, channel.message_to].map((memberId) => ({
    pk: `USER#${memberId}`,
    sk: `CHANNEL#${channel.channelId}`,
    entityType: "CHANNEL_MEMBER",
    channelId: channel.channelId,
    updatedAt: insertedAt,
    createdAt: channel.createdAt,
  }));

  await Promise.all(
    memberships.map((item) =>
      ddb.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      )
    )
  );
}

async function listProfiles() {
  const items = await queryByGsi1("PROFILE", true);
  return items.map(toProfile);
}

async function listSongs() {
  const items = await queryByGsi1("SONG_FEED", false);
  return items.map(toSong);
}

async function listChannelsForUser(userId) {
  const membershipItems = await queryStartsWith(`USER#${userId}`, "CHANNEL#");
  if (membershipItems.length === 0) {
    return [];
  }

  const keys = membershipItems.map((item) => ({
    pk: `CHANNEL#${item.channelId}`,
    sk: "META",
  }));

  const out = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: keys,
        },
      },
    })
  );

  const channels = (out.Responses?.[TABLE_NAME] || []).map(toChannel);
  channels.sort((a, b) => {
    const aMem = membershipItems.find((m) => m.channelId === a.id);
    const bMem = membershipItems.find((m) => m.channelId === b.id);
    return (bMem?.updatedAt || "").localeCompare(aMem?.updatedAt || "");
  });
  return channels;
}

async function listMessages(channelId) {
  const items = await queryStartsWith(`CHANNEL#${channelId}`, "MSG#", {
    scanIndexForward: true,
  });
  return items.map(toMessage);
}

async function listSongComments(songId) {
  const items = await queryStartsWith(`SONG#${songId}`, "COMMENT#", {
    scanIndexForward: true,
  });
  return items.map(toComment);
}

async function listComments() {
  const items = await queryByGsi1("COMMENTS_FEED", true);
  return items.map(toComment);
}

async function listSongCollaborators(songId) {
  const items = await queryStartsWith(`SONG#${songId}`, "COLLAB#", {
    scanIndexForward: true,
  });
  return items.map((item) => ({
    id: item.id,
    song_id: item.song_id,
    user: item.user,
    username: item.username,
    absolute_avatar_url: item.absolute_avatar_url,
    added_at: item.added_at,
  }));
}

async function upsertProfile(user, body) {
  const existing = await ensureProfile(user.userId, user.email);

  const merged = {
    ...existing,
    username: body.username ?? existing.username,
    bio: body.bio ?? existing.bio,
    website: body.website ?? existing.website,
    avatar_url: body.avatar_url ?? existing.avatar_url,
    absolute_avatar_url: body.absolute_avatar_url ?? existing.absolute_avatar_url,
    instagram_url: body.instagram_url ?? existing.instagram_url,
    twitter_url: body.twitter_url ?? existing.twitter_url,
    spotify_url: body.spotify_url ?? existing.spotify_url,
    soundcloud_url: body.soundcloud_url ?? existing.soundcloud_url,
    updatedAt: new Date().toISOString(),
  };

  merged.gsi1pk = "PROFILE";
  merged.gsi1sk = `${(merged.username || merged.userId).toLowerCase()}#${merged.userId}`;

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: merged,
    })
  );

  // Propagate denormalized username/avatar updates.
  const related = await queryByGsi2(`USER#${user.userId}`, false);
  await Promise.all(
    related.map(async (item) => {
      if (item.entityType === "SONG") {
        item.artist = merged.username;
        item.absolute_avatar_url = merged.absolute_avatar_url;
      }
      if (item.entityType === "COMMENT") {
        item.avatarURl = merged.absolute_avatar_url;
      }
      if (item.entityType === "COLLAB_REQUEST") {
        item.username = merged.username;
        item.absolute_avatar_url = merged.absolute_avatar_url;
      }
      if (item.entityType === "MESSAGE") {
        item.username = merged.username;
        item.absolute_avatar_url = merged.absolute_avatar_url;
      }

      if (
        item.entityType === "SONG" ||
        item.entityType === "COMMENT" ||
        item.entityType === "COLLAB_REQUEST" ||
        item.entityType === "MESSAGE"
      ) {
        await ddb.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: item,
          })
        );
      }
    })
  );

  return toProfile(merged);
}

async function createSong(user, body) {
  const profile = await ensureProfile(user.userId, user.email);
  const createdAt = new Date().toISOString();
  const songId = randomUUID();

  const item = {
    pk: `SONG#${songId}`,
    sk: "METADATA",
    entityType: "SONG",
    songId,
    createdAt,
    genre: body.genre || "",
    description: body.description || "",
    needs: body.needs || "",
    open: body.open ?? true,
    finished_song: body.finished_song || "",
    artist: body.artist || profile.username || user.email || "",
    artist_id: user.userId,
    song_url: body.song_url || "",
    absolute_song_url: body.absolute_song_url || "",
    absolute_avatar_url: body.absolute_avatar_url || profile.absolute_avatar_url || "",
    instagram_url: body.instagram_url || profile.instagram_url || "",
    twitter_url: body.twitter_url || profile.twitter_url || "",
    spotify_url: body.spotify_url || profile.spotify_url || "",
    soundcloud_url: body.soundcloud_url || profile.soundcloud_url || "",
    gsi1pk: "SONG_FEED",
    gsi1sk: createdAt,
    gsi2pk: `USER#${user.userId}`,
    gsi2sk: `SONG#${createdAt}#${songId}`,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return toSong(item);
}

async function updateSong(event, user, songId, body) {
  const existing = await getItem(`SONG#${songId}`, "METADATA");
  if (!existing) {
    return response(event, 404, { message: "Song not found" });
  }

  const profile = await getProfileByUserId(user.userId, user.email);
  const canEdit =
    existing.artist_id === user.userId || hasRole(profile, ["admin", "moderator"]);

  if (!canEdit) {
    return response(event, 403, { message: "Forbidden" });
  }

  const merged = {
    ...existing,
    genre: body.genre ?? existing.genre,
    description: body.description ?? existing.description,
    needs: body.needs ?? existing.needs,
    open: body.open ?? existing.open,
    finished_song: body.finished_song ?? existing.finished_song,
    song_url: body.song_url ?? existing.song_url,
    absolute_song_url: body.absolute_song_url ?? existing.absolute_song_url,
    absolute_avatar_url: body.absolute_avatar_url ?? existing.absolute_avatar_url,
    artist: body.artist ?? existing.artist,
    updatedAt: new Date().toISOString(),
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: merged,
    })
  );

  return response(event, 200, toSong(merged));
}

async function deleteSong(event, user, songId) {
  const existing = await getItem(`SONG#${songId}`, "METADATA");
  if (!existing) {
    return response(event, 204, { ok: true });
  }

  const profile = await getProfileByUserId(user.userId, user.email);
  const canDelete =
    existing.artist_id === user.userId || hasRole(profile, ["admin", "moderator"]);

  if (!canDelete) {
    return response(event, 403, { message: "Forbidden" });
  }

  const children = await queryAll({
    TableName: TABLE_NAME,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": `SONG#${songId}`,
    },
  });

  await batchDelete(children.map((item) => ({ pk: item.pk, sk: item.sk })));
  return response(event, 204, { ok: true });
}

async function createComment(user, songId, body) {
  const profile = await ensureProfile(user.userId, user.email);
  const createdAt = new Date().toISOString();
  const commentId = randomUUID();

  const item = {
    pk: `SONG#${songId}`,
    sk: `COMMENT#${createdAt}#${commentId}`,
    entityType: "COMMENT",
    commentId,
    createdAt,
    user: user.userId,
    comment: body.comment || "",
    song_id: songId,
    commentPosition: body.commentPosition ?? 0,
    avatarURl: body.avatarURl || profile.absolute_avatar_url || "",
    gsi1pk: "COMMENTS_FEED",
    gsi1sk: createdAt,
    gsi2pk: `USER#${user.userId}`,
    gsi2sk: `COMMENT#${createdAt}#${commentId}`,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return toComment(item);
}

async function deleteComment(event, user, songId, commentId) {
  const comments = await queryStartsWith(`SONG#${songId}`, "COMMENT#", {
    scanIndexForward: true,
  });

  const target = comments.find((item) => item.commentId === commentId);
  if (!target) {
    return response(event, 204, { ok: true });
  }

  const profile = await getProfileByUserId(user.userId, user.email);
  const canDelete =
    target.user === user.userId || hasRole(profile, ["admin", "moderator"]);

  if (!canDelete) {
    return response(event, 403, { message: "Forbidden" });
  }

  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: target.pk, sk: target.sk },
    })
  );

  return response(event, 204, { ok: true });
}

async function addCollaborator(user, songId) {
  const profile = await ensureProfile(user.userId, user.email);

  const item = {
    pk: `SONG#${songId}`,
    sk: `COLLAB#${user.userId}`,
    entityType: "COLLAB_REQUEST",
    id: randomUUID(),
    song_id: songId,
    user: user.userId,
    username: profile.username || user.email || "",
    absolute_avatar_url: profile.absolute_avatar_url || "",
    added_at: new Date().toISOString(),
    gsi2pk: `USER#${user.userId}`,
    gsi2sk: `COLLAB#${songId}`,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return item;
}

async function removeCollaborator(event, user, songId, collaboratorId) {
  const requesterProfile = await getProfileByUserId(user.userId, user.email);
  const song = await getItem(`SONG#${songId}`, "METADATA");

  const canRemove =
    collaboratorId === user.userId ||
    song?.artist_id === user.userId ||
    hasRole(requesterProfile, ["admin", "moderator"]);

  if (!canRemove) {
    return response(event, 403, { message: "Forbidden" });
  }

  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `SONG#${songId}`,
        sk: `COLLAB#${collaboratorId}`,
      },
    })
  );

  return response(event, 204, { ok: true });
}

async function createChannel(event, user, body) {
  const createdBy = user.userId;
  const messageTo = body.message_to;

  if (!messageTo || createdBy === messageTo) {
    return response(event, 400, { message: "message_to must be another user id" });
  }

  const pairKey = [createdBy, messageTo].sort().join("#");
  const existingPair = await getItem(`PAIR#${pairKey}`, "CHANNEL");
  if (existingPair?.channelId) {
    const existingChannel = await getChannelMeta(existingPair.channelId);
    return response(event, 200, toChannel(existingChannel));
  }

  const channelId = randomUUID();
  const createdAt = new Date().toISOString();

  const channel = {
    pk: `CHANNEL#${channelId}`,
    sk: "META",
    entityType: "CHANNEL",
    channelId,
    createdAt,
    created_by: createdBy,
    message_to: messageTo,
    slug: body.slug || "",
    created_by_username: body.created_by_username || "",
    pairKey,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: channel,
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                pk: `PAIR#${pairKey}`,
                sk: "CHANNEL",
                entityType: "CHANNEL_PAIR",
                channelId,
                createdAt,
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                pk: `USER#${createdBy}`,
                sk: `CHANNEL#${channelId}`,
                entityType: "CHANNEL_MEMBER",
                channelId,
                updatedAt: createdAt,
                createdAt,
              },
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                pk: `USER#${messageTo}`,
                sk: `CHANNEL#${channelId}`,
                entityType: "CHANNEL_MEMBER",
                channelId,
                updatedAt: createdAt,
                createdAt,
              },
            },
          },
        ],
      })
    );
  } catch (_err) {
    const racePair = await getItem(`PAIR#${pairKey}`, "CHANNEL");
    if (racePair?.channelId) {
      const raceChannel = await getChannelMeta(racePair.channelId);
      return response(event, 200, toChannel(raceChannel));
    }
    throw _err;
  }

  await postToChannelSubscribers(channelId, {
    type: "channel.created",
    channel: toChannel(channel),
  });

  return response(event, 201, toChannel(channel));
}

async function deleteChannel(event, user, channelId) {
  const channel = await getChannelMeta(channelId);
  if (!channel) {
    return response(event, 204, { ok: true });
  }

  const canDelete = await userCanAccessChannel(user.userId, channel);
  if (!canDelete) {
    return response(event, 403, { message: "Forbidden" });
  }

  const allChannelItems = await queryAll({
    TableName: TABLE_NAME,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": `CHANNEL#${channelId}`,
    },
  });

  const deleteKeys = allChannelItems.map((item) => ({ pk: item.pk, sk: item.sk }));
  deleteKeys.push(
    { pk: `PAIR#${channel.pairKey}`, sk: "CHANNEL" },
    { pk: `USER#${channel.created_by}`, sk: `CHANNEL#${channelId}` },
    { pk: `USER#${channel.message_to}`, sk: `CHANNEL#${channelId}` }
  );

  await batchDelete(deleteKeys);
  return response(event, 204, { ok: true });
}

async function createMessage(event, user, channelId, body) {
  const channel = await getChannelMeta(channelId);
  if (!channel) {
    return response(event, 404, { message: "Channel not found" });
  }

  const canAccess = await userCanAccessChannel(user.userId, channel);
  if (!canAccess) {
    return response(event, 403, { message: "Forbidden" });
  }

  const profile = await ensureProfile(user.userId, user.email);
  const insertedAt = new Date().toISOString();
  const messageId = randomUUID();

  const item = {
    pk: `CHANNEL#${channelId}`,
    sk: `MSG#${insertedAt}#${messageId}`,
    entityType: "MESSAGE",
    messageId,
    inserted_at: insertedAt,
    message: body.message || "",
    channel_id: channelId,
    user_id: user.userId,
    username: body.username || profile.username || user.email || "",
    absolute_avatar_url:
      body.absolute_avatar_url || profile.absolute_avatar_url || "",
    gsi2pk: `USER#${user.userId}`,
    gsi2sk: `MESSAGE#${insertedAt}#${messageId}`,
  };

  await ddb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  await updateMembershipSortKey(channel, insertedAt);

  const payload = {
    type: "message.created",
    channelId,
    message: toMessage(item),
  };
  await postToChannelSubscribers(channelId, payload);

  return response(event, 201, toMessage(item));
}

async function deleteMessage(event, user, channelId, messageId) {
  const channel = await getChannelMeta(channelId);
  if (!channel) {
    return response(event, 204, { ok: true });
  }

  const messages = await queryStartsWith(`CHANNEL#${channelId}`, "MSG#", {
    scanIndexForward: true,
  });
  const target = messages.find((item) => item.messageId === messageId);
  if (!target) {
    return response(event, 204, { ok: true });
  }

  const profile = await getProfileByUserId(user.userId, user.email);
  const canDelete =
    target.user_id === user.userId || hasRole(profile, ["admin", "moderator"]);

  if (!canDelete) {
    return response(event, 403, { message: "Forbidden" });
  }

  await ddb.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { pk: target.pk, sk: target.sk },
    })
  );

  await postToChannelSubscribers(channelId, {
    type: "message.deleted",
    channelId,
    messageId,
  });

  return response(event, 204, { ok: true });
}

async function createUploadUrl(body) {
  const kind = body.kind === "avatars" ? "avatars" : "songs";
  const safeName = sanitizeFileName(body.fileName || randomUUID());
  const key = `${kind}/${Date.now()}-${safeName}`;
  const contentType = body.contentType || "application/octet-stream";

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
  const publicUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(
    key
  ).replace(/%2F/g, "/")}`;

  return {
    uploadUrl,
    key,
    publicUrl,
  };
}

function splitPath(path) {
  return path.split("/").filter(Boolean);
}

function isPublicReadRoute(method, rawPath, segments) {
  if (method !== "GET") {
    return false;
  }

  if (rawPath === "/" || rawPath === "/songs" || rawPath === "/comments" || rawPath === "/profiles") {
    return true;
  }

  if (segments[0] === "profiles" && segments.length === 2) {
    return true;
  }

  if (
    segments[0] === "songs" &&
    segments[1] &&
    segments[2] === "comments" &&
    segments.length === 3
  ) {
    return true;
  }

  if (
    segments[0] === "songs" &&
    segments[1] &&
    segments[2] === "collaborators" &&
    segments.length === 3
  ) {
    return true;
  }

  return false;
}

exports.handler = async (event) => {
  try {
    const method = event.requestContext?.http?.method;
    const rawPath = event.rawPath || "/";
    const body = parseBody(event);
    const segments = splitPath(rawPath);
    if (method === "OPTIONS") {
      return {
        statusCode: 204,
        headers: buildCorsHeaders(event),
        body: "",
      };
    }

    const user = currentUser(event);
    const isPublicRoute = isPublicReadRoute(method, rawPath, segments);

    if (!isPublicRoute && !user.userId) {
      return response(event, 401, { message: "Unauthorized" });
    }

    if (method === "GET" && rawPath === "/") {
      return response(event, 200, { ok: true });
    }

    if (method === "GET" && rawPath === "/me/roles") {
      const roles = await getRoles(user.userId);
      return response(event, 200, roles.map((role) => ({ role })));
    }

    if (method === "GET" && rawPath === "/profiles") {
      const profiles = await listProfiles();
      return response(event, 200, profiles);
    }

    if (method === "PUT" && rawPath === "/profiles") {
      const profile = await upsertProfile(user, body);
      return response(event, 200, profile);
    }

    if (method === "GET" && segments[0] === "profiles" && segments[1]) {
      const profile = await getItem(`USER#${segments[1]}`, "PROFILE");
      return response(event, 200, profile ? toProfile(profile) : null);
    }

    if (method === "GET" && rawPath === "/songs") {
      const songs = await listSongs();
      return response(event, 200, songs);
    }

    if (method === "GET" && rawPath === "/comments") {
      const comments = await listComments();
      return response(event, 200, comments);
    }

    if (method === "POST" && rawPath === "/songs") {
      const song = await createSong(user, body);
      return response(event, 201, song);
    }

    if (segments[0] === "songs" && segments[1] && segments.length === 2) {
      if (method === "PUT") {
        return await updateSong(event, user, segments[1], body);
      }
      if (method === "DELETE") {
        return await deleteSong(event, user, segments[1]);
      }
    }

    if (
      segments[0] === "songs" &&
      segments[1] &&
      segments[2] === "comments" &&
      segments.length === 3 &&
      method === "GET"
    ) {
      const comments = await listSongComments(segments[1]);
      return response(event, 200, comments);
    }

    if (
      segments[0] === "songs" &&
      segments[1] &&
      segments[2] === "comments" &&
      segments.length === 3 &&
      method === "POST"
    ) {
      const comment = await createComment(user, segments[1], body);
      return response(event, 201, comment);
    }

    if (
      segments[0] === "songs" &&
      segments[1] &&
      segments[2] === "comments" &&
      segments[3] &&
      method === "DELETE"
    ) {
      return await deleteComment(event, user, segments[1], segments[3]);
    }

    if (
      segments[0] === "songs" &&
      segments[1] &&
      segments[2] === "collaborators" &&
      segments.length === 3 &&
      method === "GET"
    ) {
      const collaborators = await listSongCollaborators(segments[1]);
      return response(event, 200, collaborators);
    }

    if (
      segments[0] === "songs" &&
      segments[1] &&
      segments[2] === "collaborators" &&
      segments.length === 3 &&
      method === "POST"
    ) {
      const collaborator = await addCollaborator(user, segments[1]);
      return response(event, 201, collaborator);
    }

    if (
      segments[0] === "songs" &&
      segments[1] &&
      segments[2] === "collaborators" &&
      segments[3] &&
      method === "DELETE"
    ) {
      return await removeCollaborator(event, user, segments[1], segments[3]);
    }

    if (method === "GET" && rawPath === "/channels") {
      const channels = await listChannelsForUser(user.userId);
      return response(event, 200, channels);
    }

    if (method === "POST" && rawPath === "/channels") {
      return await createChannel(event, user, body);
    }

    if (segments[0] === "channels" && segments[1] && segments.length === 2) {
      if (method === "DELETE") {
        return await deleteChannel(event, user, segments[1]);
      }
    }

    if (
      segments[0] === "channels" &&
      segments[1] &&
      segments[2] === "messages" &&
      segments.length === 3 &&
      method === "GET"
    ) {
      const channel = await getChannelMeta(segments[1]);
      const canAccess = await userCanAccessChannel(user.userId, channel);
      if (!canAccess) {
        return response(event, 403, { message: "Forbidden" });
      }
      const messages = await listMessages(segments[1]);
      return response(event, 200, messages);
    }

    if (
      segments[0] === "channels" &&
      segments[1] &&
      segments[2] === "messages" &&
      segments.length === 3 &&
      method === "POST"
    ) {
      return await createMessage(event, user, segments[1], body);
    }

    if (
      segments[0] === "channels" &&
      segments[1] &&
      segments[2] === "messages" &&
      segments[3] &&
      method === "DELETE"
    ) {
      return await deleteMessage(event, user, segments[1], segments[3]);
    }

    if (method === "POST" && rawPath === "/media/upload-url") {
      const signed = await createUploadUrl(body);
      return response(event, 200, signed);
    }

    return response(event, 404, { message: `No route for ${method} ${rawPath}` });
  } catch (err) {
    console.error(err);
    return response(event, 500, {
      message: "Unexpected server error",
      detail: err.message,
    });
  }
};
