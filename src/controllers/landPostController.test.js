const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const LandPost = require("../models/landPost.js");
const landPostController = require("./landPostController.js");
const originalSetInterval = global.setInterval;
global.setInterval = (...args) => originalSetInterval(...args).unref();
const landPostRoutes = require("../routes/landPostRoutes.js");
global.setInterval = originalSetInterval;

const POST_ID = "64b000000000000000000001";
const OWNER_ID = "64b000000000000000000002";
const ADMIN_ID = "64b000000000000000000003";

const internalFields = {
  agreedToTerms: true,
  agreedToPrivacy: true,
  reviewLogs: [
    {
      action: "verification_updated",
      operator: { userId: ADMIN_ID, username: "internal-reviewer" },
      before: {
        landNumberVerified: false,
        authorizationLetterVerified: false,
      },
      after: {
        landNumberVerified: true,
        authorizationLetterVerified: false,
      },
      createdAt: new Date("2026-08-11T00:00:00.000Z"),
    },
  ],
};

const publicPostData = (overrides = {}) => ({
  _id: POST_ID,
  userId: { _id: OWNER_ID, username: "owner", email: "owner@example.com" },
  type: "sell",
  contactName: "王小明",
  contactPhone: "0912345678",
  contactLine: "private-line-id",
  city: "臺北市",
  district: "中正區",
  description: "公開案件",
  landNumberVerified: true,
  authorizationLetterVerified: false,
  status: "approved",
  visibility: "platform_public",
  env: "prod",
  privateFutureField: "must-not-leak",
  ...internalFields,
  ...overrides,
});

const selectProjection = (data, projection) => {
  if (typeof projection !== "string") return { ...data };
  const selected = { _id: data._id };
  for (const key of projection.split(/\s+/).filter(Boolean)) {
    if (Object.hasOwn(data, key)) selected[key] = data[key];
  }
  return selected;
};

const documentFrom = (data) => ({
  ...data,
  toObject() {
    const { toObject, ...plain } = this;
    return { ...plain };
  },
});

const queryReturning = (value) => {
  const query = {
    sort: () => query,
    skip: () => query,
    limit: () => query,
    populate: () => query,
    lean: async () => value,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return query;
};

const createResponse = () => {
  const state = { statusCode: 200, body: null, headers: {} };
  const res = {
    req: {},
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(body) {
      state.body = JSON.parse(JSON.stringify(body));
      return this;
    },
    set(name, value) {
      state.headers[name] = value;
      return this;
    },
  };
  return { res, state };
};

const replaceMethod = (t, object, name, replacement) => {
  const original = object[name];
  object[name] = replacement;
  t.after(() => {
    object[name] = original;
  });
};

const startApi = async () => {
  const app = express();
  app.use(express.json());
  app.use("/land-post", landPostRoutes);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
};

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.closeAllConnections();
    server.close((error) => (error ? reject(error) : resolve()));
  });

const assertNoInternalFields = (post) => {
  assert.equal(post.reviewLogs, undefined);
  assert.equal(post.agreedToTerms, undefined);
  assert.equal(post.agreedToPrivacy, undefined);
  assert.equal(post.privateFutureField, undefined);
};

test("匿名與非擁有者 GET /land-post/:id 僅回傳公開白名單欄位", async (t) => {
  const originalAuthKey = process.env.AUTH_KEY;
  process.env.AUTH_KEY = "land-post-member-test-key";
  t.after(() => {
    if (originalAuthKey === undefined) delete process.env.AUTH_KEY;
    else process.env.AUTH_KEY = originalAuthKey;
  });
  replaceMethod(t, LandPost, "findById", () => ({
    populate: async () => documentFrom(publicPostData()),
  }));
  const { server, baseUrl } = await startApi();
  t.after(() => closeServer(server));
  const nonOwnerToken = jwt.sign(
    { userId: "64b000000000000000000004", username: "other-member" },
    process.env.AUTH_KEY,
  );

  for (const headers of [
    undefined,
    { authorization: `Bearer ${nonOwnerToken}` },
  ]) {
    const response = await fetch(`${baseUrl}/land-post/${POST_ID}`, { headers });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.landNumberVerified, true);
    assert.equal(body.data.authorizationLetterVerified, false);
    assert.equal(body.data.contactPhone, undefined);
    assert.equal(body.data.contactLine, undefined);
    assert.equal(body.data.memberEmail, undefined);
    assertNoInternalFields(body.data);
  }
});

test("公開 list 與 slug 查詢使用公開 projection 且不含內部欄位", async (t) => {
  const projections = [];
  replaceMethod(t, LandPost, "find", (_filter, projection) => {
    projections.push(projection);
    return queryReturning([selectProjection(publicPostData(), projection)]);
  });
  replaceMethod(t, LandPost, "findOne", (_filter, projection) => {
    projections.push(projection);
    return {
      populate: async () =>
        documentFrom(selectProjection(publicPostData(), projection)),
    };
  });
  replaceMethod(t, LandPost, "countDocuments", async () => 1);

  const listResponse = createResponse();
  await landPostController.getPublicLandPosts(
    { query: {}, params: {} },
    listResponse.res,
  );
  const slugResponse = createResponse();
  await landPostController.getPublicLandPostBySlug(
    { query: {}, params: { slug: "public-post" } },
    slugResponse.res,
  );

  assert.equal(listResponse.state.statusCode, 200);
  assert.equal(slugResponse.state.statusCode, 200);
  assertNoInternalFields(listResponse.state.body.data[0]);
  assertNoInternalFields(slugResponse.state.body.data);
  for (const projection of projections) {
    assert.match(projection, /landNumberVerified/);
    assert.match(projection, /authorizationLetterVerified/);
    assert.doesNotMatch(projection, /reviewLogs|agreedToTerms|agreedToPrivacy/);
  }
});

test("會員的我的投稿列表與單筆擁有者回應不含稽核及隱私同意欄位", async (t) => {
  const rawPost = publicPostData({ status: "pending" });
  replaceMethod(t, LandPost, "find", (_filter, projection) =>
    queryReturning([selectProjection(rawPost, projection)]),
  );
  replaceMethod(t, LandPost, "countDocuments", async () => 1);
  replaceMethod(t, LandPost, "findById", (_id, projection) => ({
    populate: async () => documentFrom(selectProjection(rawPost, projection)),
  }));

  const listResponse = createResponse();
  await landPostController.getMyLandPosts(
    { userData: { userId: OWNER_ID }, query: {} },
    listResponse.res,
  );
  const detailResponse = createResponse();
  await landPostController.getLandPost(
    {
      params: { id: POST_ID },
      query: {},
      userData: { userId: OWNER_ID },
    },
    detailResponse.res,
  );

  assert.equal(listResponse.state.statusCode, 200);
  assert.equal(detailResponse.state.statusCode, 200);
  assertNoInternalFields(listResponse.state.body.data[0]);
  assertNoInternalFields(detailResponse.state.body.data);
  assert.equal(detailResponse.state.body.data.contactPhone, "0912345678");
  assert.equal(detailResponse.state.body.data.contactLine, "private-line-id");
  assert.equal(detailResponse.state.body.data.memberEmail, "owner@example.com");
  assert.equal(listResponse.state.body.data[0].memberEmail, undefined);
});

test("verification 管理端 API 在無認證時拒絕請求且不查詢資料", async (t) => {
  let findByIdCalls = 0;
  replaceMethod(t, LandPost, "findById", () => {
    findByIdCalls += 1;
    throw new Error("未授權請求不應進入 controller");
  });
  const { server, baseUrl } = await startApi();
  t.after(() => closeServer(server));

  const response = await fetch(
    `${baseUrl}/land-post/admin/${POST_ID}/verification`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        landNumberVerified: true,
        authorizationLetterVerified: false,
      }),
    },
  );

  assert.equal(response.status, 401);
  assert.equal(findByIdCalls, 0);
});

test("已認證管理員的非法 ObjectId 在 controller 邊界回傳 404", async (t) => {
  const originalAdminKey = process.env.ADMIN_KEY;
  process.env.ADMIN_KEY = "land-post-controller-test-key";
  t.after(() => {
    if (originalAdminKey === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = originalAdminKey;
  });
  let findByIdCalls = 0;
  replaceMethod(t, LandPost, "findById", () => {
    findByIdCalls += 1;
    throw new Error("非法 ObjectId 不應查詢資料庫");
  });
  const { server, baseUrl } = await startApi();
  t.after(() => closeServer(server));
  const token = jwt.sign(
    { userId: ADMIN_ID, username: "reviewer" },
    process.env.ADMIN_KEY,
  );

  const response = await fetch(
    `${baseUrl}/land-post/admin/not-an-object-id/verification`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        landNumberVerified: true,
        authorizationLetterVerified: false,
      }),
    },
  );

  assert.equal(response.status, 404);
  assert.equal(findByIdCalls, 0);
});

const hydratedAdminPost = (overrides = {}) => {
  const post = LandPost.hydrate({
    _id: POST_ID,
    userId: OWNER_ID,
    status: "approved",
    landNumberVerified: false,
    authorizationLetterVerified: false,
    ...overrides,
  });
  let saveCalls = 0;
  post.save = async () => {
    saveCalls += 1;
    return post;
  };
  return { post, saveCalls: () => saveCalls };
};

test("核准時未提供核實欄位會保存兩個 false 與完整 audit", async (t) => {
  const fixture = hydratedAdminPost({ status: "pending" });
  replaceMethod(t, LandPost, "findById", async () => fixture.post);
  const response = createResponse();

  await landPostController.adminApproveLandPost(
    {
      params: { id: POST_ID },
      body: {},
      userData: { userId: ADMIN_ID, username: "reviewer" },
    },
    response.res,
  );

  assert.equal(response.state.statusCode, 200);
  assert.equal(fixture.post.status, "approved");
  assert.equal(fixture.post.landNumberVerified, false);
  assert.equal(fixture.post.authorizationLetterVerified, false);
  assert.equal(fixture.saveCalls(), 1);
  assert.equal(fixture.post.reviewLogs.length, 1);
  assert.equal(fixture.post.reviewLogs[0].action, "approved");
  assert.equal(fixture.post.reviewLogs[0].operator.username, "reviewer");
});

test("非 approved 案件不得修改核實標章", async (t) => {
  const fixture = hydratedAdminPost({ status: "pending" });
  replaceMethod(t, LandPost, "findById", async () => fixture.post);
  const response = createResponse();

  await landPostController.adminUpdateLandPostVerification(
    {
      params: { id: POST_ID },
      body: {
        landNumberVerified: true,
        authorizationLetterVerified: true,
      },
      userData: { userId: ADMIN_ID, username: "reviewer" },
    },
    response.res,
  );

  assert.equal(response.state.statusCode, 400);
  assert.equal(fixture.saveCalls(), 0);
  assert.equal(fixture.post.reviewLogs, undefined);
});

test("核實 PATCH 必須提供完整兩個 Boolean", async (t) => {
  const fixture = hydratedAdminPost();
  replaceMethod(t, LandPost, "findById", async () => fixture.post);
  const response = createResponse();

  await landPostController.adminUpdateLandPostVerification(
    {
      params: { id: POST_ID },
      body: { landNumberVerified: true },
      userData: { userId: ADMIN_ID, username: "reviewer" },
    },
    response.res,
  );

  assert.equal(response.state.statusCode, 400);
  assert.equal(fixture.saveCalls(), 0);
  assert.equal(fixture.post.landNumberVerified, false);
});

test("核實狀態未變時不儲存也不新增 audit", async (t) => {
  const fixture = hydratedAdminPost({
    landNumberVerified: true,
    authorizationLetterVerified: false,
    reviewLogs: [internalFields.reviewLogs[0]],
  });
  fixture.post.populate = async () => fixture.post;
  replaceMethod(t, LandPost, "findById", async () => fixture.post);
  const response = createResponse();

  await landPostController.adminUpdateLandPostVerification(
    {
      params: { id: POST_ID },
      body: {
        landNumberVerified: true,
        authorizationLetterVerified: false,
      },
      userData: { userId: ADMIN_ID, username: "reviewer" },
    },
    response.res,
  );

  assert.equal(response.state.statusCode, 200);
  assert.equal(fixture.saveCalls(), 0);
  assert.equal(fixture.post.reviewLogs.length, 1);
});

test("核實更新與撤銷會保存 before/after/operator 並回傳 populated userId", async (t) => {
  const fixture = hydratedAdminPost({
    landNumberVerified: true,
    authorizationLetterVerified: false,
  });
  const member = {
    _id: OWNER_ID,
    name: "王小明",
    username: "owner",
    email: "owner@example.com",
    mobile: "0912345678",
  };
  let populateCalls = 0;
  const originalToObject = fixture.post.toObject.bind(fixture.post);
  fixture.post.populate = async (path, fields) => {
    populateCalls += 1;
    assert.equal(path, "userId");
    assert.equal(fields, "name username email mobile");
    fixture.post.toObject = () => ({ ...originalToObject(), userId: member });
    return fixture.post;
  };
  replaceMethod(t, LandPost, "findById", async () => fixture.post);
  const response = createResponse();

  await landPostController.adminUpdateLandPostVerification(
    {
      params: { id: POST_ID },
      body: {
        landNumberVerified: false,
        authorizationLetterVerified: true,
      },
      userData: { userId: ADMIN_ID, username: "reviewer" },
    },
    response.res,
  );

  assert.equal(response.state.statusCode, 200);
  assert.equal(fixture.saveCalls(), 1);
  assert.equal(fixture.post.reviewLogs.length, 1);
  const log = fixture.post.reviewLogs[0];
  assert.deepEqual(log.before.toObject(), {
    landNumberVerified: true,
    authorizationLetterVerified: false,
  });
  assert.deepEqual(log.after.toObject(), {
    landNumberVerified: false,
    authorizationLetterVerified: true,
  });
  assert.equal(log.operator.userId, ADMIN_ID);
  assert.equal(log.operator.username, "reviewer");
  assert.equal(populateCalls, 1);
  assert.equal(response.state.body.data.userId.email, "owner@example.com");
});
